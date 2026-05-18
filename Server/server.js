require("dotenv").config({ path: "../.env" });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/auth"));

const mongoURI = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/bloodbank";
mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(port, () => {
  console.log(`Server is running successfully on port ${port}`);
});
