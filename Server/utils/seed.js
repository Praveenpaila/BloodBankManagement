require("dotenv").config({ path: "../.env" });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserModel = require("../models/user");
const BloodInventory = require("../models/BloodInventory");
const BloodRequest = require("../models/BloodRequest");
const Notification = require("../models/Notification");
const EligibilityRecord = require("../models/EligibilityRecord");
const DonationHistory = require("../models/DonationHistory");
const LoyaltyRecord = require("../models/LoyaltyRecord");
const Appointment = require("../models/Appointment");

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const hashPassword = (password) => bcrypt.hash(password, 10);

const createUser = async (data, password) => {
  return UserModel.create({
    ...data,
    password: await hashPassword(password),
    isActive: true,
    isVerified: true,
  });
};

const seed = async () => {
  const mongoURI =
    process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/bloodbank";

  await mongoose.connect(mongoURI);

  await Promise.all([
    UserModel.deleteMany({}),
    BloodInventory.deleteMany({}),
    BloodRequest.deleteMany({}),
    Notification.deleteMany({}),
    EligibilityRecord.deleteMany({}),
    DonationHistory.deleteMany({}),
    LoyaltyRecord.deleteMany({}),
    Appointment.deleteMany({}),
  ]);

  await createUser(
    {
      email: "admin@bloodlink.com",
      role: "admin",
      firstName: "Super",
      lastName: "Admin",
      phoneNumber: "9000000000",
      city: "Vijayawada",
      isApproved: true,
    },
    "Admin@123",
  );

  const donors = await Promise.all([
    createUser(
      {
        firstName: "Ravi",
        lastName: "Kumar",
        email: "ravi@bloodlink.com",
        phoneNumber: "9000000001",
        city: "Vijayawada",
        role: "donor",
        bloodGroup: "O+",
        gender: "male",
        age: 30,
        dob: "1996-01-01",
        emergencyContact: "9000001001",
        isEligible: true,
        totalDonations: 6,
        points: 800,
        badges: ["First Drop", "Life Saver"],
        location: { type: "Point", coordinates: [80.648, 16.5062] },
        isApproved: true,
      },
      "Donor@123",
    ),
    createUser(
      {
        firstName: "Priya",
        lastName: "Sharma",
        email: "priya@bloodlink.com",
        phoneNumber: "9000000002",
        city: "Vijayawada",
        role: "donor",
        bloodGroup: "A+",
        gender: "female",
        age: 25,
        dob: "2001-02-01",
        emergencyContact: "9000001002",
        isEligible: true,
        totalDonations: 1,
        points: 100,
        badges: ["First Drop"],
        location: { type: "Point", coordinates: [80.638, 16.515] },
        isApproved: true,
      },
      "Donor@123",
    ),
    createUser(
      {
        firstName: "Arjun",
        lastName: "Reddy",
        email: "arjun@bloodlink.com",
        phoneNumber: "9000000003",
        city: "Vijayawada",
        role: "donor",
        bloodGroup: "B+",
        gender: "male",
        age: 28,
        dob: "1998-03-01",
        emergencyContact: "9000001003",
        isEligible: true,
        totalDonations: 11,
        points: 2200,
        badges: ["First Drop", "Life Saver", "Blood Hero"],
        location: { type: "Point", coordinates: [80.66, 16.498] },
        isApproved: true,
      },
      "Donor@123",
    ),
    createUser(
      {
        firstName: "Meena",
        lastName: "Devi",
        email: "meena@bloodlink.com",
        phoneNumber: "9000000004",
        city: "Vijayawada",
        role: "donor",
        bloodGroup: "AB-",
        gender: "female",
        age: 32,
        dob: "1994-04-01",
        emergencyContact: "9000001004",
        isEligible: true,
        totalDonations: 3,
        points: 600,
        badges: ["First Drop", "Rare Type"],
        location: { type: "Point", coordinates: [80.62, 16.53] },
        isApproved: true,
      },
      "Donor@123",
    ),
    createUser(
      {
        firstName: "Suresh",
        lastName: "Babu",
        email: "suresh@bloodlink.com",
        phoneNumber: "9000000005",
        city: "Vijayawada",
        role: "donor",
        bloodGroup: "O-",
        gender: "male",
        age: 35,
        dob: "1991-05-01",
        emergencyContact: "9000001005",
        isEligible: true,
        totalDonations: 0,
        points: 0,
        badges: [],
        location: { type: "Point", coordinates: [80.67, 16.51] },
        isApproved: true,
      },
      "Donor@123",
    ),
  ]);

  const hospitals = await Promise.all([
    createUser(
      {
        firstName: "Apollo Hospital Vijayawada",
        lastName: "",
        email: "apollo@bloodlink.com",
        phoneNumber: "9100000001",
        city: "Vijayawada",
        role: "hospital",
        isApproved: true,
        location: { type: "Point", coordinates: [80.648, 16.5062] },
      },
      "Hospital@123",
    ),
    createUser(
      {
        firstName: "KIMS Hospital",
        lastName: "",
        email: "kims@bloodlink.com",
        phoneNumber: "9100000002",
        city: "Vijayawada",
        role: "hospital",
        isApproved: true,
        location: { type: "Point", coordinates: [80.63, 16.52] },
      },
      "Hospital@123",
    ),
    createUser(
      {
        firstName: "Govt General Hospital",
        lastName: "",
        email: "ggh@bloodlink.com",
        phoneNumber: "9100000003",
        city: "Vijayawada",
        role: "hospital",
        isApproved: false,
        location: { type: "Point", coordinates: [80.66, 16.5] },
      },
      "Hospital@123",
    ),
  ]);

  const groups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
  const inventory = [];

  groups.forEach((group, index) => {
    inventory.push({
      hospital: hospitals[0]._id,
      bloodGroup: group,
      units: [12, 7, 18, 4, 22, 5, 10, 3][index],
      expiryDate: addDays(index === 1 ? 5 : index === 3 ? 6 : 20 + index),
    });
    inventory.push({
      hospital: hospitals[1]._id,
      bloodGroup: group,
      units: [9, 6, 14, 8, 16, 4, 11, 2][index],
      expiryDate: addDays(15 + index),
    });
  });

  await BloodInventory.insertMany(inventory);

  await LoyaltyRecord.insertMany(
    donors.map((donor) => ({
      donor: donor._id,
      action: "seed",
      points: donor.points,
      description: "Seeded points",
    })),
  );

  console.log("Seeding complete");
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
