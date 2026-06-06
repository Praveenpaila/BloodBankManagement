const express = require("express");
const controller = require("../controllers/appointmentController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.post("/", protect, restrictTo("donor"), controller.createAppointment);
router.get("/", protect, restrictTo("donor", "hospital"), controller.getAppointments);
router.put("/:id/complete", protect, restrictTo("hospital"), controller.completeAppointment);

module.exports = router;
