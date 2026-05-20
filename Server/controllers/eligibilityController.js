const EligibilityRecord = require("../models/EligibilityRecord");
const UserModel = require("../models/user");

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const addMonths = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

const checkEligibilityRules = ({
  age,
  weight,
  recentIllness,
  medications,
  travelHistory,
  tattooPiercing,
  hemoglobin,
  gender,
}) => {
  const normalizedGender = gender?.toLowerCase();

  if (Number(age) < 18 || Number(age) > 65) {
    return {
      status: "permanently_deferred",
      reason: "Age must be between 18 and 65",
      deferralUntil: null,
    };
  }

  if (Number(weight) < 50) {
    return {
      status: "temporarily_deferred",
      reason: "Weight must be at least 50kg",
      deferralUntil: null,
    };
  }

  if (tattooPiercing === true) {
    return {
      status: "temporarily_deferred",
      reason: "Tattoo or piercing in last 6 months",
      deferralUntil: addMonths(6),
    };
  }

  if (recentIllness === true) {
    return {
      status: "temporarily_deferred",
      reason: "Recent illness",
      deferralUntil: addDays(30),
    };
  }

  if (medications === true) {
    return {
      status: "temporarily_deferred",
      reason: "Currently on medication",
      deferralUntil: addDays(14),
    };
  }

  if (travelHistory === true) {
    return {
      status: "temporarily_deferred",
      reason: "Recent international travel",
      deferralUntil: addDays(21),
    };
  }

  if (Number(hemoglobin) < 12.5 && normalizedGender === "female") {
    return {
      status: "temporarily_deferred",
      reason: "Low hemoglobin",
      deferralUntil: addDays(30),
    };
  }

  if (Number(hemoglobin) < 13 && normalizedGender === "male") {
    return {
      status: "temporarily_deferred",
      reason: "Low hemoglobin",
      deferralUntil: addDays(30),
    };
  }

  return {
    status: "eligible",
    reason: null,
    deferralUntil: null,
  };
};

exports.checkEligibility = async (req, res) => {
  try {
    const result = checkEligibilityRules(req.body);

    await EligibilityRecord.create({
      donor: req.user._id,
      ...req.body,
      status: result.status,
      deferralReason: result.reason,
      deferralUntil: result.deferralUntil,
    });

    await UserModel.findByIdAndUpdate(req.user._id, {
      isEligible: result.status === "eligible",
    });

    return res.status(201).json({
      success: true,
      data: {
        status: result.status,
        reason: result.reason,
        deferralUntil: result.deferralUntil,
      },
      message: "Eligibility checked",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error checking eligibility",
    });
  }
};

exports.getEligibilityStatus = async (req, res) => {
  try {
    const record = await EligibilityRecord.findOne({ donor: req.user._id }).sort({
      createdAt: -1,
    });

    if (!record) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    const expiresAt = new Date(record.createdAt);
    expiresAt.setDate(expiresAt.getDate() + 90);

    if (expiresAt < new Date()) {
      return res.status(200).json({
        success: true,
        data: {
          status: "expired",
          record,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching eligibility status",
    });
  }
};
