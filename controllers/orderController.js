const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Earning = require("../models/earningModel");
const Wallet = require("../models/walletModel");
const ErrorHander = require("../utils/errorhander");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ApiFeatures = require("../utils/apifeatures");
const moment = require('moment-timezone');
const User = require("../models/userModel");
const ShortUniqueId = require('short-unique-id');
const Notification = require("../models/notificationModel");
const { sendEmail, sendProductStatusUpdateEmail } = require("../utils/mailer");





exports.newOrder = catchAsyncErrors(async (req, res, next) => {
  try {
    const uid = new ShortUniqueId({ length: 6, dictionary: 'number' });
    const indianDate = moment().tz('Asia/Kolkata');
    const { orderItems, totalPrice, vendor, tax } = req.body;
    console.log("date",indianDate.toDate());
    const orderid = '#'+ uid.rnd();
    console.log(orderid);
    const order = await Order.create({
      orderItems,
      totalPrice,
      vendor,
      tax,
      order_id: orderid,
      user: req.user.id,
      createdAt: indianDate.toDate(),
    });

    // Update the user's earnings
    // const earnings = await Earning.findOne({
    //   user: vendor,
    //   date: {
    //     $gte: new Date(new Date().setHours(0, 0, 0)),
    //     $lt: new Date(new Date().setHours(23, 59, 59)),
    //   },
    // });

    // if (earnings) {
    //   earnings.totalEarnings += totalPrice - tax;
    //   earnings.sales += 1;
    //   await earnings.save();
    // } else {
    //   await Earning.create({
    //     user: vendor,
    //     totalEarnings: totalPrice - tax,
    //     sales: 1,
    //     date: indianDate.toDate(),
    //   });
    // }

    // // Update the user's wallet balance
    // const wallet = await Wallet.findOne({ user: vendor,date: {
    //   $gte: new Date(new Date().setHours(0, 0, 0)),
    //   $lt: new Date(new Date().setHours(23, 59, 59)),
    // }});
    // if (wallet) {
    //   wallet.balance += totalPrice - tax;
    //   await wallet.save();
    // } else {
    //   await Wallet.create({
    //     user: vendor,
    //     balance: totalPrice - tax,
    //     date: indianDate.toDate(),
    //     widthdrawals: false,
    //   });
    // }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(new ErrorHander("An error occurred while creating the order", 400));
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

exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
  console.log(req.params.id);
  const order = await Order.findOne(
    {_id: req.params.id },
  ).populate(
    "user vendor",
    "name email"
  );
  console.log("this",order);

  if (!order) {
    return next(new ErrorHander("No Order found with this ID", 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

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
          id:order._id,
          itemId,
          order_id: order.order_id,
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
  const searchQuery = req.query.keyword || ''; // Get the search query from the request
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  const searchFilter = {
    user: req.user.id,
    paymentStatus: "paid",
  };
  if (!startDate && !endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to the beginning of the day
    startDate = today;
    endDate = new Date(today);
    endDate.setDate(today.getDate() + 1); // Set endDate to tomorrow
  }
  if (startDate) {
    searchFilter.createdAt = { $gte: new Date(startDate).setHours(0,0,0) };
  }
  if (endDate) {
    searchFilter.createdAt = {
      ...searchFilter.createdAt,
      $lt: new Date(endDate).setHours(23, 59, 59)
    };
  }

  const orders = await Order.find(searchFilter)
    .populate("vendor", "name email");

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
          id:order._id,
          itemId,
          order_id: order.order_id,
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
  orderItemsList = orderItemsList.filter((order) => {
    return order.itemName.toLowerCase().includes(searchQuery.toLowerCase());
  });
  res.status(200).json({ orderItems: orderItemsList.reverse() });
});

exports.getActiveOrdersByVendor = catchAsyncErrors(async (req, res, next) => {
  const searchQuery = req.query.keyword || ''; // Get the search query from the request
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  const searchFilter = {
    vendor: req.user.id,
    paymentStatus: "paid",
  };
  if (!startDate && !endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to the beginning of the day
    startDate = today;
    endDate = new Date(today);
    endDate.setDate(today.getDate() + 1); // Set endDate to tomorrow
  }
  if (startDate) {
    searchFilter.createdAt = { $gte: new Date(startDate).setHours(0,0,0) };
  }
  if (endDate) {
    searchFilter.createdAt = {
      ...searchFilter.createdAt,
      $lt: new Date(endDate).setHours(23, 59, 59)
    };
  }

  const orders = await Order.find(searchFilter)
    .populate("user", "name email");


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
          id:order._id,
          itemOrderId: id,
          itemId,
          order_id: order.order_id,
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
  orderItemsList = orderItemsList.filter((order) => {
    return order.order_id?.toLowerCase().includes(searchQuery.toLowerCase());
  });
  res.status(200).json({ orderItems: orderItemsList.reverse() });
});

exports.getPreviousOrdersByVendor = catchAsyncErrors(async (req, res, next) => {
  const searchQuery = req.query.keyword || ''; // Get the search query from the request
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  // Set default values for startDate and endDate if not provided
  const searchFilter = {
    vendor: req.user.id,
    paymentStatus: "paid",
  };
  if (!startDate && !endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to the beginning of the day
    startDate = today;
    endDate = new Date(today);
    endDate.setDate(today.getDate() + 1); // Set endDate to tomorrow
  }
  if (startDate) {
    searchFilter.createdAt = { $gte: new Date(startDate).setHours(0,0,0) };
  }
  if (endDate) {
    searchFilter.createdAt = {
      ...searchFilter.createdAt,
      $lt: new Date(endDate).setHours(23, 59, 59)
    };
  }

  const orders = await Order.find(searchFilter)
    .populate("user", "name email");

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
          id : order._id,
          itemOrderId: id,
          itemId,
          order_id: order.order_id,
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
  orderItemsList = orderItemsList.filter((order) => {
    return order.order_id?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  res.status(200).json({ orderItems: orderItemsList.reverse() });
});

exports.getAllOrdersByVendor = catchAsyncErrors(async (req, res, next) => {
  const searchQuery = req.query.keyword || ''; // Get the search query from the request
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  // Set default values for startDate and endDate if not provided
  if (!startDate && !endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to the beginning of the day
    startDate = today;
    endDate = new Date(today);
    endDate.setDate(today.getDate() + 1); // Set endDate to tomorrow
  }
  const user = User.findOne({email: searchQuery});
  const searchFilter = {
    vendor: req.user.id,
    paymentStatus: "paid",
  };

  // If there's a search query, add it to the filter
  // if (searchQuery) {
  //   searchFilter['user'] = { $regex: searchQuery, $options: 'i' };
  // }

  // If start date and/or end date are provided, add them to the filter
 
  if (startDate) {
    searchFilter.createdAt = { $gte: new Date(startDate).setHours(0,0,0) };
  }
  if (endDate) {
    searchFilter.createdAt = {
      ...searchFilter.createdAt,
      $lt: new Date(endDate).setHours(23, 59, 59)
    };
  }

  const orders = await Order.find(searchFilter)
    .populate("user", "name email");

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
        id : order._id,
        itemOrderId: id,
        itemId,
        order_id: order.order_id,
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

  orderItemsList = orderItemsList.filter((order) => {
    return order.order_id?.toLowerCase().includes(searchQuery.toLowerCase());
  });
  

  res.status(200).json({ 
    success: true,
    searchQuery,
    startDate,
    endDate,
    orderItems: orderItemsList.reverse(),
  });
});

exports.updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const { orderStatus } = req.body;

  const order = await Order.findOneAndUpdate(
    { "orderItems._id": req.body.orderItemId },
    { $set: { "orderItems.$.status": orderStatus } },
    { new: true }
  ).populate("user", "email");

  if (order) {
    const orderItem = order.orderItems.find((item) => item._id.toString() === req.body.orderItemId);
    const orderItemIdsString = orderItem.name;
    await sendProductStatusUpdateEmail({ email:order.user.email , product: orderItem, orderId : order.order_id });
  }

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


// exports.newOrder = catchAsyncErrors(async (req, res, next) => {
 
exports.getEarning = catchAsyncErrors(async (req, res, next) => {
  try{
    const earnings = await Earning.find({user: req.user._id});
    console.log(req.user._id);
    console.log(req.user);

    // console.log(earnings);
  } catch (error) {
    next(new ErrorHander("error while get the earning", 400));
  }
});

exports.totalSales = catchAsyncErrors(async (req, res, next) => {

  try {
    let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  // Set default values for startDate and endDate if not provided
  if (!startDate && !endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to the beginning of the day
    startDate = today;
    endDate = new Date(today);
    endDate.setDate(today.getDate() + 1); // Set endDate to tomorrow
  }
    const sales = await Earning.find({ user: req.user.id,
      date: {
        $gte: new Date(startDate).setHours(0,0,0),
        $lt: new Date(endDate).setHours(23, 59, 59),
      }
    });
    const prevDayStart = new Date(startDate);
    prevDayStart.setDate(prevDayStart.getDate() - 1);
    prevDayStart.setHours(0, 0, 0, 0);

    const prevDayEnd = new Date(startDate);
    prevDayEnd.setDate(prevDayEnd.getDate() - 1);
    prevDayEnd.setHours(23, 59, 59);

    const prevDaySales = await Earning.find({
      user: req.user._id,
      date: {
        $gte: prevDayStart,
        $lt: prevDayEnd,
      },
    });

    console.log("this day",prevDaySales);

    let previousSales = 0;
    let previousEarnings = 0;
    prevDaySales.forEach((sale) => {
      previousSales += sale.sales;
      previousEarnings += sale.totalEarnings;
    });

    let totalSales = 0;
    let totalEarnings = 0;
    // console.log(sales);
    sales.forEach((sale) => {
      totalSales += sale.sales;
      totalEarnings += sale.totalEarnings;
    });

    let salesChangePercentage = 0;
    let earningsChangePercentage = 0;

    // if (sales.length > 1) {
      if (totalSales > previousSales) {
        salesChangePercentage = ((totalSales - previousSales) / previousSales) * 100;
      } else if (totalSales < previousSales) {
        salesChangePercentage = -((previousSales - totalSales) / previousSales) * 100;
      }

      if (totalEarnings > previousEarnings) {
        earningsChangePercentage = ((totalEarnings - previousEarnings) / previousEarnings) * 100;
      } else if (totalEarnings < previousEarnings) {
        earningsChangePercentage = -((previousEarnings - totalEarnings) / previousEarnings) * 100;
      }
    // }
    let walletWithdrawels = false;
    const walletWithdrawles = await Wallet.findOne({ user: req.user.id,
      date: {
        $gte: new Date(startDate).setHours(0,0,0),
        $lt: new Date(endDate).setHours(23, 59, 59),
      }});
    
    if(walletWithdrawles){
      walletWithdrawels = walletWithdrawles.widthdrawals;
    }

    

    const wallet = await Wallet.find({ user: req.user.id, widthdrawals : false });
    let balance = 0;
    wallet.forEach((item) => {
      balance += item.balance;
    });
    // console.log(wallet);
    res.status(200).json({
      success: true,
      totalSales: totalSales,
      totalEarnings: totalEarnings,
      balance:  balance,
      widthdrawaled : walletWithdrawels,
      salesIncreasePercentage: salesChangePercentage.toFixed(2),
      earningsIncreasePercentage: earningsChangePercentage.toFixed(2),
    });
  } catch (error) {
    next(new ErrorHander(error.message, 400));
  }
}); 
