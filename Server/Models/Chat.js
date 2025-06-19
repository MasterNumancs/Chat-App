const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  username: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  message: {
    type: String,
    required: false,       // ✅ allow empty text
    default: ''
  },
  image: {
    type: String,
    default: null
  },
  isImage: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Automatically flag messages that contain images
chatSchema.pre('save', function(next) {
  this.isImage = !!this.image;
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
