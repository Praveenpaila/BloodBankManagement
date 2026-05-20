const cron = require("node-cron");
const BloodInventory = require("../models/BloodInventory");
const UserModel = require("../models/user");
const Notification = require("../models/Notification");
const BloodRequest = require("../models/BloodRequest");
const DonationHistory = require("../models/DonationHistory");
const { awardPoints } = require("../controllers/loyaltyController");
const { transporter } = require("../controllers/auth");
const { findNearbyDonors } = require("../controllers/bloodRequestController");

cron.schedule("0 8 * * *", async () => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 14);

    const expiring = await BloodInventory.find({
      expiryDate: { $lte: cutoff },
    }).populate("hospital", "firstName email");

    const grouped = expiring.reduce((map, item) => {
      const key = String(item.hospital._id);
      if (!map[key]) {
        map[key] = {
          hospital: item.hospital,
          items: [],
        };
      }
      map[key].items.push(item);
      return map;
    }, {});

    for (const group of Object.values(grouped)) {
      const message = `${group.items.length} stock item(s) expire within 14 days.`;
      await Notification.create({
        recipient: group.hospital._id,
        type: "expiry_alert",
        title: "Blood stock expiry alert",
        message,
      });

      if (group.hospital.email && (process.env.EMAIL_USER || process.env.SMTP_USER)) {
        transporter
          .sendMail({
            from:
              process.env.SMTP_FROM ||
              `"BloodLink" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
            to: group.hospital.email,
            subject: "BloodLink expiry alert",
            text: message,
          })
          .catch(() => {});
      }
    }

    console.log("Expiry alert cron ran");
  } catch (err) {
    console.error("Expiry alert cron failed:", err.message);
  }
});

cron.schedule("0 0 1 * *", async () => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);

    const [winner] = await DonationHistory.aggregate([
      { $match: { donationDate: { $gte: start, $lt: end } } },
      { $group: { _id: "$donor", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    if (winner) {
      const user = await UserModel.findById(winner._id);
      const monthlyBadge = `Monthly Champion ${start.getFullYear()}-${start.getMonth() + 1}`;

      if (user && !user.badges.includes(monthlyBadge)) {
        user.badges.push("Monthly Champion", monthlyBadge);
        await user.save();
        await awardPoints(user._id, "badge_earned", 750, "Monthly Champion badge bonus");
        await Notification.create({
          recipient: user._id,
          type: "badge_earned",
          title: "Badge Earned: Monthly Champion",
          message: "You were the top donor last month!",
        });
      }
    }

    console.log("Monthly champion cron ran");
  } catch (err) {
    console.error("Monthly champion cron failed:", err.message);
  }
});

cron.schedule("*/30 * * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const requests = await BloodRequest.find({
      status: "open",
      createdAt: { $lte: cutoff },
    });

    for (const request of requests) {
      const donors = await findNearbyDonors(
        request.bloodGroup,
        request.location.coordinates,
        request.radiusKm,
        request.notifiedDonors,
      ).limit(5);

      if (donors.length === 0) {
        continue;
      }

      await Notification.insertMany(
        donors.map((donor) => ({
          recipient: donor._id,
          type: "blood_request",
          title: `${request.bloodGroup} blood needed`,
          message: "A nearby blood request still needs donors.",
          data: { requestId: request._id },
        })),
      );

      request.notifiedDonors.push(...donors.map((donor) => donor._id));
      await request.save();
    }

    console.log("Escalation cron ran");
  } catch (err) {
    console.error("Escalation cron failed:", err.message);
  }
});
