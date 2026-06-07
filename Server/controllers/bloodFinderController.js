const BloodInventory = require("../models/BloodInventory");
const UserModel = require("../models/user");
const { haversineKm, roundKm } = require("../utils/haversine");

const hasCoordinates = (user) => user?.location?.coordinates?.length >= 2;
const displayName = (user) =>
  user?.hospitalName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "BloodLink user";

exports.findBlood = async (req, res) => {
  try {
    const { bloodGroup } = req.query;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const canSortByLocation = Number.isFinite(lat) && Number.isFinite(lng);

    if (!bloodGroup) {
      return res.status(400).json({
        success: false,
        message: "Provide bloodGroup",
      });
    }

    const origin = [lng, lat];
    const inventory = await BloodInventory.find({ bloodGroup, units: { $gt: 0 } })
      .populate("hospital", "firstName lastName hospitalName phoneNumber city address location isActive isApproved updatedAt")
      .sort({ units: -1 });

    const hospitalMap = new Map();
    inventory.forEach((item) => {
      const hospital = item.hospital;
      if (!hospital?._id || hospital.isActive === false) return;
      const distance = canSortByLocation && hasCoordinates(hospital)
        ? haversineKm(origin, hospital.location.coordinates)
        : Number.POSITIVE_INFINITY;

      const key = String(hospital._id);
      const current = hospitalMap.get(key);
      const units = Number(item.units) || 0;
      if (current) {
        current.units += units;
      } else {
        hospitalMap.set(key, {
          _id: hospital._id,
          name: displayName(hospital),
          city: hospital.city,
          address: hospital.address,
          phoneNumber: hospital.phoneNumber,
          bloodGroup,
          units,
          distanceKm: Number.isFinite(distance) ? roundKm(distance) : null,
          location: hospital.location,
          lastAddressUpdated: hospital.updatedAt,
        });
      }
    });

    const donors = await UserModel.find({
      role: "donor",
      bloodGroup,
      isActive: true,
      isEligible: true,
    }).select("firstName lastName phoneNumber city address bloodGroup location updatedAt");

    const nearbyDonors = donors
      .map((donor) => {
        const distance = canSortByLocation && hasCoordinates(donor)
          ? haversineKm(origin, donor.location.coordinates)
          : Number.POSITIVE_INFINITY;
        return {
          _id: donor._id,
          name: displayName(donor),
          city: donor.city,
          address: donor.address,
          phoneNumber: donor.phoneNumber,
          bloodGroup: donor.bloodGroup,
          distanceKm: Number.isFinite(distance) ? roundKm(distance) : null,
          location: donor.location,
          lastAddressUpdated: donor.updatedAt,
        };
      })
      .sort((a, b) => Number(a.distanceKm ?? Infinity) - Number(b.distanceKm ?? Infinity));

    return res.status(200).json({
      success: true,
      data: {
        hospitals: Array.from(hospitalMap.values()).sort((a, b) => a.distanceKm - b.distanceKm),
        donors: nearbyDonors,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Error finding blood nearby",
    });
  }
};
