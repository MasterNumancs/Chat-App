import {
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  ProtocolAddress
} from 'libsignal-protocol-typescript';

export class Encryption {
  constructor(userId) {
    this.userId = userId;
    this.store = new SignalProtocolStore();
  }

  async initialize() {
    try {
      const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
      const registrationId = await KeyHelper.generateRegistrationId();
      const preKey = await KeyHelper.generatePreKey(1);
      const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);

      await this.store.put('identityKey', identityKeyPair);
      await this.store.put('registrationId', registrationId);
      await this.store.put('preKey', preKey);
      await this.store.put('signedPreKey', signedPreKey);

      return {
        identityKey: identityKeyPair.pubKey,
        registrationId,
        preKey,
        signedPreKey
      };
    } catch (error) {
      console.error('Error initializing encryption:', error);
      throw error;
    }
  }

  async getPreKeyBundle() {
    const identityKey = await this.store.getIdentityKeyPair();
    const registrationId = await this.store.getLocalRegistrationId();
    const preKey = await this.store.getPreKey(1);
    const signedPreKey = await this.store.getSignedPreKey(1);

    return {
      identityKey: identityKey.pubKey,
      registrationId,
      preKey: {
        keyId: 1,
        publicKey: preKey.pubKey
      },
      signedPreKey: {
        keyId: 1,
        publicKey: signedPreKey.pubKey,
        signature: signedPreKey.signature || Buffer.alloc(0)
      }
    };
  }

  async startSession(recipientId, preKeyBundle) {
    try {
      const builder = new SessionBuilder(
        this.store,
        new ProtocolAddress(recipientId, 1)
      );
      
      await builder.processPreKey({
        identityKey: preKeyBundle.identityKey,
        registrationId: preKeyBundle.registrationId,
        preKey: preKeyBundle.preKey,
        signedPreKey: preKeyBundle.signedPreKey
      });
      
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }

  async encryptMessage(recipientId, message) {
    try {
      const address = new ProtocolAddress(recipientId, 1);
      const sessionCipher = new SessionCipher(this.store, address);
      
      const ciphertext = await sessionCipher.encrypt(message);
      
      return {
        type: ciphertext.type,
        body: ciphertext.body,
        registrationId: await this.store.getLocalRegistrationId()
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  }

  async decryptMessage(recipientId, encryptedMessage) {
    try {
      const address = new ProtocolAddress(recipientId, 1);
      const sessionCipher = new SessionCipher(this.store, address);
      
      let plaintext;
      if (encryptedMessage.type === 3) {
        plaintext = await sessionCipher.decryptPreKeyWhisperMessage(
          encryptedMessage.body,
          'binary'
        );
      } else {
        plaintext = await sessionCipher.decryptWhisperMessage(
          encryptedMessage.body,
          'binary'
        );
      }
      
      return plaintext;
    } catch (error) {
      console.error('Error decrypting message:', error);
      throw error;
    }
  }
}

// Remove the imported SignalProtocolStore and use this implementation instead
class SignalProtocolStore {
  constructor() {
    this.store = {};
  }

  async put(key, value) {
    this.store[key] = value;
  }

  async get(key) {
    return this.store[key];
  }

  async remove(key) {
    delete this.store[key];
  }

  async getIdentityKeyPair() {
    return this.store['identityKey'];
  }

  async getLocalRegistrationId() {
    return this.store['registrationId'];
  }

  async isTrustedIdentity(identifier, identityKey, direction) {
    return true;
  }

  async loadPreKey(keyId) {
    const preKey = await this.get('preKey');
    return {
      pubKey: preKey.keyPair.pubKey,
      privKey: preKey.keyPair.privKey
    };
  }

  async loadSignedPreKey(keyId) {
    const signedPreKey = await this.get('signedPreKey');
    return {
      pubKey: signedPreKey.keyPair.pubKey,
      privKey: signedPreKey.keyPair.privKey,
      signature: signedPreKey.signature
    };
  }

  async loadSession(identifier) {
    return this.store[`session_${identifier}`];
  }

  async storeSession(identifier, record) {
    this.store[`session_${identifier}`] = record;
  }

  async getPreKey() {
    return this.store['preKey'];
  }

  async getSignedPreKey() {
    return this.store['signedPreKey'];
  }
}