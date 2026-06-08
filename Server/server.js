const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
require("dotenv").config({ path: path.resolve(__dirname, ".env"), override: true });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const http = require("http");
const { initRealtime } = require("./utils/realtime");

const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT || 3000;
const server = http.createServer(app);
initRealtime(server);

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  ["body", "params", "headers"].forEach((key) => {
    if (req[key]) {
      mongoSanitize.sanitize(req[key]);
    }
  });
  next();
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/eligibility", require("./routes/eligibilityRoutes"));
app.use("/api/loyalty", require("./routes/loyaltyRoutes"));
app.use("/api/donations", require("./routes/donationRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/blood-finder", require("./routes/bloodFinderRoutes"));
app.use("/api/blood-requests", require("./routes/bloodRequestRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/push", require("./routes/pushRoutes"));
app.use("/api/donors", require("./routes/donorRoutes"));
app.use("/api/hospitals", require("./routes/hospitalRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/chats", require("./routes/chatRoutes"));

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "BloodLink API is running" });
});

require("./utils/cronJobs");

const mongoURI =
  process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/bloodbank";

mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

server.listen(port, () => {
  console.log(`Server is running successfully on port ${port}`);
});
