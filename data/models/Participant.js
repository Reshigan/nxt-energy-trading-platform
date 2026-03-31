const mongoose = require('mongoose');

// Participant Schema (Buyers, Sellers, Brokers)
const ParticipantSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Utility', 'IPP', 'Trader', 'Broker', 'Consumer', 'Government', 'Other'],
    required: true
  },
  contact: {
    email: {
      type: String,
      required: true
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  },
  financials: {
    creditRating: {
      type: String,
      enum: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D']
    },
    creditLimit: Number,
    paymentTerms: String
  },
  energyPreferences: [{
    energyType: String,
    minQuantity: Number,
    maxPrice: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastActivity: Date
}, {
  timestamps: true
});

// Indexes for efficient querying
ParticipantSchema.index({ type: 1 });
ParticipantSchema.index({ 'contact.email': 1 });
ParticipantSchema.index({ isActive: 1 });

module.exports = mongoose.model('Participant', ParticipantSchema);