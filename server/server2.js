require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入配置和模型
const database = require('./config/database');
const mongoDataStore = require('./models/mongoDataStore');

// 导入路由
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');

// 导入中间件
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:4200", "http://localhost:4201"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: [process.env.CLIENT_URL || "http://localhost:4200", "http://localhost:4201"],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 创建上传目录
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const avatarDir = path.join(uploadDir, 'avatars');
const filesDir = path.join(uploadDir, 'files');

[uploadDir, avatarDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 静态文件服务
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查端点
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const storeHealth = await mongoDataStore.healthCheck();

    res.json({
      status: 'OK',
      message: 'Chat server is running',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      dataStore: storeHealth,
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Socket.io 连接管理
const activeUsers = new Map(); // socketId -> userData
const userSockets = new Map(); // userId -> socketId
const channelUsers = new Map(); // channelId -> Set of userIds
const typingUsers = new Map(); // channelId -> Set of userIds

io.on('connection', (socket) => {
  console.log(`🔌 用户连接: ${socket.id}`);

  // 用户加入
  socket.on('user-join', async (userData) => {
    try {
      activeUsers.set(socket.id, userData);
      userSockets.set(userData.id, socket.id);

      // 更新用户在线状态
      await mongoDataStore.setUserOnline(userData.id, true);

      // 广播用户上线
      socket.broadcast.emit('user-online', {
        userId: userData.id,
        username: userData.username
      });

      console.log(`👤 用户 ${userData.username} 已连接`);
    } catch (error) {
      console.error('用户加入失败:', error);
      socket.emit('error', { message: '加入失败' });
    }
  });

  // 加入频道
  socket.on('join-channel', async (data) => {
    try {
      const { channelId, user } = data;

      // 验证用户是否有权限访问该频道
      const channel = await mongoDataStore.findChannelById(channelId);
      if (!channel || !channel.memberIds.some(id => id.toString() === user.id)) {
        socket.emit('error', { message: '无权限访问该频道' });
        return;
      }

      socket.join(channelId);

      if (!channelUsers.has(channelId)) {
        channelUsers.set(channelId, new Set());
      }
      channelUsers.get(channelId).add(user.id);

      // 广播用户加入频道
      socket.to(channelId).emit('user-joined-channel', {
        userId: user.id,
        username: user.username,
        message: `${user.username} 加入了频道`
      });

      // 发送频道在线用户列表
      const onlineUsers = Array.from(channelUsers.get(channelId) || []);
      socket.emit('channel-users', { channelId, users: onlineUsers });

      console.log(`📺 用户 ${user.username} 加入频道 ${channelId}`);
    } catch (error) {
      console.error('加入频道失败:', error);
      socket.emit('error', { message: '加入频道失败' });
    }
  });

  // 离开频道
  socket.on('leave-channel', (data) => {
    const { channelId, user } = data;
    socket.leave(channelId);

    if (channelUsers.has(channelId)) {
      channelUsers.get(channelId).delete(user.id);
      if (channelUsers.get(channelId).size === 0) {
        channelUsers.delete(channelId);
      }
    }

    // 停止输入状态
    if (typingUsers.has(channelId)) {
      typingUsers.get(channelId).delete(user.id);
    }

    socket.to(channelId).emit('user-left-channel', {
      userId: user.id,
      username: user.username,
      message: `${user.username} 离开了频道`
    });

    socket.to(channelId).emit('typing-stop', {
      userId: user.id,
      username: user.username
    });
  });

  // 发送消息
  socket.on('send-message', async (data) => {
    try {
      const { channelId, message, user, type = 'text', fileUrl, fileName, fileSize, mimeType } = data;

      // 验证权限
      const channel = await mongoDataStore.findChannelById(channelId);
      if (!channel || !channel.memberIds.some(id => id.toString() === user.id)) {
        socket.emit('error', { message: '无权限发送消息到该频道' });
        return;
      }

      // 保存消息到数据库
      const messageData = {
        content: message,
        senderId: user.id,
        senderUsername: user.username,
        channelId: channelId,
        type: type,
        fileUrl: fileUrl,
        fileName: fileName,
        fileSize: fileSize,
        mimeType: mimeType
      };

      const savedMessage = await mongoDataStore.addMessage(messageData);

      // 广播消息
      io.to(channelId).emit('receive-message', {
        id: savedMessage._id,
        content: savedMessage.content,
        senderId: savedMessage.senderId,
        senderUsername: savedMessage.senderUsername,
        channelId: savedMessage.channelId,
        type: savedMessage.type,
        fileUrl: savedMessage.fileUrl,
        fileName: savedMessage.fileName,
        fileSize: savedMessage.fileSize,
        mimeType: savedMessage.mimeType,
        timestamp: savedMessage.createdAt
      });

      console.log(`💬 消息已发送到频道 ${channelId} 由 ${user.username}`);
    } catch (error) {
      console.error('发送消息失败:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });

  // 输入状态管理
  socket.on('typing-start', (data) => {
    const { channelId, user } = data;

    if (!typingUsers.has(channelId)) {
      typingUsers.set(channelId, new Set());
    }
    typingUsers.get(channelId).add(user.id);

    socket.to(channelId).emit('typing-start', {
      userId: user.id,
      username: user.username
    });
  });

  socket.on('typing-stop', (data) => {
    const { channelId, user } = data;

    if (typingUsers.has(channelId)) {
      typingUsers.get(channelId).delete(user.id);
    }

    socket.to(channelId).emit('typing-stop', {
      userId: user.id,
      username: user.username
    });
  });

  // 视频通话信令
  socket.on('video-call-offer', (data) => {
    const { targetUserId, offer, callerId } = data;
    const targetSocketId = userSockets.get(targetUserId);

    if (targetSocketId) {
      io.to(targetSocketId).emit('video-call-offer', {
        offer,
        callerId,
        callerSocketId: socket.id
      });
    }
  });

  socket.on('video-call-answer', (data) => {
    const { callerSocketId, answer } = data;
    socket.to(callerSocketId).emit('video-call-answer', { answer });
  });

  socket.on('video-call-ice-candidate', (data) => {
    const { targetSocketId, candidate } = data;
    socket.to(targetSocketId).emit('video-call-ice-candidate', { candidate });
  });

  socket.on('video-call-end', (data) => {
    const { targetSocketId } = data;
    socket.to(targetSocketId).emit('video-call-end');
  });

  // 断开连接
  socket.on('disconnect', async () => {
    try {
      const userData = activeUsers.get(socket.id);

      if (userData) {
        // 更新用户离线状态
        await mongoDataStore.setUserOnline(userData.id, false);

        // 从所有频道中移除用户
        channelUsers.forEach((users, channelId) => {
          if (users.has(userData.id)) {
            users.delete(userData.id);
            socket.to(channelId).emit('user-left-channel', {
              userId: userData.id,
              username: userData.username,
              message: `${userData.username} 离开了频道`
            });
          }
        });

        // 清理输入状态
        typingUsers.forEach((users, channelId) => {
          if (users.has(userData.id)) {
            users.delete(userData.id);
            socket.to(channelId).emit('typing-stop', {
              userId: userData.id,
              username: userData.username
            });
          }
        });

        // 广播用户离线
        socket.broadcast.emit('user-offline', {
          userId: userData.id,
          username: userData.username
        });

        activeUsers.delete(socket.id);
        userSockets.delete(userData.id);

        console.log(`👤 用户 ${userData.username} 已断开连接`);
      }
    } catch (error) {
      console.error('处理用户断开连接失败:', error);
    }

    console.log(`🔌 连接断开: ${socket.id}`);
  });
});

// 启动服务器
server.listen(PORT, async () => {
  console.log(`🚀 聊天服务器第二阶段已启动`);
  console.log(`📡 端口: ${PORT}`);
  console.log(`🌐 客户端地址: ${process.env.CLIENT_URL || 'http://localhost:4200'}`);
  console.log(`💾 上传目录: ${uploadDir}`);
  console.log(`📊 管理界面: http://localhost:8081 (MongoDB Express)`);
  console.log(`⚡ Socket.IO 服务器已就绪`);

  // 等待数据库连接完成后初始化数据
  setTimeout(async () => {
    try {
      const health = await mongoDataStore.healthCheck();
      console.log(`📈 数据统计:`, health.counts);
    } catch (error) {
      console.error('获取数据统计失败:', error);
    }
  }, 2000);
});