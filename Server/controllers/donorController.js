const UserModel = require("../models/user");

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

    if (bloodGroup) {
      filter.bloodGroup = bloodGroup;
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
    const filter = {
      role: "donor",
      isActive: true,
      isEligible: true,
    };

    if (bloodGroup) {
      filter.bloodGroup = bloodGroup;
    }

    if (lat && lng) {
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

    const count = await UserModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error counting donors",
    });
  }
};
