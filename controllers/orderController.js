const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const ErrorHander = require("../utils/errorhander");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

exports.newOrder = catchAsyncErrors(async (req, res, next) => {
  try {
    const { orderItems, totalPrice, vendor } = req.body;

    const order = await Order.create({
      orderItems,
      totalPrice,
      vendor,
      user: req.user._id,
    });

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(
      new ErrorHander("An error occurred while creating the order", 400)
    );
  }
});

// getOrder  = > /orders

exports.getOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    orders,
  });
});

// getSingleOrder  = > /orders/:id

exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!order) {
    return next(new ErrorHander("No Order found with this ID", 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// getAllOrders of single user => /Orders

exports.getOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id });

  res.status(200).json({
    success: true,
    orders,
  });
});

// get All Order

exports.getAllOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find();

  let totalAmount = 0;

  orders.forEach((order) => {
    totalAmount += order.totalPrice;
  });

  res.status(200).json({
    success: true,
    totalAmount,
    orders,
  });
});

// update / process order - ADMIN  => /orders/:id

exports.updateOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (order.orderStatus === "Delivered") {
    return next(new ErrorHander("You have already delivered this order", 400));
  }

  order.orderItems.forEach(async (item) => {
    await updateStock(item.product, item.quantity);
  });

  order.orderStatus = req.body.status;
  order.deliveredAt = Date.now();

  await order.save();

  res.status(200).json({
    success: true,
  });
});

// exports.getActiveOrdersByVendor = catchAsyncErrors(async (req, res, next) => {
//   const orders = await Order.find({
//     vendor: req.user.id,
//     paymentStatus: "paid",
//     "orderItems.status": { $nin: ["delivered", "rejected"] },
//   }).populate("user", "name email");
//   const orderItem = [];

//   for (const order of orders) {
//     for (const element of order.orderItems) {
//       orderItem.push({
//         id: order._id,
//         itemId: element.product,
//         itemName: element.name,
//         itemImage: element.image,
//         itemPrice: element.price,
//         itemQuantity: element.quantity,
//         itemTotal: order.totalPrice,
//         customerName: order.user.name,
//         paymentStatus: order.paymentStatus,
//         productStatus: element.status,
//       });
//     }
//   }

//   res.status(200).json({ orderItem });

//   // res.status(200).json({
//   //   success: true,
//   //   order: orders,
//   // });
// });

exports.getActiveOrdersByUser = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({
    user: req.user.id,
    paymentStatus: "paid",
  }).populate("vendor", "name email");

  let orderItemsList = [];

  for (const order of orders) {
    for (const element of order.orderItems) {
      const {
        _id: id,
        product: itemId,
        name: itemName,
        image: itemImage,
        price: itemPrice,
        quantity: itemQuantity,
        status: productStatus,
      } = element;

      if (productStatus !== "rejected" && productStatus !== "delivered") {
        orderItemsList.push({
          id,
          itemId,
          itemName,
          itemImage,
          itemPrice,
          itemQuantity,
          itemTotal: order.totalPrice,
          vendorName: order.vendor.name,
          paymentStatus: order.paymentStatus,
          orderedAt: order.createdAt,
          productStatus,
        });
      }
    }
  }

  // console.log(orderItemsList);

  res.status(200).json({ orderItems: orderItemsList.reverse() });
});

exports.getPreviousOrdersByUser = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({
    user: req.user.id,
    paymentStatus: "paid",
  }).populate("vendor", "name email");

  let orderItemsList = [];

  for (const order of orders) {
    for (const element of order.orderItems) {
      const {
        _id: id,
        product: itemId,
        name: itemName,
        image: itemImage,
        price: itemPrice,
        quantity: itemQuantity,
        status: productStatus,
      } = element;

      if (productStatus === "delivered" || productStatus === "rejected") {
        orderItemsList.push({
          id,
          itemId,
          itemName,
          itemImage,
          itemPrice,
          itemQuantity,
          itemTotal: order.totalPrice,
          vendorName: order.vendor.name,
          paymentStatus: order.paymentStatus,
          orderedAt: order.createdAt,
          productStatus,
        });
      }
    }
  }

  res.status(200).json({ orderItems: orderItemsList.reverse() });
});

exports.getActiveOrdersByVendor = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({
    vendor: req.user.id,
    paymentStatus: "paid",
  }).populate("user", "name email");

  let orderItemsList = [];

  for (const order of orders) {
    for (const element of order.orderItems) {
      const {
        _id: id,
        product: itemId,
        name: itemName,
        image: itemImage,
        price: itemPrice,
        quantity: itemQuantity,
        status: productStatus,
      } = element;

      if (productStatus !== "delivered" && productStatus !== "rejected") {
        orderItemsList.push({
          id,
          itemId,
          itemName,
          itemImage,
          itemPrice,
          itemQuantity,
          itemTotal: order.totalPrice,
          customerName: order.user.name,
          paymentStatus: order.paymentStatus,
          orderedAt: order.createdAt,
          productStatus,
        });
      }
    }
  }

  res.status(200).json({ orderItems: orderItemsList.reverse() });
});

exports.getPreviousOrdersByVendor = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({
    vendor: req.user.id,
    paymentStatus: "paid", // Use $nin to check for not in an array
  }).populate("user", "name email");

  let orderItemsList = [];

  for (const order of orders) {
    for (const element of order.orderItems) {
      const {
        _id: id,
        product: itemId,
        name: itemName,
        image: itemImage,
        price: itemPrice,
        quantity: itemQuantity,
        status: productStatus,
      } = element;

      if (productStatus === "delivered" || productStatus === "rejected") {
        orderItemsList.push({
          id,
          itemId,
          itemName,
          itemImage,
          itemPrice,
          itemQuantity,
          itemTotal: order.totalPrice,
          customerName: order.user.name,
          paymentStatus: order.paymentStatus,
          orderedAt: order.createdAt,
          productStatus,
        });
      }
    }
  }

  res.status(200).json({ orderItems: orderItemsList.reverse() });
});

exports.getAllOrdersByVendor = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({
    vendor: req.user.id,
    paymentStatus: "paid", // Use $nin to check for not in an array
  }).populate("user", "name email");

  let orderItemsList = [];

  for (const order of orders) {
    for (const element of order.orderItems) {
      const {
        _id: id,
        product: itemId,
        name: itemName,
        image: itemImage,
        price: itemPrice,
        quantity: itemQuantity,
        status: productStatus,
      } = element;

      orderItemsList.push({
        id,
        itemId,
        itemName,
        itemImage,
        itemPrice,
        itemQuantity,
        itemTotal: order.totalPrice,
        customerName: order.user.name,
        paymentStatus: order.paymentStatus,
        orderedAt: order.createdAt,
        productStatus,
      });
    }
  }

  res.status(200).json({ orderItems: orderItemsList.reverse() });
});

exports.updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const { orderStatus } = req.body;

  const order = await Order.findOneAndUpdate(
    { "orderItems._id": req.body.orderItemId },
    { $set: { "orderItems.$.status": orderStatus } },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.status(200).json({
    success: true,
    order: order,
  });
});
