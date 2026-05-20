const UserModel = require("../models/user");

exports.listHospitals = async (req, res) => {
  try {
    const hospitals = await UserModel.find({
      role: "hospital",
      isActive: true,
      isApproved: true,
    }).select("_id firstName lastName city location");

    return res.status(200).json({
      success: true,
      data: hospitals,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching hospitals",
    });
  }
};
