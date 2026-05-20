const express = require("express");
const controller = require("../controllers/bloodRequestController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.get("/", protect, controller.getRequests);
router.get("/nearby", protect, restrictTo("donor"), controller.getNearbyRequests);
router.post("/", protect, restrictTo("hospital"), controller.createRequest);
router.put("/:id/respond", protect, restrictTo("donor"), controller.respondToRequest);
router.put("/:id/status", protect, restrictTo("hospital"), controller.updateRequestStatus);

module.exports = router;
