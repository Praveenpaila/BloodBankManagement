const axios = require("axios");
const BloodRequest = require("../models/BloodRequest");
const UserModel = require("../models/user");
const Notification = require("../models/Notification");
const ChatConversation = require("../models/ChatConversation");
const { transporter } = require("./auth");
const { emitToUser } = require("../utils/realtime");
const { deferDonorAfterDonation } = require("../utils/eligibilityDeferral");
const { rankDonorsByShortestPath } = require("../utils/geoRouting");
const { bloodGroupFilterFor, compatibleDonorGroupsFor } = require("../utils/bloodCompatibility");

const parseCoordinates = (lat, lng) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedLng) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    parsedLng < -180 ||
    parsedLng > 180
  ) {
    return null;
  }

  return [parsedLng, parsedLat];
};

const getDistanceInfo = async (origin, destinations) => {
  if (!process.env.GOOGLE_MAPS_API_KEY || destinations.length === 0) {
    return destinations.map(() => ({ distance: "N/A", duration: "N/A" }));
  }

  try {
    const destinationParam = destinations
      .map((coords) => `${coords[1]},${coords[0]}`)
      .join("|");
    const { data } = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: `${origin[1]},${origin[0]}`,
          destinations: destinationParam,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    );

    return data.rows[0].elements.map((element) => ({
      distance: element.distance?.text || "N/A",
      duration: element.duration?.text || "N/A",
    }));
  } catch (err) {
    return destinations.map(() => ({ distance: "N/A", duration: "N/A" }));
  }
};

const findNearbyDonors = async (bloodGroup, coordinates, radiusKm, excludeIds = []) => {
  const radius = Math.max(Number(radiusKm) || 10, 1);
  const compatibleBloodGroups = compatibleDonorGroupsFor(bloodGroup);

  if (compatibleBloodGroups.length === 0) {
    return [];
  }

  return UserModel.find({
    role: "donor",
    bloodGroup: bloodGroupFilterFor(bloodGroup),
    isActive: true,
    isEligible: true,
    _id: { $nin: excludeIds },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates,
        },
        $maxDistance: radius * 1000,
      },
    },
  }).select("-password");
};

