const multer = require("multer");

const storage = multer.memoryStorage();

exports.singleUpload = multer({ storage }).single("image");
