const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const webpush = require('web-push');
const { Buffer } = require('buffer');

const Chat = require('./Models/Chat');
const User = require('./Models/User');
const Group = require('./Models/Group');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true },
});

const PORT = 3001;
const JWT_SECRET = 'your_secret_key_here';

const vapidKeys = {
  publicKey: 'BGva91ksRZr9rSA5JXHttvddlmTdKPjsgqGv-br_IDR0QF0v5DfcYpiL6--MbJOYx4YukM2Hu1tdj-UaOQTw3PU',
  privateKey: '1Hc-TRjQW31h3V7HZMU1eSAIb8jJ8NIoj_oW3NjWfag'
};

webpush.setVapidDetails('mailto:your@email.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB error:', err));

// ================== Signal Protocol Key Storage ================== 

const SignalKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  identityKey: { type: Object, required: true },
  registrationId: { type: Number, required: true },
  preKey: {
    keyId: { type: Number, required: true },
    publicKey: { type: Object, required: true }
  },
  signedPreKey: {
    keyId: { type: Number, required: true },
    publicKey: { type: Object, required: true },
    signature: { type: Object, required: true }
  }
});

const SignalKey = mongoose.model('SignalKey', SignalKeySchema);

// Store user's Signal keys
app.post('/api/signal-keys', async (req, res) => {
  try {
    const { userId, identityKey, registrationId, preKey, signedPreKey } = req.body;
    
    const keyData = { 
      userId, 
      identityKey: {
        pubKey: Buffer.isBuffer(identityKey.pubKey) ? identityKey.pubKey : Buffer.from(identityKey.pubKey),
        privKey: Buffer.isBuffer(identityKey.privKey) ? identityKey.privKey : Buffer.from(identityKey.privKey)
      },
      registrationId,
      preKey: {
        keyId: preKey.keyId,
        publicKey: Buffer.isBuffer(preKey.keyPair.pubKey) ? preKey.keyPair.pubKey : Buffer.from(preKey.keyPair.pubKey)
      },
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: Buffer.isBuffer(signedPreKey.keyPair.pubKey) ? signedPreKey.keyPair.pubKey : Buffer.from(signedPreKey.keyPair.pubKey),
        signature: Buffer.isBuffer(signedPreKey.signature) ? signedPreKey.signature : Buffer.from(signedPreKey.signature)
      }
    };

    await SignalKey.findOneAndUpdate(
      { userId },
      keyData,
      { upsert: true, new: true }
    );
    
    res.status(200).send('Keys stored successfully');
  } catch (error) {
    console.error('Error storing Signal keys:', error);
    res.status(500).send('Error storing keys');
  }
});

