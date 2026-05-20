const express = require("express");
const controller = require("../controllers/donationController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.post("/", protect, restrictTo("hospital"), controller.recordDonation);
router.get("/my-history", protect, restrictTo("donor"), controller.getMyDonationHistory);
router.get(
  "/hospital-history",
  protect,
  restrictTo("hospital"),
  controller.getHospitalDonationHistory,
);

module.exports = router;
