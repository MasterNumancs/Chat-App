const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const Chat = require('./Models/Chat');
const User = require('./Models/User');

const JWT_SECRET = 'your_secret_key_here';
const MONGO_URI = 'mongodb://127.0.0.1:27017/Chats';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Mongo error:', err));

// --- Register ---
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const avatar = `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/200/300`;

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash, avatar });

    const token = jwt.sign({ id: user._id, username }, JWT_SECRET);
    res.json({ token, username, avatar, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// --- Login ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id, username }, JWT_SECRET);
  res.json({ token, username, avatar: user.avatar, userId: user._id });
});

// --- Get All Users ---
app.get('/users', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
});

// --- Socket.IO Auth ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

// --- Socket.IO Events ---
io.on('connection', async (socket) => {
  const userId = socket.user.id;
  const username = socket.user.username;

  console.log(`Connected: ${username} (${userId})`);
  socket.join(userId);

  try {
    const messages = await Chat.find({
      $or: [{ fromUserId: userId }, { toUserId: userId }]
    }).sort({ timestamp: 1 });

    socket.emit('chat', messages);
  } catch (err) {
    console.error('Error loading messages:', err);
  }

  socket.on('newMessage', async (msg) => {
    try {
      const newMessage = new Chat({
        fromUserId: userId,
        toUserId: msg.toUserId,
        username,
        message: msg.message,
        avatar: msg.avatar
      });

      await newMessage.save();
      io.to(userId).emit('message', newMessage);
      io.to(msg.toUserId).emit('message', newMessage);
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${username} (${userId})`);
  });
});

// --- Start Server ---
server.listen(3001, () => {
  console.log('Server running on port 3001');
});
