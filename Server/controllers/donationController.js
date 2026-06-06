const DonationHistory = require("../models/DonationHistory");
const BloodRequest = require("../models/BloodRequest");
const { recordCompletedDonation } = require("../utils/recordDonation");

exports.recordDonation = async (req, res) => {
  try {
    const { donorId, bloodGroup, units = 1, notes, requestId } = req.body;

    if (!donorId || !bloodGroup) {
      return res.status(400).json({
        success: false,
        message: "Provide donor and blood group",
      });
    }

    let urgency = null;
    if (requestId) {
      const request = await BloodRequest.findById(requestId);
      urgency = request?.urgency || null;
    }

    const result = await recordCompletedDonation({
      donorId,
      recordedBy: req.user._id,
      bloodGroup,
      units,
      notes,
      bloodRequestId: requestId || null,
      urgency,
      source: "manual",
    });

    return res.status(201).json({
      success: true,
      data: result.donation,
      deferralUntil: result.deferralUntil,
      loyalty: result.loyalty,
      message: result.duplicate
        ? "Donation was already recorded"
        : `Donation recorded. +${result.loyalty.pointsAwarded} points earned.`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error recording donation",
    });
  }
};

exports.getMyDonationHistory = async (req, res) => {
  try {
    const donations = await DonationHistory.find({ donor: req.user._id })
      .populate("hospital", "firstName lastName hospitalName")
      .populate("bloodRequest", "urgency status")
      .sort({ donationDate: -1 });

    return res.status(200).json({
      success: true,
      data: donations,
      totalDonations: donations.length,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching donation history",
    });
  }
};

exports.getHospitalDonationHistory = async (req, res) => {
  try {
    const donations = await DonationHistory.find({ hospital: req.user._id })
      .populate("donor", "firstName lastName bloodGroup phoneNumber")
      .sort({ donationDate: -1 });

    return res.status(200).json({
      success: true,
      data: donations,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching hospital donation history",
    });
  }
};
