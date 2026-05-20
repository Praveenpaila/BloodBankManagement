const express = require("express");
const controller = require("../controllers/hospitalController");

const router = express.Router();

router.get("/list", controller.listHospitals);

module.exports = router;
