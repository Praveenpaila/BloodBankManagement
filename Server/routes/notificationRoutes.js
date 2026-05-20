const express = require("express");
const controller = require("../controllers/notificationController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/", protect, controller.getNotifications);
router.post("/", protect, controller.createNotification);
router.put("/read-all", protect, controller.markAllRead);
router.put("/:id/read", protect, controller.markOneRead);

module.exports = router;
