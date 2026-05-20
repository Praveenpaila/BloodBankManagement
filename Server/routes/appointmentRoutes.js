const express = require("express");
const controller = require("../controllers/appointmentController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.post("/", protect, restrictTo("donor"), controller.createAppointment);

module.exports = router;
