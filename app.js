const express = require("express");
const cookieParser = require("cookie-parser");
// const fileUpload = require("express-fileupload");
const Razorpay = require("razorpay");
const cors = require("cors");
const app = express();

const path = require("path");

//middleware
const errorMiddleware = require("./middleware/error");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(
//   fileUpload({
//     useTempFiles: true,
//   })
// );

const corsOptions = {
  origin: "https://unique-torte-c8fda0.netlify.app",
  credentials: true, // Allow credentials (cookies)
};

app.use(cors(corsOptions));

// Log the configuration

//route Imoprt
const product = require("./routes/productRoute");
const user = require("./routes/userRoute");
const order = require("./routes/orderRoute");
const payment = require("./routes/paymentRoute");

//route
app.use("/api/v1", product);
app.use("/api/v1", user);
app.use("/api/v1", order);
app.use("/api/v1", payment);

// console.log(path.join(__dirname, "../clienttwo/dist/index.html"));

// app.use(express.static(path.join(__dirname, "/dist")));
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "./dist/index.html"));
// });

//middleware to handle errors
app.use(errorMiddleware);

module.exports = app;
