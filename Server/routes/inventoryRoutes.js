const express = require("express");
const controller = require("../controllers/inventoryController");
const { protect } = require("../middlewares/auth");
const { restrictTo } = require("../middlewares/admin");

const router = express.Router();

router.get("/", protect, controller.getInventory);
router.get("/expiry-alerts", protect, controller.getExpiryAlerts);
router.post("/", protect, restrictTo("hospital"), controller.addStock);
router.put("/:id", protect, restrictTo("hospital"), controller.updateStock);
router.delete("/:id", protect, restrictTo("hospital"), controller.deleteStock);

module.exports = router;
