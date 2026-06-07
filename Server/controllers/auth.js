const UserModel = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const otpStore = {};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "10d",
  });
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
  port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  family: 4,
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

const isEmailConfigured = () =>
  process.env.EMAIL_ENABLED !== "false" &&
  (Boolean(process.env.RESEND_API_KEY) ||
    (Boolean(process.env.SMTP_HOST || process.env.EMAIL_HOST) &&
      Boolean(process.env.SMTP_USER || process.env.EMAIL_USER) &&
      Boolean(process.env.SMTP_PASS || process.env.EMAIL_PASS)));

const canExposeDevCode = () => process.env.NODE_ENV === "development";

const getEmailFrom = () =>
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  `"BloodLink" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`;

const sendEmail = async ({ to, subject, text, html }) => {
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Email API failed (${response.status}): ${body.slice(0, 300)}`);
    }

    return response.json();
  }

  return transporter.sendMail({
    from: getEmailFrom(),
    to,
    subject,
    text,
    html,
  });
};

const getEmailErrorMessage = (err) => {
  if (err.code === "EAUTH") {
    return "Email authentication failed. Check the SMTP username and app password.";
  }

  if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "ENETUNREACH"].includes(err.code)) {
    return "Email service connection failed. Check SMTP_HOST, SMTP_PORT, SMTP_SECURE and whether the hosting provider can reach your SMTP server.";
  }

  return err.message || "Error sending email";
};

const normalizeContactData = ({ email, phoneNumber }) => ({
  email: email?.trim().toLowerCase(),
  phoneNumber: phoneNumber?.trim(),
});

const publicUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  return data;
};

const sendToken = (res, statusCode, user, message) => {
  const token = generateToken(user._id, user.role);

  return res.status(statusCode).json({
    success: true,
    token,
    user: publicUser(user),
    message,
  });
};

exports.sendOtp = async (req, res) => {
  try {
    const { email, phoneNumber } = normalizeContactData(req.body);

    if (!email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Provide email and phone number",
      });
    }

    const existingUser = await UserModel.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser?.isVerified) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    otpStore[email] = {
      otp,
      phoneNumber,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    if (isEmailConfigured()) {
      await sendEmail({
        to: email,
        subject: "BloodLink OTP",
        text: `Your BloodLink OTP is ${otp}. It expires in 5 minutes.`,
        html: `<div><h2>Your OTP is ${otp}</h2><p>OTP expires in 5 minutes</p></div>`,
      });
    } else if (!canExposeDevCode()) {
      return res.status(500).json({
        success: false,
        message: "Email service is not configured. Add SMTP_HOST, SMTP_USER and EMAIL_PASS/SMTP_PASS.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: canExposeDevCode() ? { otp } : undefined,
    });
  } catch (err) {
    console.error("OTP email error:", err);
    return res.status(500).json({
      success: false,
      message: getEmailErrorMessage(err),
    });
  }
};

exports.resendOtp = exports.sendOtp;

const verifyOtpInternal = (email, phoneNumber, otp) => {
  const record = otpStore[email];

  if (!record) {
    return process.env.NODE_ENV === "development" && String(otp) === "123456";
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return false;
  }

  if (record.phoneNumber !== phoneNumber || record.otp !== String(otp)) {
    return false;
  }

  delete otpStore[email];
  return true;
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, phoneNumber } = normalizeContactData(req.body);
    const { otp } = req.body;

    if (!email || !phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Provide email, phone number and OTP",
      });
    }

    const isValid = verifyOtpInternal(email, phoneNumber, otp);

    return res.status(isValid ? 200 : 400).json({
      success: isValid,
      message: isValid ? "OTP verified" : "Invalid or expired OTP",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error verifying OTP",
    });
  }
};

exports.signup = async (req, res) => {
  try {
    const normalizedContact = normalizeContactData(req.body);
    const {
      firstName,
      lastName = "",
      dob,
      bloodGroup,
      password,
      gender,
      city,
      emergencyContact,
      age,
      otp,
      role = "donor",
      registrationNumber,
      address,
      hospitalName,
      pincode,
      licenseNumber,
    } = req.body;
    const { email, phoneNumber } = normalizedContact;

    if (!firstName || !email || !phoneNumber || !password || !city || !otp) {
      return res.status(400).json({
        success: false,
        message: "Enter all required details",
      });
    }

    if (role === "donor" && (!dob || !bloodGroup || !gender || !emergencyContact || !age)) {
      return res.status(400).json({
        success: false,
        message: "Enter all donor details",
      });
    }

    const isOtpValid = verifyOtpInternal(email, phoneNumber, otp);

    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const existingUser = await UserModel.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    const createdUser = await UserModel.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      dob,
      bloodGroup,
      password: hashedPass,
      gender,
      city,
      emergencyContact,
      age,
      role,
      registrationNumber,
      address,
      hospitalName,
      pincode,
      licenseNumber,
      isVerified: true,
      isApproved: role !== "hospital",
    });

    return sendToken(res, 201, createdUser, "Signup successful");
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error during signup",
    });
  }
};

exports.Login = async (req, res) => {
  try {
    const { email, phoneNumber } = normalizeContactData(req.body);
    const { password } = req.body;

    if (!password || (!email && !phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Enter all details",
      });
    }

    const user = phoneNumber
      ? await UserModel.findOne({ phoneNumber })
      : await UserModel.findOne({ email });

    if (!user || user.isVerified === false) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: user.suspensionReason
          ? `Account suspended. Reason: ${user.suspensionReason}`
          : "Account suspended",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    return sendToken(res, 200, user, "Login successful");
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error during login",
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching profile",
    });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const allowedFields = [
      "firstName",
      "lastName",
      "phoneNumber",
      "city",
      "bloodGroup",
      "address",
      "hospitalName",
      "pincode",
      "licenseNumber",
      "registrationNumber",
    ];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await UserModel.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).json({
      success: true,
      data: user,
      message: "Profile updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error updating profile",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = normalizeContactData(req.body);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Provide email",
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const token = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    user.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    if (isEmailConfigured()) {
      await sendEmail({
        to: email,
        subject: "BloodLink password reset",
        text: `Your BloodLink reset code is ${token}. It expires in 10 minutes.`,
        html: `<div><h2>Your reset code is ${token}</h2><p>This code expires in 10 minutes.</p></div>`,
      });
    } else if (!canExposeDevCode()) {
      return res.status(500).json({
        success: false,
        message: "Email service is not configured. Add SMTP_HOST, SMTP_USER and EMAIL_PASS/SMTP_PASS.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset code sent",
      data: canExposeDevCode() ? { token } : undefined,
    });
  } catch (err) {
    console.error("Password reset email error:", err);
    return res.status(500).json({
      success: false,
      message: getEmailErrorMessage(err),
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Provide reset token and new password",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");
    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error resetting password",
    });
  }
};

exports.generateToken = generateToken;
exports.transporter = transporter;
