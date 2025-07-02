import { Buffer } from 'buffer';
import { KeyHelper, SessionBuilder, SessionCipher, ProtocolAddress } from 'libsignal-protocol-typescript';

class PersistentSignalStore {
  constructor(userId) {
    this.userId = userId;
    this.store = {};
    this.loadFromStorage();
  }

  loadFromStorage() {
    const data = localStorage.getItem(`signalStore-${this.userId}`);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        Object.keys(parsed).forEach(key => {
          if (parsed[key] && parsed[key].type === 'Buffer') {
            this.store[key] = Buffer.from(parsed[key].data);
          } else {
            this.store[key] = parsed[key];
          }
        });
      } catch (e) {
        console.error('Failed to load signal store', e);
      }
    }
  }

  saveToStorage() {
    const toStore = {};
    Object.keys(this.store).forEach(key => {
      if (Buffer.isBuffer(this.store[key])) {
        toStore[key] = {
          type: 'Buffer',
          data: Array.from(this.store[key])
        };
      } else {
        toStore[key] = this.store[key];
      }
    });
    localStorage.setItem(`signalStore-${this.userId}`, JSON.stringify(toStore));
  }

  // Implement all required SignalProtocolStore methods
  async put(key, value) {
    this.store[key] = value;
    this.saveToStorage();
  }

  async get(key) {
    return this.store[key];
  }

  async remove(key) {
    delete this.store[key];
    this.saveToStorage();
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
    this.saveToStorage();
  }
}

export class Encryption {
  constructor(userId) {
    this.userId = userId;
    this.store = new PersistentSignalStore(userId);
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

      // Prepare data for backend storage
      const keyData = {
        userId: this.userId,
        identityKey: {
          pubKey: identityKeyPair.pubKey,
          privKey: identityKeyPair.privKey
        },
        registrationId,
        preKey: {
          keyId: preKey.keyId,
          publicKey: preKey.keyPair.pubKey,
          privateKey: preKey.keyPair.privKey
        },
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: signedPreKey.keyPair.pubKey,
          privateKey: signedPreKey.keyPair.privKey,
          signature: signedPreKey.signature
        }
      };

      return keyData;
    } catch (error) {
      console.error('Error initializing encryption:', error);
      throw error;
    }
  }

  async establishSession(recipientId) {
    try {
      // Check if session exists
      const existingSession = await this.store.loadSession(`${recipientId}.1`);
      if (existingSession) return true;

      // Fetch recipient's keys
      const response = await axios.get(`/api/signal-keys/${recipientId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const preKeyBundle = {
        identityKey: response.data.identityKey,
        registrationId: response.data.registrationId,
        preKey: response.data.preKey,
        signedPreKey: response.data.signedPreKey
      };

      const address = new ProtocolAddress(recipientId, 1);
      const builder = new SessionBuilder(this.store, address);
      
      await builder.processPreKey(preKeyBundle);
      return true;
    } catch (error) {
      console.error('Session establishment failed:', error);
      throw error;
    }
  }

  async encryptMessage(recipientId, message) {
    try {
      await this.establishSession(recipientId);
      
      const address = new ProtocolAddress(recipientId, 1);
      const sessionCipher = new SessionCipher(this.store, address);
      
      const ciphertext = await sessionCipher.encrypt(message);
      
      return {
        type: ciphertext.type,
        body: Buffer.from(ciphertext.body).toString('base64'),
        registrationId: await this.store.getLocalRegistrationId()
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  }

  async decryptMessage(senderId, encryptedMessage) {
    try {
      const address = new ProtocolAddress(senderId, 1);
      const sessionCipher = new SessionCipher(this.store, address);
      
      const encryptedMsg = {
        type: encryptedMessage.type,
        body: Buffer.from(encryptedMessage.body, 'base64')
      };

      let plaintext;
      if (encryptedMsg.type === 3) {
        plaintext = await sessionCipher.decryptPreKeyWhisperMessage(
          encryptedMsg.body,
          'binary'
        );
      } else {
        plaintext = await sessionCipher.decryptWhisperMessage(
          encryptedMsg.body,
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