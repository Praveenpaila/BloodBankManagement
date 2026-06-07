const express = require("express");
const controller = require("../controllers/bloodFinderController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.get("/", protect, restrictTo("donor", "hospital"), controller.findBlood);

module.exports = router;
