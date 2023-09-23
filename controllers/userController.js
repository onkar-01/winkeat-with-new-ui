const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const User = require("../models/userModel");
const sendToken = require("../utils/jwttoken");
const ErrorHander = require("../utils/errorhander");
const { sendEmail } = require("../utils/mailer");
const crypto = require("crypto");
const { isAsyncFunction } = require("util/types");
const { getDataUri } = require("../utils/datauri");
const cloudinary = require("cloudinary").v2;

// Register a user => /api/v1/register

exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body;
  // const image = req.files.image;
  // console.log(req.file);

  const image = req.file;
  // console.log(image);

  const imageUri = getDataUri(image);

  // console.log(imageUri);

  // check for parameter file and body
  if (!req.body) {
    return next(new ErrorHander("Please enter all fields", 400));
  }

  // check for image
  if (!image) {
    return next(new ErrorHander("Please upload an image", 400));
  }

  const result = await cloudinary.uploader.upload(
    imageUri.content,
    {
      folder: "winkeat/users",
      transformation: { width: 300, height: 300, crop: "limit" },
    },
    (err, result) => {
      if (err) {
        return next(
          new ErrorHander("Something went wrong while uploading image", 500)
        );
      }
    }
  );

  const user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id: result.public_id,
      url: result.secure_url,
    },
  });
  const savedUser = await user.save();
  console.log(savedUser);

  //send verification email
  await sendEmail({ email, emailType: "VERIFY", userId: savedUser._id });

  sendToken(user, 200, res);
});

exports.verifyEmail = catchAsyncErrors(async (req, res, next) => {
  try {
    const { token } = req.body;
    console.log(token);

    const user = await User.findOne({
      verifyToken: token,
      verifyTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorHander("Invalid token", 400));
    }
    console.log(user);

    user.isVerfied = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    return res.json({
      message: "Email verified successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Login User => /api/v1/login

exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  // check if email and password is entered by user
  if (!email || !password) {
    return next(new ErrorHander("Please enter email and password", 400));
  }

  // finding user in database

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHander("Invalid email or password", 401));
  }

  // check if password is correct or not

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new ErrorHander("Invalid email or password", 401));
  }

  sendToken(user, 200, res);
});

// logout User

exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "Logged out",
  });
});

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Check if the user with the provided email exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send a password reset email with a link that includes the resetToken

    await sendEmail({
      email: user.email,
      emailType: "RESET",
      userId: user._id,
    });

    res.status(200).json({ message: "Password reset email sent successfully" });
  } catch (error) {
    next(error);
  }
};
// Reset Password => /api/v1/password/reset/:token

exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const token = req.body.token;
  // Hash URL token

  const user = await User.findOne({
    forgotPasswordToken: token,
    forgotPasswordTokenExpiry: { $gt: Date.now() },
  });

  console.log(user);

  if (!user) {
    return next(
      new ErrorHander(
        "Password reset token is invalid or has been expired",
        400
      )
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHander("Password does not match", 400));
  }

  // Setup new password

  user.password = req.body.password;

  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;

  await user.save();

  sendToken(user, 200, res);
});

// Get User Detail

exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

// Update Password => /api/v1/password/update

exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  // check previous user password

  const isMatched = await user.comparePassword(req.body.oldPassword);

  if (!isMatched) {
    return next(new ErrorHander("Old password is incorrect", 400));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHander("Password does not match", 400));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendToken(user, 200, res);
});

// Update User Profile => /api/v1/me/update

exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  // Update avatar: TODO

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

// Get all users => /api/v1/admin/users

exports.getallUsers = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

// Get user details => /api/v1/admin/user/:id

exports.getUserDetailsAdmin = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    next(new ErrorHander("User not found with this id", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// Update user profile => /api/v1/admin/user/:id

exports.updateUserByAdmin = catchAsyncErrors(async (req, res, next) => {
  newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  if (!user) {
    next(new ErrorHander("User not found with this id", 404));
  }

  res.status(200).json({
    success: true,
  });
});

// Delete user => /api/v1/admin/user/:id

exports.deleteUserByAdmin = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    next(new ErrorHander("User not found with this id", 404));
  }

  // Remove avatar from cloudinary

  // const image_id = user.avatar.public_id;

  // await cloudinary.v2.uploader.destroy(image_id)

  await User.findOneAndDelete({ _id: req.params.id });

  res.status(200).json({
    success: true,
    message: "User removed Sucessfully",
  });
});

// Get ALL Vendor

exports.getAllVendors = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find({ role: "vendor" });

  res.status(200).json({
    success: true,
    users,
  });
});