// Get recipient's Signal keys
app.get('/api/signal-keys/:userId', async (req, res) => {
  try {
    const keys = await SignalKey.findOne({ userId: req.params.userId });
    if (!keys) return res.status(404).send('Keys not found');
    
    // Convert Buffers to plain objects for response
    const response = {
      identityKey: {
        pubKey: keys.identityKey.pubKey,
        privKey: keys.identityKey.privKey
      },
      registrationId: keys.registrationId,
      preKey: {
        keyId: keys.preKey.keyId,
        publicKey: keys.preKey.publicKey
      },
      signedPreKey: {
        keyId: keys.signedPreKey.keyId,
        publicKey: keys.signedPreKey.publicKey,
        signature: keys.signedPreKey.signature
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error retrieving Signal keys:', error);
    res.status(500).send('Error retrieving keys');
  }
});
// ================== Auth ==================
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/6.x/thumbs/svg?seed=${username}`;

    const newUser = await User.create({ username, password: hashedPassword, avatar, status: 'offline' });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, username: user.username, userId: user._id, avatar: user.avatar });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================== Push Notification ==================
app.post('/api/save-subscription', async (req, res) => {
  try {
    const { userId, subscription } = req.body;
    await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
    res.status(200).send('Subscription saved');
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).send('Error saving subscription');
  }
});

app.post('/api/send-push', async (req, res) => {
  try {
    const { userId, payload } = req.body;
    const user = await User.findById(userId);

    if (!user || !user.pushSubscription) {
      return res.status(404).send('User or subscription not found');
    }

    try {
      await webpush.sendNotification(
        user.pushSubscription, 
        JSON.stringify({
          title: payload.title || 'New Message',
          body: payload.body || 'You have a new notification',
          icon: payload.icon || '/default-icon.png',
          image: payload.image,
          data: { url: payload.url || '/' },
          vibrate: [200, 100, 200]
        })
      );
      res.status(200).send('Push notification sent');
    } catch (error) {
      if (error.statusCode === 410) {
        await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
      }
      res.status(500).send('Error sending push');
    }
  } catch (error) {
    console.error('Error in send-push:', error);
    res.status(500).send('Server error');
  }
});

// ================== Users & Groups ==================
app.get('/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await User.find({ _id: { $ne: decoded.id } }).select('-password');
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/groups', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const groups = await Group.find({ members: decoded.id })
      .populate('members', 'username avatar')
      .populate('createdBy', 'username');

    res.json(groups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/groups', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, members } = req.body;
    const allMembers = [...new Set([...members, decoded.id])];

    const newGroup = await Group.create({ name, members: allMembers, createdBy: decoded.id });
    const populatedGroup = await Group.findById(newGroup._id).populate('members', 'username avatar');
    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/groups/:groupId/add-members', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { members } = req.body;

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.createdBy.toString() !== decoded.id) return res.status(403).json({ error: 'Only admin can add members' });

    group.members = [...new Set([...group.members, ...members])];
    await group.save();

    const populatedGroup = await Group.findById(group._id).populate('members', 'username avatar');
    res.json(populatedGroup);
  } catch (err) {
    console.error('Add members error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/groups/:groupId/remove-member', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { memberId } = req.body;

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.createdBy.toString() !== decoded.id) return res.status(403).json({ error: 'Only admin can remove members' });
    if (memberId === group.createdBy.toString()) return res.status(400).json({ error: 'Cannot remove group admin' });

    group.members = group.members.filter(m => m.toString() !== memberId);
    await group.save();

    const populatedGroup = await Group.findById(group._id).populate('members', 'username avatar');
    res.json(populatedGroup);
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================== Chats ==================
app.get('/chats', async (req, res) => {
  try {
    const { groupId, userId } = req.query;
    let query = {};

    if (groupId) query.groupId = groupId;
    else if (userId) query.$or = [{ fromUserId: userId }, { toUserId: userId }];
    else query.groupId = null, query.toUserId = null;

    const chats = await Chat.find(query).sort({ timestamp: 1 }).limit(100);
    res.json(chats);
  } catch (err) {
    console.error('Get chats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================== Socket.IO ==================
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = decoded.id;
    next();
  });
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id, 'User ID:', socket.userId);
  User.findByIdAndUpdate(socket.userId, { status: 'online' }).exec();

  socket.on('joinPublic', () => socket.join('group'));
  socket.on('joinGroup', (groupId) => socket.join(groupId));
  socket.on('joinPrivate', (userRoomId) => socket.join(userRoomId));

  socket.on('sendMessage', async (data) => {
    try {
      const user = await User.findById(socket.userId);
      if (!user) return;

      // Handle both encrypted and unencrypted messages
      const messageContent = data.encryptedMessage 
        ? { encryptedMessage: data.encryptedMessage }
        : { message: data.message };

      const newChat = new Chat({
        fromUserId: socket.userId,
        toUserId: data.toUserId || null,
        groupId: data.groupId || null,
        groupName: data.groupName || null,
        ...messageContent,
        image: data.image || null,
        username: user.username,
        avatar: user.avatar,
        timestamp: new Date(),
      });

      await newChat.save();

      // Emit to appropriate recipients
      if (data.groupId) {
        const group = await Group.findById(data.groupId).populate('members');
        io.to(data.groupId).emit('receiveMessage', newChat);

        // Send push notifications to group members
        for (const member of group.members) {
          if (member._id.toString() !== socket.userId && member.pushSubscription) {
            const payload = {
              title: `New message in ${data.groupName || 'Group'}`,
              body: data.message || '[Image]',
              icon: user.avatar,
              image: data.image,
              url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?chat=group-${data.groupId}`
            };
            try {
              await webpush.sendNotification(member.pushSubscription, JSON.stringify(payload));
            } catch (error) {
              if (error.statusCode === 410) {
                await User.findByIdAndUpdate(member._id, { $unset: { pushSubscription: 1 } });
              }
            }
          }
        }
      } else if (data.toUserId) {
        const recipient = await User.findById(data.toUserId);
        socket.emit('receiveMessage', newChat);
        io.to(data.toUserId).emit('receiveMessage', newChat);

        // Send push notification to recipient
        if (recipient?.pushSubscription) {
          const payload = {
            title: `New message from ${user.username}`,
            body: data.message || '[Image]',
            icon: user.avatar,
            image: data.image,
            url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?chat=${data.toUserId}`
          };
          try {
            await webpush.sendNotification(recipient.pushSubscription, JSON.stringify(payload));
          } catch (error) {
            if (error.statusCode === 410) {
              await User.findByIdAndUpdate(recipient._id, { $unset: { pushSubscription: 1 } });
            }
          }
        }
      } else {
        io.to('group').emit('receiveMessage', newChat);
      }
    } catch (err) {
      console.error('Send message error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    User.findByIdAndUpdate(socket.userId, { status: 'offline' }).exec();
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});