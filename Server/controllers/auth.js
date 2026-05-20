const UserModel = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");

const otpStore = {};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "10d",
  });
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
  port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
  },
});

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

    if ((process.env.EMAIL_USER || process.env.SMTP_USER) && (process.env.EMAIL_PASS || process.env.SMTP_PASS)) {
      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          `"BloodLink" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: email,
        subject: "BloodLink OTP",
        html: `<div><h2>Your OTP is ${otp}</h2><p>OTP expires in 5 minutes</p></div>`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: process.env.NODE_ENV === "development" ? { otp } : undefined,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error sending OTP",
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
        message: "Account suspended",
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
    const allowedFields = ["firstName", "lastName", "phoneNumber", "city", "bloodGroup", "address"];
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

exports.generateToken = generateToken;
exports.transporter = transporter;
