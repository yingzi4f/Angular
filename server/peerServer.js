const { PeerServer } = require('peer');
const express = require('express');
const cors = require('cors');

const app = express();

// CORS 配置
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:4200",
  credentials: true
}));

// 创建 PeerJS 服务器
const peerServer = PeerServer({
  port: process.env.PEER_SERVER_PORT || 9000,
  path: process.env.PEER_SERVER_PATH || '/peerjs',
  proxied: false,
  debug: true,
  allow_discovery: true,
  corsOptions: {
    origin: process.env.CLIENT_URL || "http://localhost:4200",
    credentials: true
  }
});

// 连接事件监听
peerServer.on('connection', (client) => {
  console.log(`🎥 PeerJS 客户端连接: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`🎥 PeerJS 客户端断开: ${client.getId()}`);
});

// 启动服务器
const PORT = process.env.PEER_SERVER_PORT || 9000;

console.log(`🎥 PeerJS 服务器启动成功`);
console.log(`📡 端口: ${PORT}`);
console.log(`🛤️  路径: ${process.env.PEER_SERVER_PATH || '/peerjs'}`);
console.log(`🌐 允许来源: ${process.env.CLIENT_URL || 'http://localhost:4200'}`);

module.exports = peerServer;