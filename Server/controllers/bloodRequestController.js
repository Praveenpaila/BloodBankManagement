const axios = require("axios");
const BloodRequest = require("../models/BloodRequest");
const UserModel = require("../models/user");
const Notification = require("../models/Notification");
const PushSubscription = require("../models/PushSubscription");
const ChatConversation = require("../models/ChatConversation");
const { transporter } = require("./auth");
const { emitToRequest, emitToUser } = require("../utils/realtime");
const { sendPushNotification } = require("../utils/webPush");
const { sendExpoPushToUsers } = require("../utils/expoPush");
const { recordCompletedDonation } = require("../utils/recordDonation");
const { rankDonorsByShortestPath } = require("../utils/geoRouting");
const { haversineKm, roundKm } = require("../utils/haversine");
const { bloodGroupFilterFor, compatibleDonorGroupsFor } = require("../utils/bloodCompatibility");

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

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getDisplayName = (user) =>
  user?.hospitalName ||
  `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
  "BloodLink user";

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

    const coordinates =
      lng !== undefined && lat !== undefined
        ? [Number(lng), Number(lat)]
        : req.user.location?.coordinates;

    if (
      !coordinates?.length ||
      coordinates.length < 2 ||
      !Number.isFinite(coordinates[0]) ||
      !Number.isFinite(coordinates[1])
    ) {
      return res.status(400).json({
        success: false,
        message: "Request location is required",
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
      rankedDonors.map(({ donor, routing }, index) => {
        const distanceKm = roundKm(haversineKm(coordinates, donor.location.coordinates));
        return {
        recipient: donor._id,
        type: "blood_request",
        title: `${urgency === "critical" ? "SOS: " : ""}${bloodGroup} blood needed`,
        message: `${req.user.firstName} needs ${requestedUnits} unit(s). Distance: ${distanceKm} km`,
        data: {
          requestId: request._id,
          urgency,
          bloodGroup,
          compatibleBloodGroups: compatibleDonorGroupsFor(bloodGroup),
          distance: routing.distance,
          duration: routing.duration,
          distanceKm,
          rank: index + 1,
          routingAlgorithm: routing.algorithm,
        },
        };
      }),
    );

    notifications.forEach((notification) => {
      if (notification?.recipient) emitToUser(notification.recipient, "blood-request:new", notification);
    });

    // ── Expo Push to all notified donors ──────────────────────────────────────
    const donorIdsForPush = rankedDonors.map(({ donor }) => donor._id);
    sendExpoPushToUsers(donorIdsForPush, {
      title: `🩸 ${urgency === "critical" ? "SOS: " : ""}${bloodGroup} blood needed`,
      body: `${req.user.firstName} needs ${requestedUnits} unit(s). Open BloodLink to respond.`,
      data: { screen: "donor:nearby", requestId: String(request._id) },
      channelId: urgency === "critical" ? "bloodlink-sos" : "bloodlink-default",
      priority: "high",
      sound: "default",
    });

    if (process.env.VAPID_PUBLIC_KEY) {
      const donorIds = rankedDonors.map(({ donor }) => donor._id);
      const distanceByDonor = new Map(
        rankedDonors.map(({ donor }) => [
          String(donor._id),
          roundKm(haversineKm(coordinates, donor.location.coordinates)),
        ]),
      );

      PushSubscription.find({ user: { $in: donorIds } })
        .then((subscriptions) =>
          Promise.all(
            subscriptions.map(async (pushSubscription) => {
              try {
                const distanceKm = distanceByDonor.get(String(pushSubscription.user)) ?? "N/A";
                await sendPushNotification(pushSubscription.subscription, {
                  title: `🩸 ${urgency === "critical" ? "SOS: " : ""}${bloodGroup} blood needed`,
                  body: `${distanceKm} km from you. Tap to respond.`,
                  url: "/donor/notifications",
                  urgency,
                  bloodGroup,
                  requestId: String(request._id),
                });
              } catch (err) {
                if (err?.expired) {
                  await PushSubscription.deleteOne({ _id: pushSubscription._id });
                }
              }
            }),
          ),
        )
        .catch(() => {});
    }

    for (const { donor, routing } of rankedDonors) {
      if (donor.email && (process.env.EMAIL_USER || process.env.SMTP_USER)) {
        const distanceKm = roundKm(haversineKm(coordinates, donor.location.coordinates));
        const requesterName = getDisplayName(req.user);
        const requesterType = req.user.role === "hospital" ? "Hospital/requester" : "Donor requester";
        const locationText = `${coordinates[1]}, ${coordinates[0]}`;
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`;
        const notesText = notes?.trim() || "No extra notes provided.";

        transporter
          .sendMail({
            from:
              process.env.SMTP_FROM ||
              `"BloodLink" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
            to: donor.email,
            subject: `${urgency === "critical" ? "SOS: " : ""}${bloodGroup} blood needed - ${distanceKm} km away`,
            text: [
              `${bloodGroup} blood is needed through BloodLink.`,
              "",
              `Requester: ${requesterName}`,
              `Requester type: ${requesterType}`,
              `Phone: ${req.user.phoneNumber || "Not shared"}`,
              `City: ${req.user.city || "Not shared"}`,
              `Units needed: ${requestedUnits}`,
              `Urgency: ${urgency}`,
              `Distance: ${distanceKm} km`,
              `Route estimate: ${routing.distance || "N/A"}${routing.duration ? `, ${routing.duration}` : ""}`,
              `Request location: ${locationText}`,
              `Map: ${mapsLink}`,
              `Notes: ${notesText}`,
              "",
              "Open BloodLink to accept or decline this request.",
            ].join("\n"),
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">
                <h2 style="color:#c0392b;margin-bottom:8px">${escapeHtml(bloodGroup)} blood needed</h2>
                <p>A BloodLink requester near you needs help.</p>
                <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
                  <tr><td><strong>Requester</strong></td><td>${escapeHtml(requesterName)}</td></tr>
                  <tr><td><strong>Requester type</strong></td><td>${escapeHtml(requesterType)}</td></tr>
                  <tr><td><strong>Phone</strong></td><td>${escapeHtml(req.user.phoneNumber || "Not shared")}</td></tr>
                  <tr><td><strong>City</strong></td><td>${escapeHtml(req.user.city || "Not shared")}</td></tr>
                  <tr><td><strong>Blood group</strong></td><td>${escapeHtml(bloodGroup)}</td></tr>
                  <tr><td><strong>Units needed</strong></td><td>${requestedUnits}</td></tr>
                  <tr><td><strong>Urgency</strong></td><td>${escapeHtml(urgency)}</td></tr>
                  <tr><td><strong>Distance</strong></td><td>${distanceKm} km</td></tr>
                  <tr><td><strong>Route estimate</strong></td><td>${escapeHtml(routing.distance || "N/A")}${routing.duration ? `, ${escapeHtml(routing.duration)}` : ""}</td></tr>
                  <tr><td><strong>Location</strong></td><td>${escapeHtml(locationText)}</td></tr>
                  <tr><td><strong>Notes</strong></td><td>${escapeHtml(notesText)}</td></tr>
                </table>
                <p><a href="${mapsLink}" style="color:#c0392b">View request location on map</a></p>
                <p>Please open BloodLink to accept or decline this request.</p>
              </div>
            `,
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

    let request = await BloodRequest.findById(req.params.id || req.params.requestId);

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
          status: "open",
          acceptedDonor: null,
        },
        { status: "responding", acceptedDonor: req.user._id },
        { new: true },
      );

      if (!claimedRequest) {
        return res.status(409).json({
          success: false,
          message: "This request has already been accepted by another donor.",
        });
      }

      request = claimedRequest;
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

    // Expo push to requester
    sendExpoPushToUsers([request.requestedBy], {
      title: `Donor ${action}ed your request`,
      body: `${req.user.firstName} ${req.user.lastName} ${action}ed your blood request`,
      data: { screen: "hospital:requests", requestId: String(request._id) },
      channelId: "bloodlink-default",
      priority: "high",
    });

    let conversation = null;
    if (action === "accept") {
      conversation = await ChatConversation.findOneAndUpdate(
        { request: request._id },
        {
          request: request._id,
          requester: request.requestedBy,
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

        // Expo push to other donors: request covered
        sendExpoPushToUsers(otherDonors, {
          title: `${request.bloodGroup} request covered`,
          body: `${req.user.firstName} accepted this request. Thanks for being ready.`,
          data: { screen: "donor:notifications" },
          channelId: "bloodlink-default",
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

    const update = { $set: { status } };
    if (status === "fulfilled") {
      update.$set.fulfilledAt = new Date();
    }
    if (status === "open") {
      update.$set.acceptedDonor = null;
      update.$unset = { fulfilledAt: "" };
      update.$pull = { respondingDonors: { action: "accept" } };
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

    if (status === "open") {
      await ChatConversation.deleteOne({ request: request._id });

      await Notification.updateMany(
        {
          recipient: { $in: request.notifiedDonors || [] },
          type: "blood_request",
          "data.requestId": request._id,
        },
        {
          $set: {
            isRead: false,
            title: `${request.bloodGroup} blood needed`,
            message: "This blood request is open again. Please respond if you can help.",
            "data.closed": false,
            "data.acceptedDonorId": null,
            "data.reopenedAt": new Date(),
          },
          $unset: {
            "data.closedAt": "",
            "data.acceptedDonorName": "",
          },
        },
      );

      (request.notifiedDonors || []).forEach((donorId) => {
        emitToUser(donorId, "blood-request:new", {
          title: `${request.bloodGroup} blood needed`,
          message: "This blood request is open again. Please respond if you can help.",
          data: {
            requestId: request._id,
            urgency: request.urgency,
            bloodGroup: request.bloodGroup,
            reopened: true,
          },
        });
      });

      // Expo push: request reopened
      sendExpoPushToUsers(request.notifiedDonors || [], {
        title: `🩸 ${request.bloodGroup} blood needed (reopened)`,
        body: "This blood request is open again. Please respond if you can help.",
        data: { screen: "donor:nearby", requestId: String(request._id) },
        channelId: request.urgency === "critical" ? "bloodlink-sos" : "bloodlink-default",
        priority: "high",
        sound: "default",
      });
    }

    if (["fulfilled", "cancelled"].includes(status)) {
      const statusPayload = {
        requestId: request._id,
        status,
        message:
          status === "fulfilled"
            ? "Donation completed. The request chat is now closed."
            : "This request was cancelled. The request chat is now closed.",
      };
      emitToRequest(request._id, `blood-request:${status}`, statusPayload);
      if (request.acceptedDonor) emitToUser(request.acceptedDonor, `blood-request:${status}`, statusPayload);
      emitToUser(request.requestedBy, `blood-request:${status}`, statusPayload);
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

    if (request.status === "fulfilled") {
      return res.status(400).json({
        success: false,
        message: "Donation already recorded for this request",
      });
    }

    const donationResult = await recordCompletedDonation({
      donorId: request.acceptedDonor,
      recordedBy: request.requestedBy,
      bloodGroup: request.bloodGroup,
      units: request.unitsNeeded,
      notes: request.notes || "SOS donation completed via BloodLink",
      bloodRequestId: request._id,
      urgency: request.urgency,
      source: "sos",
    });

    request.status = "fulfilled";
    request.fulfilledAt = new Date();
    await request.save();

    const completionPayload = {
      requestId: request._id,
      status: request.status,
      message: "Donation completed. The request chat is now closed.",
    };
    emitToRequest(request._id, "blood-request:fulfilled", completionPayload);
    emitToUser(request.acceptedDonor, "blood-request:fulfilled", completionPayload);
    emitToUser(request.requestedBy, "blood-request:fulfilled", completionPayload);

    const { donation, deferralUntil, loyalty } = donationResult;

    await Notification.create({
      recipient: request.acceptedDonor,
      type: "eligibility_deferred",
      title: "Donation completed",
      message: `Thank you for donating. +${loyalty.pointsAwarded} points earned. You are not eligible for the next 30 days.`,
      data: {
        requestId: request._id,
        deferralUntil,
        donationId: donation._id,
        pointsAwarded: loyalty.pointsAwarded,
        badges: loyalty.badges,
        certificateId: loyalty.certificateId,
      },
    });

    return res.status(200).json({
      success: true,
      data: { request, donation, deferralUntil, loyalty },
      message: donationResult.duplicate
        ? "Donation was already recorded for this request"
        : `Donation recorded. +${loyalty.pointsAwarded} points earned.`,
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

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        success: false,
        message: "Provide valid lat and lng",
      });
    }

    const origin = [lng, lat];
    const requests = await BloodRequest.find({
      status: { $in: ["open", "responding"] },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: 50000,
        },
      },
    })
      .populate("requestedBy", "firstName lastName city")
      .sort({ createdAt: -1 });
    const withDistance = requests
      .map((request) => {
        const data = request.toObject();
        data.distanceKm = roundKm(haversineKm(origin, data.location?.coordinates));
        return data;
      })
      .filter((request) => Number.isFinite(request.distanceKm))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.status(200).json({
      success: true,
      data: withDistance,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching nearby requests",
    });
  }
};

exports.findNearbyDonors = findNearbyDonors;
