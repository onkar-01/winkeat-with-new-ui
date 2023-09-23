const dotenv = require("dotenv");
const crypto = require("crypto");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHander = require("../utils/errorhander");
const User = require("../models/userModel");
const Payment = require("../models/paymentModel");
const Order = require("../models/orderModel");
const shortid = require("shortid");
const Razorpay = require("razorpay");

dotenv.config({ path: "./config.env" });

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.checkout = catchAsyncErrors(async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return next(new ErrorHander("Invalid amount", 400));
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in cents
      currency: "INR",
      receipt: shortid.generate(),
      payment_capture: 1,
    };

    const order = await instance.orders.create(options);

    res.status(200).json({
      status: true,
      order,
    });
  } catch (error) {
    // Handle any errors that might occur during order creation or processing
    console.error("Checkout Error:", error);
    return next(new ErrorHander("An error occurred during checkout", 500));
  }
});

exports.paymentverification = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Create the expected signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    console.log("Received Signature:", razorpay_signature);
    console.log("Generated Signature:", expectedSignature);

    // Check if the received signature matches the expected signature
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Check if the payment has already been processed
      const existingPayment = await Payment.findOne({
        razorpay_order_id,
        razorpay_payment_id,
      });

      if (existingPayment) {
        // Payment is already processed
        return res.status(400).json({
          status: false,
          message: "Payment already processed",
        });
      }

      // Save payment details to the database
      const payment = new Payment({
        user: req.user._id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });
      await payment.save();

      // Update the order's payment status
      const updatedOrder = await Order.findOneAndUpdate(
        {
          user: req.user._id,
          paymentStatus: "pending",
        },
        {
          paymentStatus: "paid",
        }
      );

      if (!updatedOrder) {
        // Handle the case where the order could not be updated
        return res.status(500).json({
          status: false,
          message: "Failed to update order status",
        });
      }

      // Redirect to the success page
      res.redirect(
        `http://localhost:5173/success?razorpay_order_id=${razorpay_order_id}&razorpay_payment_id=${razorpay_payment_id}&razorpay_signature=${razorpay_signature}`
      );
    } else {
      // Payment failed
      res.status(400).json({
        status: false,
        message: "Payment failed",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
exports.getApi = (req, res) => {
  res.status(200).json({
    key: process.env.RAZORPAY_KEY_ID,
  });
};
