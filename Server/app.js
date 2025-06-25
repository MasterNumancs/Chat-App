const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const webpush = require('web-push');

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
  publicKey: 'BKWdPaYFw_BwlQkz6Bd2Xx1UNaTkdm7GnE8BVoNEcTPIYcbgqtsZNeMtsdStzRgM-vmkwkqf_FUK86z37AdrVqI',
  privateKey: 'vlw1ggI7r9regXhiFVN6oY00TdimnFT7vXwVJJHMtks'
};

webpush.setVapidDetails('mailto:your@email.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB error:', err));

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

    if (!user || !user.pushSubscription) return res.status(404).send('User or subscription not found');

    try {
      await webpush.sendNotification(user.pushSubscription, JSON.stringify({
        title: payload.title || 'New Message',
        body: payload.body || 'You have a new notification',
        icon: payload.icon || '/default-icon.png',
        image: payload.image,
        data: { url: payload.url || '/' },
        vibrate: [200, 100, 200]
      }));
      res.status(200).send('Push notification sent');
    } catch (error) {
      console.error('Push send error:', error);
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

      const newChat = new Chat({
        fromUserId: socket.userId,
        toUserId: data.toUserId || null,
        groupId: data.groupId || null,
        groupName: data.groupName || null,
        message: data.message,
        image: data.image || null,
        username: user.username,
        avatar: user.avatar,
        timestamp: new Date(),
      });

      await newChat.save();

      if (data.groupId) {
        const group = await Group.findById(data.groupId).populate('members');
        io.to(data.groupId).emit('receiveMessage', newChat);

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
