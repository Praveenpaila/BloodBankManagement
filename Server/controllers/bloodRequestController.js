const axios = require("axios");
const BloodRequest = require("../models/BloodRequest");
const UserModel = require("../models/user");
const Notification = require("../models/Notification");
const { transporter } = require("./auth");

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
  return UserModel.find({
    role: "donor",
    bloodGroup,
    isActive: true,
    isEligible: true,
    _id: { $nin: excludeIds },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates,
        },
        $maxDistance: Number(radiusKm || 10) * 1000,
      },
    },
  }).select("-password");
};

exports.createRequest = async (req, res) => {
  try {
    const { bloodGroup, unitsNeeded, urgency = "normal", lat, lng, radiusKm = 10, notes } =
      req.body;

    if (!bloodGroup || !unitsNeeded) {
      return res.status(400).json({
        success: false,
        message: "Provide blood group and units needed",
      });
    }

    const coordinates =
      lng !== undefined && lat !== undefined
        ? [Number(lng), Number(lat)]
        : req.user.location?.coordinates;

    if (!coordinates?.length) {
      return res.status(400).json({
        success: false,
        message: "Request location is required",
      });
    }

    const donors = await findNearbyDonors(bloodGroup, coordinates, radiusKm);

    const request = await BloodRequest.create({
      requestedBy: req.user._id,
      bloodGroup,
      unitsNeeded,
      urgency,
      notes,
      location: { type: "Point", coordinates },
      radiusKm,
      notifiedDonors: donors.map((donor) => donor._id),
    });

    const distances = await getDistanceInfo(
      coordinates,
      donors.map((donor) => donor.location.coordinates),
    );

    await Notification.insertMany(
      donors.map((donor, index) => ({
        recipient: donor._id,
        type: "blood_request",
        title: `${bloodGroup} blood needed`,
        message: `${req.user.firstName} needs ${unitsNeeded} unit(s). Distance: ${distances[index].distance}`,
        data: {
          requestId: request._id,
          urgency,
          bloodGroup,
          distance: distances[index].distance,
          duration: distances[index].duration,
        },
      })),
    );

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
    const filter = req.user.role === "hospital" ? { requestedBy: req.user._id } : {};
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

    request.respondingDonors = request.respondingDonors.filter(
      (entry) => String(entry.donor) !== String(req.user._id),
    );
    request.respondingDonors.push({
      donor: req.user._id,
      action,
      respondedAt: new Date(),
    });
    if (action === "accept") {
      request.status = "responding";
    }

    await request.save();

    await Notification.create({
      recipient: request.requestedBy,
      type: "donor_response",
      title: `Donor ${action}ed request`,
      message: `${req.user.firstName} ${req.user.lastName} ${action}ed your blood request`,
      data: {
        requestId: request._id,
        donorId: req.user._id,
      },
    });

    return res.status(200).json({
      success: true,
      data: request,
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
