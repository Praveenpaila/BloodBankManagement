const UserModel = require("../models/user");
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

exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const coordinates = parseCoordinates(lat, lng);

    if (!coordinates) {
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
          coordinates,
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
    const coordinates = parseCoordinates(lat, lng);
    const radiusKm = Math.max(Number(radius) || 10, 1);

    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "Live location is required to count nearby donors",
      });
    }

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

    filter.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates,
        },
        $maxDistance: radiusKm * 1000,
      },
    };

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
