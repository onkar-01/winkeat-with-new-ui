const express = require("express");
const {
  isAuthenticatedUser,
  isAuthenticatedRoles,
} = require("../middleware/auth");
const {
  newOrder,
  getSingleOrder,
  getOrders,
  getActiveOrdersByVendor,
  getPreviousOrdersByVendor,
  updateOrderStatus,
  getAllOrdersByVendor,
  getActiveOrdersByUser,
  getPreviousOrdersByUser,
} = require("../controllers/orderController");
const router = express.Router();

router.route("/order/new").post(isAuthenticatedUser, newOrder);

router.route("/order/:id").get(isAuthenticatedUser, getSingleOrder);

router.route("/orders/me").get(isAuthenticatedUser, getOrders);

router
  .route("/user/orders/active")
  .get(isAuthenticatedUser, getActiveOrdersByUser);

router
  .route("/user/orders/previous")
  .get(isAuthenticatedUser, getPreviousOrdersByUser);

router
  .route("/orders/active")
  .get(
    isAuthenticatedUser,
    isAuthenticatedRoles("vendor"),
    getActiveOrdersByVendor
  );
router
  .route("/orders/previous")
  .get(
    isAuthenticatedUser,
    isAuthenticatedRoles("vendor"),
    getPreviousOrdersByVendor
  );
router
  .route("/orders/all")
  .get(
    isAuthenticatedUser,
    isAuthenticatedRoles("vendor"),
    getAllOrdersByVendor
  );
router
  .route("/orders/update-order-status")
  .post(isAuthenticatedUser, isAuthenticatedRoles("vendor"), updateOrderStatus);

module.exports = router;
