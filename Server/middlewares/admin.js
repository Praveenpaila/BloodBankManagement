exports.admin = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }
    if (user.role === "admin") {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Admin only",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error occurred at admin middleware",
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    return next();
  };
};
