const express = require("express");
const controller = require("../controllers/adminController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.use(protect, restrictTo("admin"));

router.get("/stats", controller.getStats);
router.get("/users", controller.getAllUsers);
router.put("/users/:id/approve", controller.approveUser);
router.put("/users/:id/suspend", controller.suspendUser);
router.put("/users/:id/activate", controller.activateUser);
router.get("/requests", controller.getAllRequests);
router.get("/inventory", controller.getSystemInventory);
router.get("/analytics", controller.getAnalytics);
router.post("/broadcast", controller.broadcastNotification);

module.exports = router;
