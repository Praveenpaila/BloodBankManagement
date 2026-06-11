const DonationHistory = require("../models/DonationHistory");
const UserModel = require("../models/user");
const { awardPoints } = require("../controllers/loyaltyController");
const { deferDonorAfterDonation } = require("./eligibilityDeferral");
const { emitToUser } = require("./realtime");
const { sendExpoPushToUsers } = require("./expoPush");

const generateCertificateId = () =>
  `BL-${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;

const recordCompletedDonation = async ({
  donorId,
  recordedBy,
  bloodGroup,
  units = 1,
  notes = "",
  bloodRequestId = null,
  appointmentId = null,
  urgency = null,
  source = "manual",
}) => {
  if (bloodRequestId) {
    const existing = await DonationHistory.findOne({ bloodRequest: bloodRequestId });
    if (existing) {
      const user = await UserModel.findById(donorId).select("points badges totalDonations");
      return {
        duplicate: true,
        donation: existing,
        deferralUntil: null,
        loyalty: {
          pointsAwarded: 0,
          badges: user?.badges || [],
          totalDonations: user?.totalDonations || 0,
        },
      };
    }
  }

  if (appointmentId) {
    const existing = await DonationHistory.findOne({ appointment: appointmentId });
    if (existing) {
      const user = await UserModel.findById(donorId).select("points badges totalDonations");
      return {
        duplicate: true,
        donation: existing,
        deferralUntil: null,
        loyalty: {
          pointsAwarded: 0,
          badges: user?.badges || [],
          totalDonations: user?.totalDonations || 0,
        },
      };
    }
  }

  const donation = await DonationHistory.create({
    donor: donorId,
    hospital: recordedBy,
    bloodGroup,
    units,
    notes,
    bloodRequest: bloodRequestId || undefined,
    appointment: appointmentId || undefined,
    source,
    certificateId: generateCertificateId(),
  });

  await UserModel.findByIdAndUpdate(donorId, { $inc: { totalDonations: 1 } });

  const deferralReason =
    source === "sos"
      ? "SOS donation completed. Donor is deferred for 30 days."
      : source === "appointment"
        ? "Appointment donation completed. Donor is deferred for 30 days."
        : "Donation completed. Donor is deferred for 30 days.";
  const deferralUntil = await deferDonorAfterDonation(donorId, deferralReason);

  let pointsAwarded = 100;
  await awardPoints(donorId, "donation", 100, "Donation completed");

  if (source === "sos" || urgency === "critical" || urgency === "urgent") {
    pointsAwarded += 150;
    await awardPoints(
      donorId,
      "emergency_response",
      150,
      source === "sos" ? "SOS blood request donation" : "Critical request response",
    );
  }

  const user = await UserModel.findById(donorId).select("points badges totalDonations");

  emitToUser(donorId, "donation:recorded", {
    donationId: donation._id,
    bloodRequestId,
    pointsAwarded,
    totalPoints: user?.points || 0,
    badges: user?.badges || [],
    totalDonations: user?.totalDonations || 0,
    certificateId: donation.certificateId,
  });

  emitToUser(donorId, "eligibility:deferred", {
    bloodRequestId,
    deferralUntil,
  });

  // Expo push for donation recorded
  sendExpoPushToUsers([donorId], {
    title: "🎉 Donation recorded!",
    body: `+${pointsAwarded} points earned. Total donations: ${user?.totalDonations || 0}. You are deferred for 30 days.`,
    data: { screen: "donor:history" },
    channelId: "bloodlink-default",
    priority: "high",
  });

  return {
    duplicate: false,
    donation,
    deferralUntil,
    loyalty: {
      pointsAwarded,
      totalPoints: user?.points || 0,
      badges: user?.badges || [],
      totalDonations: user?.totalDonations || 0,
      certificateId: donation.certificateId,
    },
  };
};

module.exports = {
  generateCertificateId,
  recordCompletedDonation,
};
