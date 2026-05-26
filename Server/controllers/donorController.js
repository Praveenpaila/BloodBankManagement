const UserModel = require("../models/user");
const { bloodGroupFilterFor, compatibleDonorGroupsFor } = require("../utils/bloodCompatibility");

exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({
        success: false,
        message: "Provide valid lat and lng",
      });
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
      },
      { new: true },
    ).select("-password");

    return res.status(200).json({
      success: true,
      data: user,
      message: "Location updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error updating location",
    });
  }
};

exports.searchDonors = async (req, res) => {
  try {
    const { bloodGroup, city, lat, lng, radius } = req.query;
    const filter = {
      role: "donor",
      isActive: true,
      isEligible: true,
    };

    if (req.user?._id) {
      filter._id = { $ne: req.user._id };
    }

    if (bloodGroup) {
      const compatibleBloodGroups = compatibleDonorGroupsFor(bloodGroup);
      if (compatibleBloodGroups.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }
      filter.bloodGroup = bloodGroupFilterFor(bloodGroup);
    }

    if (city) {
      filter.city = new RegExp(city, "i");
    }

    if (lat && lng && radius) {
      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Number(radius) * 1000,
        },
      };
    }

    const donors = await UserModel.find(filter)
      .select("firstName bloodGroup city isEligible location")
      .limit(50);

    return res.status(200).json({
      success: true,
      count: donors.length,
      data: donors,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error searching donors",
    });
  }
};

exports.countDonors = async (req, res) => {
  try {
    const { bloodGroup, lat, lng, radius = 10 } = req.query;
    const radiusKm = Math.max(Number(radius) || 10, 1);
    const filter = {
      role: "donor",
      isActive: true,
      isEligible: true,
    };

    if (req.user?._id) {
      filter._id = { $ne: req.user._id };
    }

    if (bloodGroup) {
      const compatibleBloodGroups = compatibleDonorGroupsFor(bloodGroup);
      if (compatibleBloodGroups.length === 0) {
        return res.status(200).json({
          success: true,
          data: { count: 0 },
        });
      }
      filter.bloodGroup = bloodGroupFilterFor(bloodGroup);
    }

    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: radiusKm * 1000,
        },
      };
    }

    const donors = await UserModel.find(filter).select("_id").lean();

    return res.status(200).json({
      success: true,
      data: { count: donors.length },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error counting donors",
    });
  }
};
