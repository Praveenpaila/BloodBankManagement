const express = require("express");

const controller = require("../controllers/auth");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.post("/signup", controller.signup);

router.post("/login", controller.Login);

router.post("/sendOtp", controller.sendOtp);
router.post("/send-otp", controller.sendOtp);

router.post("/resendOtp", controller.resendOtp);
router.post("/resend-otp", controller.resendOtp);

router.post("/verify-otp", controller.verifyOtp);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.get("/me", protect, controller.getMe);
router.put("/me", protect, controller.updateMe);

module.exports = router;
