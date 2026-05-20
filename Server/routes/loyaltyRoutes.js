const express = require("express");
const controller = require("../controllers/loyaltyController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.get("/leaderboard", controller.getLeaderboard);
router.get("/my-stats", protect, restrictTo("donor"), controller.getMyStats);

module.exports = router;
