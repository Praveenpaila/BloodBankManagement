const express = require("express");
const controller = require("../controllers/donorController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/search", controller.searchDonors);
router.get("/count", controller.countDonors);
router.put("/location", protect, controller.updateLocation);

module.exports = router;
