const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// MongoDB连接
const database = require('./config/database');

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "http://localhost:4200",
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Chat server is running',
    timestamp: new Date().toISOString()
  });
});

const activeUsers = new Map();
const roomUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-join', (userData) => {
    activeUsers.set(socket.id, userData);
    console.log(`User ${userData.username} joined`);
  });

  socket.on('join-channel', (data) => {
    const { channelId, user } = data;
    socket.join(channelId);

    if (!roomUsers.has(channelId)) {
      roomUsers.set(channelId, new Set());
    }
    roomUsers.get(channelId).add(user.username);

    socket.to(channelId).emit('user-joined-channel', {
      username: user.username,
      message: `${user.username} 加入了频道`
    });

    console.log(`User ${user.username} joined channel ${channelId}`);
  });

  socket.on('leave-channel', (data) => {
    const { channelId, user } = data;
    socket.leave(channelId);

    if (roomUsers.has(channelId)) {
      roomUsers.get(channelId).delete(user.username);
      if (roomUsers.get(channelId).size === 0) {
        roomUsers.delete(channelId);
      }
    }

    socket.to(channelId).emit('user-left-channel', {
      username: user.username,
      message: `${user.username} 离开了频道`
    });
  });

  socket.on('send-message', (data) => {
    const { channelId, message, user, timestamp } = data;

    const messageData = {
      id: Date.now().toString(),
      content: message,
      senderId: user.id,
      senderUsername: user.username,
      channelId: channelId,
      timestamp: timestamp || new Date(),
      type: 'text'
    };

    io.to(channelId).emit('receive-message', messageData);
    console.log(`Message sent to channel ${channelId} by ${user.username}`);
  });

  socket.on('typing-start', (data) => {
    socket.to(data.channelId).emit('user-typing', {
      username: data.username,
      isTyping: true
    });
  });

  socket.on('typing-stop', (data) => {
    socket.to(data.channelId).emit('user-typing', {
      username: data.username,
      isTyping: false
    });
  });

  socket.on('disconnect', () => {
    const userData = activeUsers.get(socket.id);
    if (userData) {
      console.log(`User ${userData.username} disconnected`);
      activeUsers.delete(socket.id);

      roomUsers.forEach((users, channelId) => {
        if (users.has(userData.username)) {
          users.delete(userData.username);
          socket.to(channelId).emit('user-left-channel', {
            username: userData.username,
            message: `${userData.username} 离开了频道`
          });
        }
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Chat server is running on port ${PORT}`);
  console.log(`Socket.IO server is ready`);
});