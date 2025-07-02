const mongoose = require('mongoose');
const { Buffer } = require('buffer');

const SignalKeySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  identityKey: {
    pubKey: { type: Buffer, required: true },
    privKey: { type: Buffer, required: true }
  },
  registrationId: { type: Number, required: true },
  preKeys: [{
    keyId: { type: Number, required: true },
    publicKey: { type: Buffer, required: true },
    privateKey: { type: Buffer, required: true }
  }],
  signedPreKey: {
    keyId: { type: Number, required: true },
    publicKey: { type: Buffer, required: true },
    privateKey: { type: Buffer, required: true },
    signature: { type: Buffer, required: true }
  },
  sessions: [{
    deviceId: { type: Number, required: true },
    record: { type: Buffer, required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Convert incoming objects to Buffers before saving
SignalKeySchema.pre('save', function(next) {
  // Convert identityKey
  if (this.identityKey.pubKey && !Buffer.isBuffer(this.identityKey.pubKey)) {
    this.identityKey.pubKey = Buffer.from(this.identityKey.pubKey);
  }
  if (this.identityKey.privKey && !Buffer.isBuffer(this.identityKey.privKey)) {
    this.identityKey.privKey = Buffer.from(this.identityKey.privKey);
  }

  // Convert preKeys
  this.preKeys = this.preKeys.map(pk => ({
    keyId: pk.keyId,
    publicKey: Buffer.isBuffer(pk.publicKey) ? pk.publicKey : Buffer.from(pk.publicKey),
    privateKey: Buffer.isBuffer(pk.privateKey) ? pk.privateKey : Buffer.from(pk.privateKey)
  }));

  // Convert signedPreKey
  if (this.signedPreKey.publicKey && !Buffer.isBuffer(this.signedPreKey.publicKey)) {
    this.signedPreKey.publicKey = Buffer.from(this.signedPreKey.publicKey);
  }
  if (this.signedPreKey.privateKey && !Buffer.isBuffer(this.signedPreKey.privateKey)) {
    this.signedPreKey.privateKey = Buffer.from(this.signedPreKey.privateKey);
  }
  if (this.signedPreKey.signature && !Buffer.isBuffer(this.signedPreKey.signature)) {
    this.signedPreKey.signature = Buffer.from(this.signedPreKey.signature);
  }

  // Convert sessions
  this.sessions = this.sessions.map(session => ({
    deviceId: session.deviceId,
    record: Buffer.isBuffer(session.record) ? session.record : Buffer.from(session.record)
  }));

  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SignalKey', SignalKeySchema);