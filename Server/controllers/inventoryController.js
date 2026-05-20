const BloodInventory = require("../models/BloodInventory");

exports.getInventory = async (req, res) => {
  try {
    const filter = req.user?.role === "hospital" ? { hospital: req.user._id } : {};
    const inventory = await BloodInventory.find(filter)
      .populate("hospital", "firstName lastName city")
      .sort({ bloodGroup: 1, expiryDate: 1 });

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching inventory",
    });
  }
};

exports.addStock = async (req, res) => {
  try {
    const stock = await BloodInventory.create({
      hospital: req.user._id,
      bloodGroup: req.body.bloodGroup,
      units: req.body.units,
      expiryDate: req.body.expiryDate,
    });

    return res.status(201).json({
      success: true,
      data: stock,
      message: "Stock added",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error adding stock",
    });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const stock = await BloodInventory.findOneAndUpdate(
      { _id: req.params.id, hospital: req.user._id },
      {
        bloodGroup: req.body.bloodGroup,
        units: req.body.units,
        expiryDate: req.body.expiryDate,
        lastUpdated: new Date(),
      },
      { new: true, runValidators: true },
    );

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: stock,
      message: "Stock updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error updating stock",
    });
  }
};

exports.deleteStock = async (req, res) => {
  try {
    const stock = await BloodInventory.findOneAndDelete({
      _id: req.params.id,
      hospital: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Stock deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error deleting stock",
    });
  }
};

exports.getExpiryAlerts = async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 14);

    const filter = {
      expiryDate: { $lte: cutoff },
    };

    if (req.user?.role === "hospital") {
      filter.hospital = req.user._id;
    }

    const alerts = await BloodInventory.find(filter)
      .populate("hospital", "firstName lastName city email")
      .sort({ expiryDate: 1 });

    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching expiry alerts",
    });
  }
};
