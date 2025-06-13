const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: String,   
  username: { type: String, unique: true },
  password: String,
  avatar: String,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
