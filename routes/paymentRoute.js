const express = require("express");
const router = express.Router();
const {
  isAuthenticatedUser,
  isAuthenticatedRoles,
} = require("../middleware/auth");
const {
  getApi,
  checkout,
  paymentverification,
} = require("../controllers/paymentController");

router.route("/get-razorpay-api-key").get(isAuthenticatedUser, getApi);
router.route("/checkout").post(isAuthenticatedUser, checkout);
router
  .route("/paymentverification")
  .post(isAuthenticatedUser, paymentverification);

module.exports = router;