exports.createRequest = async (req, res) => {
  try {
    const { bloodGroup, unitsNeeded, urgency = "normal", lat, lng, radiusKm = 10, notes } =
      req.body;

    const requestedUnits = Number(unitsNeeded);
    const requestedRadius = Math.max(Number(radiusKm) || 10, 1);

    if (!bloodGroup || !Number.isFinite(requestedUnits) || requestedUnits < 1) {
      return res.status(400).json({
        success: false,
        message: "Provide blood group and valid units needed",
      });
    }

    const coordinates = parseCoordinates(lat, lng);

    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "Live request location is required",
      });
    }

    const donors = (await findNearbyDonors(bloodGroup, coordinates, requestedRadius, [req.user._id])).filter(
      (donor) => donor?._id && donor.location?.coordinates?.length >= 2,
    );

    const request = await BloodRequest.create({
      requestedBy: req.user._id,
      bloodGroup,
      unitsNeeded: requestedUnits,
      urgency,
      notes,
      location: { type: "Point", coordinates },
      radiusKm: requestedRadius,
      notifiedDonors: donors.map((donor) => donor._id),
    });

    const distances = await getDistanceInfo(
      coordinates,
      donors.map((donor) => donor.location.coordinates),
    );
    const rankedDonors = rankDonorsByShortestPath(coordinates, donors, distances);

    const notifications = await Notification.insertMany(
      rankedDonors.map(({ donor, routing }, index) => ({
        recipient: donor._id,
        type: "blood_request",
        title: `${urgency === "critical" ? "SOS: " : ""}${bloodGroup} blood needed`,
        message: `${req.user.firstName} needs ${requestedUnits} unit(s). Distance: ${routing.distance}`,
        data: {
          requestId: request._id,
          urgency,
          bloodGroup,
          compatibleBloodGroups: compatibleDonorGroupsFor(bloodGroup),
          distance: routing.distance,
          duration: routing.duration,
          distanceKm: routing.distanceKm,
          rank: index + 1,
          routingAlgorithm: routing.algorithm,
        },
      })),
    );

    notifications.forEach((notification) => {
      if (notification?.recipient) emitToUser(notification.recipient, "blood-request:new", notification);
    });

    for (const donor of donors) {
      if (donor.email && (process.env.EMAIL_USER || process.env.SMTP_USER)) {
        transporter
          .sendMail({
            from:
              process.env.SMTP_FROM ||
              `"BloodLink" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
            to: donor.email,
            subject: "BloodLink Emergency Alert",
            text: `${bloodGroup} blood is needed near you.`,
          })
          .catch(() => {});
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        request,
        notifiedDonors: donors.length,
        eligibleBloodGroups: compatibleDonorGroupsFor(bloodGroup),
        matchingAlgorithm: rankedDonors[0]?.routing.algorithm || "none",
      },
      message: "Blood request created",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error creating blood request",
    });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const filter = ["hospital", "donor"].includes(req.user.role)
      ? { requestedBy: req.user._id }
      : {};
    const requests = await BloodRequest.find(filter)
      .populate("requestedBy", "firstName lastName city location")
      .populate("respondingDonors.donor", "firstName lastName phoneNumber bloodGroup")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching requests",
    });
  }
};

exports.respondToRequest = async (req, res) => {
  try {
    const { action } = req.body;

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response action",
      });
    }

    const request = await BloodRequest.findById(req.params.id || req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Blood request not found",
      });
    }

    if (action === "accept") {
      const claimedRequest = await BloodRequest.findOneAndUpdate(
        {
          _id: request._id,
          $or: [
            { acceptedDonor: { $exists: false } },
            { acceptedDonor: null },
            { acceptedDonor: req.user._id },
          ],
        },
        { status: "responding", acceptedDonor: req.user._id },
        { new: true },
      );

      if (!claimedRequest) {
        return res.status(409).json({
          success: false,
          message: "Another donor has already accepted this request",
        });
      }

      request.status = "responding";
      request.acceptedDonor = req.user._id;
    }

    request.respondingDonors = request.respondingDonors.filter(
      (entry) => String(entry.donor) !== String(req.user._id),
    );
    request.respondingDonors.push({
      donor: req.user._id,
      action,
      respondedAt: new Date(),
    });

    await request.save();

    await Notification.findOneAndUpdate(
      {
        recipient: req.user._id,
        type: "blood_request",
        "data.requestId": request._id,
      },
      {
        $set: {
          isRead: true,
          "data.response": action,
          "data.respondedAt": new Date(),
        },
      },
    );

    const responseNotification = await Notification.create({
      recipient: request.requestedBy,
      type: "donor_response",
      title: `Donor ${action}ed request`,
      message: `${req.user.firstName} ${req.user.lastName} ${action}ed your blood request`,
      data: {
        requestId: request._id,
        donorId: req.user._id,
      },
    });

    emitToUser(request.requestedBy, "blood-request:response", responseNotification);

    let conversation = null;
    if (action === "accept") {
      conversation = await ChatConversation.findOneAndUpdate(
        { request: request._id },
        {
          request: request._id,
          hospital: request.requestedBy,
          donor: req.user._id,
          $setOnInsert: {
            messages: [
              {
                sender: req.user._id,
                message: "I can help with this blood request.",
                readBy: [req.user._id],
              },
            ],
          },
        },
        { new: true, upsert: true },
      );

      const otherDonors = request.notifiedDonors.filter(
        (donorId) => String(donorId) !== String(req.user._id),
      );

      if (otherDonors.length) {
        await Notification.updateMany(
          {
            recipient: { $in: otherDonors },
            type: "blood_request",
            "data.requestId": request._id,
          },
          {
            $set: {
              isRead: true,
              title: `${request.bloodGroup} request covered`,
              message: `${req.user.firstName} accepted this request. Thanks for being ready to help.`,
              "data.closed": true,
              "data.acceptedDonorId": req.user._id,
              "data.acceptedDonorName": `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
              "data.closedAt": new Date(),
            },
          },
        );

        otherDonors.forEach((donorId) => {
          emitToUser(donorId, "blood-request:closed", {
            requestId: request._id,
            acceptedDonorId: req.user._id,
            acceptedDonorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
            message: `${req.user.firstName} accepted this request.`,
          });
        });
      }

      emitToUser(req.user._id, "chat:ready", {
        requestId: request._id,
        conversationId: conversation._id,
      });
      emitToUser(request.requestedBy, "chat:ready", {
        requestId: request._id,
        conversationId: conversation._id,
      });
    }

    return res.status(200).json({
      success: true,
      data: { request, conversation },
      message: "Response saved",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error responding to request",
    });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["open", "responding", "fulfilled", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const update = { status };
    if (status === "fulfilled") {
      update.fulfilledAt = new Date();
    }

    const request = await BloodRequest.findOneAndUpdate(
      { _id: req.params.id, requestedBy: req.user._id },
      update,
      { new: true },
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Blood request not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: request,
      message: "Request status updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error updating request status",
    });
  }
};

exports.completeDonationForRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findOne({
      _id: req.params.id,
      requestedBy: req.user._id,
      acceptedDonor: { $exists: true, $ne: null },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Accepted blood request not found",
      });
    }

    request.status = "fulfilled";
    request.fulfilledAt = new Date();
    await request.save();

    const deferralUntil = await deferDonorAfterDonation(
      request.acceptedDonor,
      "SOS donation completed. Donor is deferred for 30 days.",
    );

    await Notification.create({
      recipient: request.acceptedDonor,
      type: "eligibility_deferred",
      title: "Donation completed",
      message: "Thank you for donating. You are not eligible for the next 30 days.",
      data: {
        requestId: request._id,
        deferralUntil,
      },
    });

    emitToUser(request.acceptedDonor, "eligibility:deferred", {
      requestId: request._id,
      deferralUntil,
    });

    return res.status(200).json({
      success: true,
      data: { request, deferralUntil },
      message: "Donation completed and donor deferred for 30 days",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error completing request donation",
    });
  }
};

exports.getNearbyRequests = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const coordinates = parseCoordinates(lat, lng);

    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "Provide valid lat and lng",
      });
    }

    const requests = await BloodRequest.find({
      status: { $in: ["open", "responding"] },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates,
          },
          $maxDistance: 50000,
        },
      },
    })
      .populate("requestedBy", "firstName lastName city")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching nearby requests",
    });
  }
};

exports.findNearbyDonors = findNearbyDonors;
