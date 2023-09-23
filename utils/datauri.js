const DataUriParser = require("datauri/parser");
const path = require("path");

exports.getDataUri = (image) => {
  const parser = new DataUriParser();
  const extName = path.extname(image.originalname).toString();
  console.log(extName);
  return parser.format(extName, image.buffer);
};

