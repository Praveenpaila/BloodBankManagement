const Appointment = require("../models/Appointment");

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
