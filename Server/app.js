const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Models
const Chat = require('./Models/Chat');
const User = require('./Models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true }
});

const PORT = 3001;
const JWT_SECRET = 'your_secret_key_here';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB error:', err));


// ================= AUTH ROUTES =================

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const bcrypt = require('bcryptjs');

  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/6.x/thumbs/svg?seed=${username}`;

    const newUser = await User.create({
      username,
      password: hashedPassword,
      avatar
    });

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      username: newUser.username,
      avatar,
      userId: newUser._id
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const bcrypt = require('bcryptjs');

  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      username: user.username,
      avatar: user.avatar,
      userId: user._id
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= SOCKET.IO =================

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('sendMessage', async (data) => {
    const { fromUserId, toUserId, message, username, avatar, groupId } = data;

    const newChat = new Chat({
      fromUserId,
      toUserId,
      groupId: groupId || null,
      message,
      username,
      avatar,
      timestamp: new Date()
    });

    await newChat.save();

    io.emit('receiveMessage', newChat);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ================= START SERVER =================

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
