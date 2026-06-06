const Appointment = require("../models/Appointment");
const UserModel = require("../models/user");
const { recordCompletedDonation } = require("../utils/recordDonation");

exports.createAppointment = async (req, res) => {
  try {
    const { hospital, date, timeSlot } = req.body;

    if (!hospital || !date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: "Provide hospital, date and time slot",
      });
    }

    const appointment = await Appointment.create({
      donor: req.user._id,
      hospital,
      date,
      timeSlot,
    });

    return res.status(201).json({
      success: true,
      data: appointment,
      message: "Appointment confirmed",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error creating appointment",
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const filter =
      req.user.role === "hospital"
        ? { hospital: req.user._id }
        : { donor: req.user._id };

    const appointments = await Appointment.find(filter)
      .populate("donor", "firstName lastName bloodGroup phoneNumber")
      .populate("hospital", "firstName hospitalName")
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching appointments",
    });
  }
};

exports.completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      hospital: req.user._id,
      status: "scheduled",
    }).populate("donor", "bloodGroup");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Scheduled appointment not found",
      });
    }

    const donor = appointment.donor?._id
      ? appointment.donor
      : await UserModel.findById(appointment.donor).select("bloodGroup");

    if (!donor?.bloodGroup) {
      return res.status(400).json({
        success: false,
        message: "Donor blood group is required to record donation",
      });
    }

    const result = await recordCompletedDonation({
      donorId: donor._id || appointment.donor,
      recordedBy: req.user._id,
      bloodGroup: donor.bloodGroup,
      units: 1,
      notes: `Scheduled appointment completed (${appointment.timeSlot})`,
      appointmentId: appointment._id,
      source: "appointment",
    });

    appointment.status = "completed";
    await appointment.save();

    return res.status(200).json({
      success: true,
      data: {
        appointment,
        donation: result.donation,
        loyalty: result.loyalty,
      },
      message: result.duplicate
        ? "Donation was already recorded for this appointment"
        : `Donation recorded. +${result.loyalty.pointsAwarded} points earned.`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error completing appointment",
    });
  }
};
