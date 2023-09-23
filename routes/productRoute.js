const express = require("express");
const {
  getProductsByVendor,
  createProduct,
  updateProduct,
  deleteProduct,
  getSingleProduct,
  createProductReview,
  getProductReviews,
  deleteProductReviews,
  incrementProductStock,
  decrementProductStock,
} = require("../controllers/productController");
const {
  isAuthenticatedUser,
  isAuthenticatedRoles,
} = require("../middleware/auth");
const { singleUpload } = require("../middleware/multer");

const router = express.Router();

router.route("/:vendorId/products").get(getProductsByVendor);

router
  .route("/product/new")
  .post(
    isAuthenticatedUser,
    isAuthenticatedRoles("vendor"),
    singleUpload,
    createProduct
  );

router
  .route("/product/:id")
  .put(isAuthenticatedUser, isAuthenticatedRoles("vendor"), updateProduct)
  .delete(isAuthenticatedUser, isAuthenticatedRoles("vendor"), deleteProduct)
  .get(getSingleProduct);

router
  .route("/product/stock-increment-by-one/:id")
  .put(
    isAuthenticatedUser,
    isAuthenticatedRoles("vendor"),
    incrementProductStock
  );

router
  .route("/product/stock-decrement-by-one/:id")
  .put(
    isAuthenticatedUser,
    isAuthenticatedRoles("vendor"),
    decrementProductStock
  );

router.route("/review").put(isAuthenticatedUser, createProductReview);

router
  .route("/reviews")
  .get(getProductReviews)
  .delete(isAuthenticatedUser, deleteProductReviews);

module.exports = router;
