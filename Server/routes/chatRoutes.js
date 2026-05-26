const express = require("express");
const controller = require("../controllers/chatController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/", protect, controller.getMyConversations);
router.get("/:requestId", protect, controller.getConversationByRequest);
router.post("/:requestId/messages", protect, controller.sendMessage);

module.exports = router;
