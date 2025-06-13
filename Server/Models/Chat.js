const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: String,
  message: String,
  avatar: String,
  timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Message', chatSchema);
module.exports = Chat;
