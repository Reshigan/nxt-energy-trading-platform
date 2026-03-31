const mongoose = require('mongoose');

// Energy Trading Schema
const TradeSchema = new mongoose.Schema({
  tradeId: {
    type: String,
    required: true,
    unique: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  energyType: {
    type: String,
    enum: ['Solar', 'Wind', 'Hydro', 'NaturalGas', 'Coal', 'Nuclear', 'Battery', 'Other'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['MWh', 'kWh'],
    default: 'MWh'
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  deliveryWindow: {
    startTime: Date,
    endTime: Date
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Executed', 'Settled', 'Cancelled'],
    default: 'Pending'
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
TradeSchema.index({ buyer: 1, status: 1 });
TradeSchema.index({ seller: 1, status: 1 });
TradeSchema.index({ energyType: 1, deliveryDate: 1 });

// Pre-save middleware to update the updatedAt field
TradeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Trade', TradeSchema);