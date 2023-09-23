const express = require("express");
const cloudinary = require("cloudinary").v2;
const multer = require("multer").v2;

const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const {
  registerUser,
  loginUser,
  logout,
  forgotPassword,
  resetPassword,
  getUserDetails,
  updatePassword,
  updateProfile,
  getUserDetailsAdmin,
  getallUsers,
  updateUserByAdmin,
  deleteUserByAdmin,
  getAllVendors,
  verifyEmail,
} = require("../controllers/userController");
const {
  isAuthenticatedUser,
  isAuthenticatedRoles,
} = require("../middleware/auth");
const { singleUpload } = require("../middleware/multer");
const router = express.Router();

router.route("/register").post(singleUpload, registerUser);
router.route("/verifyemail").post(verifyEmail);
router.route("/login").post(loginUser);
router.route("/logout").get(logout);
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset").put(resetPassword);
router.route("/me").get(isAuthenticatedUser, getUserDetails);
router.route("/password/update").put(isAuthenticatedUser, updatePassword);
router.route("/me/update").put(isAuthenticatedUser, updateProfile);

// Admin Routes

router
  .route("/admin/users")
  .get(isAuthenticatedUser, isAuthenticatedRoles("admin"), getallUsers);

router
  .route("/admin/user/:id")
  .get(isAuthenticatedUser, isAuthenticatedRoles("admin"), getUserDetailsAdmin)
  .put(isAuthenticatedUser, isAuthenticatedRoles("admin"), updateUserByAdmin)
  .delete(
    isAuthenticatedUser,
    isAuthenticatedRoles("admin"),
    deleteUserByAdmin
  );

//get  all vendor for customer
router.route("/getvendors").get(isAuthenticatedUser, getAllVendors);

router.post("/addimage", (req, res) => {
  const file = req.files.image;
  cloudinary.uploader.upload(
    file.tempFilePath,
    {
      folder: "test",
      transformation: { width: 300, height: 300, crop: "limit" },
    },
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }
  );
});

router.delete("/delete/image", (req, res) => {
  const { public_id } = req.body;
  cloudinary.uploader.destroy(public_id, (err, result) => {
    if (err) return res.json({ success: false, err });
    res.status(200).json({ success: true });
  });
});

router.get("/getimage", (req, res) => {
  cloudinary.api.resources({ type: "upload" }, (err, result) => {
    if (err) return res.json({ success: false, err });
    res.status(200).json({ success: true, result });
  });
});
module.exports = router;
