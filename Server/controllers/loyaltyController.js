const UserModel = require("../models/user");
const LoyaltyRecord = require("../models/LoyaltyRecord");
const Notification = require("../models/Notification");

const rareBloodGroups = ["AB-", "B-", "A-", "O-"];

const createBadgeNotification = async (donorId, badge) => {
  await Notification.create({
    recipient: donorId,
    type: "badge_earned",
    title: `Badge Earned: ${badge}`,
    message:
      badge === "First Drop"
        ? "You made your first donation!"
        : `You earned the ${badge} badge!`,
    data: { badge },
  });
};

const addBadge = async (user, badge, bonusPoints = 0) => {
  if (user.badges.includes(badge)) {
    return;
  }

  user.badges.push(badge);
  if (bonusPoints > 0) {
    user.points += bonusPoints;
    await LoyaltyRecord.create({
      donor: user._id,
      action: "badge_earned",
      points: bonusPoints,
      description: `${badge} badge bonus`,
    });
  }
  await createBadgeNotification(user._id, badge);
};

const awardPoints = async (donorId, action, points, description) => {
  await LoyaltyRecord.create({
    donor: donorId,
    action,
    points,
    description,
  });

  const user = await UserModel.findByIdAndUpdate(
    donorId,
    { $inc: { points } },
    { new: true },
  );

  if (!user) {
    return null;
  }

  if (user.totalDonations >= 1) {
    await addBadge(user, "First Drop");
  }
  if (user.totalDonations >= 5) {
    await addBadge(user, "Life Saver", 500);
  }
  if (user.totalDonations >= 10) {
    await addBadge(user, "Blood Hero", 1000);
  }
  if (rareBloodGroups.includes(user.bloodGroup)) {
    await addBadge(user, "Rare Type", 300);
  }
  if (action === "emergency_response") {
    await addBadge(user, "Emergency Responder", 400);
  }

  await user.save();
  return user;
};

exports.awardPoints = awardPoints;

exports.getLeaderboard = async (req, res) => {
  try {
    const users = await UserModel.find({ role: "donor" })
      .sort({ points: -1 })
      .limit(20)
      .select("firstName lastName bloodGroup points badges totalDonations");

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching leaderboard",
    });
  }
};

exports.getMyStats = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select(
      "points badges totalDonations",
    );
    const records = await LoyaltyRecord.find({ donor: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      data: {
        points: user.points,
        badges: user.badges,
        totalDonations: user.totalDonations,
        records,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching loyalty stats",
    });
  }
};
