const UserModel = require("../models/user");
const BloodInventory = require("../models/BloodInventory");
const BloodRequest = require("../models/BloodRequest");
const DonationHistory = require("../models/DonationHistory");
const Notification = require("../models/Notification");
const { transporter } = require("./auth");

const getPagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [inventorySum] = await BloodInventory.aggregate([
      { $group: { _id: null, total: { $sum: "$units" } } },
    ]);

    const [
      totalUsers,
      totalDonors,
      totalHospitals,
      requestsToday,
      fulfilledToday,
      pendingHospitalApprovals,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: "donor" }),
      UserModel.countDocuments({ role: "hospital" }),
      BloodRequest.countDocuments({ createdAt: { $gte: today } }),
      BloodRequest.countDocuments({
        status: "fulfilled",
        fulfilledAt: { $gte: today },
      }),
      UserModel.countDocuments({ role: "hospital", isApproved: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalDonors,
        totalHospitals,
        totalBloodUnits: inventorySum?.total || 0,
        requestsToday,
        fulfilledToday,
        pendingHospitalApprovals,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching stats",
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const [data, total] = await Promise.all([
      UserModel.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching users",
    });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.email && (process.env.EMAIL_USER || process.env.SMTP_USER)) {
      transporter
        .sendMail({
          from:
            process.env.SMTP_FROM ||
            `"BloodLink" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
          to: user.email,
          subject: "BloodLink account approved",
          text: "Your BloodLink hospital account has been approved.",
        })
        .catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "User approved",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error approving user",
    });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    await UserModel.findByIdAndUpdate(req.params.id, {
      isActive: false,
      suspensionReason: req.body.reason || "No reason provided",
    });
    return res.status(200).json({ success: true, message: "User suspended" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error suspending user",
    });
  }
};

exports.activateUser = async (req, res) => {
  try {
    await UserModel.findByIdAndUpdate(req.params.id, {
      isActive: true,
      suspensionReason: "",
    });
    return res.status(200).json({ success: true, message: "User activated" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error activating user",
    });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const { status, bloodGroup, urgency } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (status) filter.status = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (urgency) filter.urgency = urgency;

    const [data, total] = await Promise.all([
      BloodRequest.find(filter)
        .populate("requestedBy", "firstName lastName city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BloodRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching requests",
    });
  }
};

exports.getSystemInventory = async (req, res) => {
  try {
    const byBloodGroup = await BloodInventory.aggregate([
      { $group: { _id: "$bloodGroup", totalUnits: { $sum: "$units" } } },
      { $sort: { _id: 1 } },
    ]);

    const breakdown = await BloodInventory.find()
      .populate("hospital", "firstName lastName city")
      .sort({ bloodGroup: 1 });

    const critical = byBloodGroup
      .filter((entry) => entry.totalUnits < 10)
      .map((entry) => ({
        bloodGroup: entry._id,
        totalUnits: entry.totalUnits,
      }));

    return res.status(200).json({
      success: true,
      data: {
        byBloodGroup,
        breakdown,
        critical,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching system inventory",
    });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const [topDonors, donationsByMonth, bloodGroupDistribution, returning, oneTime, total] =
      await Promise.all([
        UserModel.find({ role: "donor" })
          .sort({ points: -1 })
          .limit(10)
          .select("firstName lastName bloodGroup points totalDonations badges"),
        DonationHistory.aggregate([
          { $match: { donationDate: { $gte: since } } },
          {
            $group: {
              _id: {
                year: { $year: "$donationDate" },
                month: { $month: "$donationDate" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        UserModel.aggregate([
          { $match: { role: "donor" } },
          { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        UserModel.countDocuments({ role: "donor", totalDonations: { $gt: 1 } }),
        UserModel.countDocuments({ role: "donor", totalDonations: 1 }),
        UserModel.countDocuments({ role: "donor" }),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        topDonors,
        donationsByMonth,
        bloodGroupDistribution,
        retentionRate: { returning, oneTime, total },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching analytics",
    });
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, targetRole, targetBloodGroup } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Provide title and message",
      });
    }

    const filter = { isActive: true };
    if (targetRole) filter.role = targetRole;
    if (targetBloodGroup) filter.bloodGroup = targetBloodGroup;

    const users = await UserModel.find(filter).select("_id");

    if (users.length > 0) {
      await Notification.insertMany(
        users.map((user) => ({
          recipient: user._id,
          type: "broadcast",
          title,
          message,
        })),
      );
    }

    return res.status(200).json({
      success: true,
      message: `Sent to ${users.length} users`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error broadcasting notification",
    });
  }
};
