const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  user : {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: { type: Number, default: 0 },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  widthdrawals: {
    type: Boolean,
    required: true,
    default: false,
  },
});

module.exports = mongoose.model("Wallet", walletSchema);