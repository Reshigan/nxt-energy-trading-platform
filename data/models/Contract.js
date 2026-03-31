const mongoose = require('mongoose');

// Smart Contract Schema
const ContractSchema = new mongoose.Schema({
  contractId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  parties: [{
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true
    },
    role: {
      type: String,
      enum: ['Buyer', 'Seller', 'Guarantor', 'Broker'],
      required: true
    }
  }],
  type: {
    type: String,
    enum: ['PPA', 'EnergyPurchase', 'Capacity', 'AncillaryServices', 'CarbonOffset', 'Other'],
    required: true
  },
  terms: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    durationMonths: Number,
    pricing: {
      mechanism: {
        type: String,
        enum: ['Fixed', 'Variable', 'Indexed', 'BlockAndIndex', 'TimeOfUse'],
        required: true
      },
      currency: {
        type: String,
        default: 'USD'
      },
      basePrice: Number,
      ceilingPrice: Number,
      floorPrice: Number
    },
    volume: {
      committed: Number,
      minimum: Number,
      maximum: Number,
      unit: {
        type: String,
        enum: ['MWh', 'kWh'],
        default: 'MWh'
      }
    },
    delivery: {
      location: String,
      schedule: String,
      frequency: {
        type: String,
        enum: ['Hourly', 'Daily', 'Weekly', 'Monthly']
      }
    },
    penalties: [{
      condition: String,
      amount: Number,
      unit: String
    }]
  },
  blockchain: {
    deployed: {
      type: Boolean,
      default: false
    },
    transactionHash: String,
    contractAddress: String,
    network: String
  },
  signatures: [{
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant'
    },
    signedAt: Date,
    signature: String,
    publicKey: String
  }],
  status: {
    type: String,
    enum: ['Draft', 'Negotiation', 'Signed', 'Active', 'Completed', 'Terminated'],
    default: 'Draft'
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

// Indexes for efficient querying
ContractSchema.index({ 'parties.participantId': 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ 'terms.startDate': 1 });
ContractSchema.index({ 'terms.endDate': 1 });

// Pre-save middleware to update the updatedAt field
ContractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Contract', ContractSchema);