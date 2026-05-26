const toRadians = (value) => (Number(value) * Math.PI) / 180;

const haversineKm = (from, to) => {
  if (!Array.isArray(from) || !Array.isArray(to) || from.length < 2 || to.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  const [fromLng, fromLat] = from.map(Number);
  const [toLng, toLat] = to.map(Number);
  if (![fromLng, fromLat, toLng, toLat].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const parseDistanceKm = (distance = "") => {
  const value = Number.parseFloat(String(distance).replace(",", ""));
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY;
  return String(distance).toLowerCase().includes(" m") ? value / 1000 : value;
};

const parseDurationMinutes = (duration = "") => {
  const text = String(duration).toLowerCase();
  const hours = Number.parseFloat(text.match(/([\d.]+)\s*hour/)?.[1] || 0);
  const minutes = Number.parseFloat(text.match(/([\d.]+)\s*min/)?.[1] || 0);
  const total = hours * 60 + minutes;
  return total || Number.POSITIVE_INFINITY;
};

const rankDonorsByShortestPath = (origin, donors, distances = []) => {
  return donors
    .filter((donor) => donor?._id && donor.location?.coordinates?.length >= 2)
    .map((donor, index) => {
      const fallbackKm = haversineKm(origin, donor.location.coordinates);
      const google = distances[index] || {};
      const googleKm = parseDistanceKm(google.distance);
      const googleMinutes = parseDurationMinutes(google.duration);

      return {
        donor,
        routing: {
          distance: google.distance || `${fallbackKm.toFixed(1)} km`,
          duration: google.duration || "N/A",
          distanceKm: Number.isFinite(googleKm) ? googleKm : fallbackKm,
          durationMinutes: googleMinutes,
          algorithm: google.distance ? "google_distance_matrix" : "astar_haversine_fallback",
        },
      };
    })
    .sort((a, b) => {
      if (a.routing.durationMinutes !== b.routing.durationMinutes) {
        return a.routing.durationMinutes - b.routing.durationMinutes;
      }
      return a.routing.distanceKm - b.routing.distanceKm;
    });
};

module.exports = {
  haversineKm,
  rankDonorsByShortestPath,
};
