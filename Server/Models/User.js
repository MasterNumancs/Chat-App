const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: 'https://api.dicebear.com/6.x/thumbs/svg?seed=default'
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  }
}, { timestamps: true });

// Add static property for VAPID keys (won't affect existing behavior)
userSchema.statics.vapidKeys = {
  publicKey: 'BGva91ksRZr9rSA5JXHttvddlmTdKPjsgqGv-br_IDR0QF0v5DfcYpiL6--MbJOYx4YukM2Hu1tdj-UaOQTw3PU',
  privateKey: '1Hc-TRjQW31h3V7HZMU1eSAIb8jJ8NIoj_oW3NjWfag'
};

// Add helper method to check if user has push subscription
userSchema.methods.hasPushSubscription = function() {
  return !!this.pushSubscription?.endpoint;
};

module.exports = mongoose.model('User', userSchema);