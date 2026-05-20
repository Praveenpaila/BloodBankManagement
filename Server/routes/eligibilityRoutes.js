const express = require("express");
const controller = require("../controllers/eligibilityController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.post("/", protect, restrictTo("donor"), controller.checkEligibility);
router.post("/check", protect, restrictTo("donor"), controller.checkEligibility);
router.get("/status", protect, restrictTo("donor"), controller.getEligibilityStatus);

module.exports = router;
