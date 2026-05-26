const EligibilityRecord = require("../models/EligibilityRecord");
const UserModel = require("../models/user");

const deferDonorAfterDonation = async (donorId, reason = "Donation completed") => {
  const deferralUntil = new Date();
  deferralUntil.setDate(deferralUntil.getDate() + 30);

  await EligibilityRecord.create({
    donor: donorId,
    status: "temporarily_deferred",
    deferralReason: reason,
    deferralUntil,
  });

  await UserModel.findByIdAndUpdate(donorId, {
    isEligible: false,
  });

  return deferralUntil;
};

module.exports = {
  deferDonorAfterDonation,
};
