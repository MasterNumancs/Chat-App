// models/SignalKey.js
const SignalKeySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  identityKey: {
    pubKey: { type: Object, required: true },
    privKey: { type: Object, required: true }
  },
  registrationId: { type: Number, required: true },
  preKeys: [{
    keyId: { type: Number, required: true },
    publicKey: { type: Object, required: true },
    privateKey: { type: Object, required: true }
  }],
  signedPreKey: {
    keyId: { type: Number, required: true },
    publicKey: { type: Object, required: true },
    privateKey: { type: Object, required: true },
    signature: { type: Object, required: true }
  }
}, { timestamps: true });