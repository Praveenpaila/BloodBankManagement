const DonationHistory = require("../models/DonationHistory");
const UserModel = require("../models/user");
const BloodRequest = require("../models/BloodRequest");
const { awardPoints } = require("./loyaltyController");
const { deferDonorAfterDonation } = require("../utils/eligibilityDeferral");

const generateCertificateId = () => {
  return `BL-${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
};

exports.recordDonation = async (req, res) => {
  try {
    const { donorId, bloodGroup, units = 1, notes, requestId } = req.body;

    if (!donorId || !bloodGroup) {
      return res.status(400).json({
        success: false,
        message: "Provide donor and blood group",
      });
    }

    const donation = await DonationHistory.create({
      donor: donorId,
      hospital: req.user._id,
      bloodGroup,
      units,
      notes,
      certificateId: generateCertificateId(),
    });

    await UserModel.findByIdAndUpdate(donorId, {
      $inc: { totalDonations: 1 },
    });
    const deferralUntil = await deferDonorAfterDonation(
      donorId,
      "Donation completed. Donor is deferred for 30 days.",
    );
    await awardPoints(donorId, "donation", 100, "Donation completed");

    if (requestId) {
      const request = await BloodRequest.findById(requestId);
      if (request?.urgency === "critical") {
        await awardPoints(
          donorId,
          "emergency_response",
          150,
          "Critical request response",
        );
      }
    }

    return res.status(201).json({
      success: true,
      data: donation,
      deferralUntil,
      message: "Donation recorded",
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
      .populate("hospital", "firstName lastName")
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
