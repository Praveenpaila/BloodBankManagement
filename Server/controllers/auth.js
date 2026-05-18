const UserModel = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");

const otpStore = {};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendOtp = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Provide email and phone number",
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

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"BloodLink" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "BloodLink OTP",
      html: `
        <div>
          <h2>Your OTP is ${otp}</h2>
          <p>OTP expires in 5 minutes</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to email",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Error sending OTP",
    });
  }
};

const verifyOtpInternal = (email, otp) => {
  const record = otpStore[email];

  if (!record) {
    return false;
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return false;
  }

  if (record.otp !== String(otp)) {
    return false;
  }

  delete otpStore[email];

  return true;
};

exports.signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      dob,
      bloodGroup,
      password,
      gender,
      city,
      emergencyContact,
      age,
      otp,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !dob ||
      !bloodGroup ||
      !password ||
      !gender ||
      !city ||
      !emergencyContact ||
      !age ||
      !otp
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter all details",
      });
    }

    const isOtpValid = verifyOtpInternal(email, otp);

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

    const user = await UserModel.create({
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
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      message: "Signup successful",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Error during signup",
    });
  }
};

exports.Login = async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;

    if (!password || (!email && !phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Enter all details",
      });
    }

    const user = phoneNumber
      ? await UserModel.findOne({ phoneNumber })
      : await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      message: "Login successful",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Error during login",
    });
  }
};
