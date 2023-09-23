const catchAsyncErrors = require("./catchAsyncErrors");
const ErrorHander = require("../utils/errorhander");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return next(new ErrorHander("Login first to access this resource", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id);
  next();
});

exports.isAuthenticatedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      console.log(req.user);
      return next(
        new ErrorHander(
          `Role (${req.user.role}) is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};
