const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalEarnings: {
    type: Number,
    required: true,
    default: 0
  },
  sales: {
    type: Number,
    required: true,
    default: 0
  },
  user : {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
});

module.exports = mongoose.model('Earning', earningSchema);