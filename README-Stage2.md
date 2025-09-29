# 聊天系统第二阶段 - 完整的 MEAN Stack 实现

## 🎉 项目概述

这是一个基于 MEAN 堆栈（MongoDB、Express、Angular、Node.js）的**完整实时聊天系统**，支持文本聊天、图片分享、文件上传和视频通话功能。系统实现了三级权限管理和完整的企业级功能。

### 🆕 第二阶段新功能

- ✨ **MongoDB 数据库**：完全替代文件存储，支持数据持久化和高性能查询
- ✨ **图片和文件上传**：支持头像、聊天图片、文档等多种文件类型上传
- ✨ **视频聊天功能**：基于 PeerJS 的一对一视频/音频通话
- ✨ **增强的实时通信**：改进的 Socket.io 实现，支持用户在线状态、输入提示等
- ✨ **聊天历史记录**：完整的消息历史记录和分页加载
- ✨ **用户头像系统**：支持自定义头像上传和显示
- ✨ **Docker 容器化部署**：简化的部署流程和环境管理

## 🛠 技术栈（第二阶段）

### 前端 (Angular)
- **Angular 17**: 前端框架
- **TypeScript**: 开发语言
- **RxJS**: 响应式编程
- **Socket.io-client**: WebSocket 客户端通信
- **PeerJS**: 视频通话客户端
- **Angular CDK**: UI组件开发工具包

### 后端 (Node.js)
- **Node.js**: 运行时环境
- **Express.js**: Web 框架
- **Socket.io**: 实时双向通信
- **MongoDB & Mongoose**: 数据库和 ODM
- **Multer**: 文件上传处理
- **PeerJS Server**: 视频通话信令服务器
- **JWT**: 用户认证
- **bcryptjs**: 密码加密

### 数据库与部署
- **MongoDB 7.0**: 主数据库
- **Docker & Docker Compose**: 容器化部署
- **Mongo Express**: 数据库管理界面

## 🚀 快速开始

### 环境要求
- Node.js 16+
- Docker & Docker Compose
- npm 8+
- Angular CLI 17+

### 一键启动（推荐）

1. **克隆项目并进入目录**
```bash
git clone <your-repo-url>
cd Angular
```

2. **使用启动脚本**
```bash
# Linux/macOS
chmod +x start.sh
./start.sh

# Windows (在 Git Bash 或 WSL 中执行)
bash start.sh
```

3. **手动启动服务**
```bash
# 启动服务器（新终端窗口）
cd server
npm run dev

# 启动客户端（新终端窗口）
cd client
npm start
```

### 手动部署步骤

1. **启动 MongoDB 数据库**
```bash
docker-compose up -d
```

2. **安装依赖**
```bash
# 服务器端
cd server
npm install

# 客户端
cd ../client
npm install
```

3. **启动应用**
```bash
# 服务器（端口 3000）
cd server
npm run dev

# 客户端（端口 4200）
cd client
npm start
```

## 🌐 访问地址

- **客户端应用**: http://localhost:4200
- **服务器 API**: http://localhost:3000
- **API 健康检查**: http://localhost:3000/api/health
- **MongoDB 管理界面**: http://localhost:8081
- **PeerJS 服务器**: ws://localhost:9000/peerjs

## 👤 默认账户

- **超级管理员**
  - 用户名：`super`
  - 密码：`123456`
  - 权限：完全管理权限

## 📊 数据库架构（MongoDB）

### 核心集合

#### Users 集合
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  roles: [String], // ['user', 'group-admin', 'super-admin']
  avatar: String, // 头像文件路径
  isOnline: Boolean,
  lastSeen: Date,
  groups: [ObjectId], // 所属群组引用
  createdAt: Date,
  updatedAt: Date
}
```

#### Groups 集合
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  adminIds: [ObjectId], // 管理员用户引用
  memberIds: [ObjectId], // 成员用户引用
  createdBy: ObjectId, // 创建者引用
  isPrivate: Boolean,
  maxMembers: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Channels 集合
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  groupId: ObjectId, // 所属群组引用
  memberIds: [ObjectId], // 频道成员引用
  isPrivate: Boolean,
  createdBy: ObjectId,
  lastActivity: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Messages 集合
```javascript
{
  _id: ObjectId,
  content: String, // 文本内容（文本消息必需）
  senderId: ObjectId, // 发送者引用
  senderUsername: String,
  channelId: ObjectId, // 频道引用
  type: String, // 'text' | 'image' | 'file' | 'video'
  fileUrl: String, // 文件URL（文件消息使用）
  fileName: String, // 原始文件名
  fileSize: Number, // 文件大小
  mimeType: String, // MIME类型
  isEdited: Boolean,
  editedAt: Date,
  replyTo: ObjectId, // 回复消息引用
  reactions: [{ // 消息反应
    userId: ObjectId,
    emoji: String,
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 API 接口文档

### 认证接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/auth/login` | 用户登录 | 公开 |
| POST | `/api/auth/register` | 用户注册 | 公开 |
| POST | `/api/auth/logout` | 用户登出 | 认证用户 |
| GET | `/api/auth/users` | 获取所有用户 | 认证用户 |
| PUT | `/api/auth/users/:id/promote` | 提升用户权限 | 超级管理员 |
| DELETE | `/api/auth/users/:id` | 删除用户 | 超级管理员 |
| PUT | `/api/auth/profile` | 更新个人资料 | 认证用户 |
| GET | `/api/auth/online-users` | 获取在线用户 | 认证用户 |

### 群组接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/groups` | 获取用户群组 | 认证用户 |
| GET | `/api/groups/all` | 获取所有群组 | 超级管理员 |
| POST | `/api/groups` | 创建群组 | 群组管理员+ |
| GET | `/api/groups/:id` | 获取群组详情 | 群组成员 |
| PUT | `/api/groups/:id` | 更新群组信息 | 群组管理员 |
| POST | `/api/groups/:id/channels` | 创建频道 | 群组管理员 |
| GET | `/api/groups/:id/channels` | 获取频道列表 | 群组成员 |
| POST | `/api/groups/:id/members` | 添加成员 | 群组管理员 |
| DELETE | `/api/groups/:id/members/:userId` | 移除成员 | 群组管理员 |

### 消息接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/groups/:groupId/channels/:channelId/messages` | 获取消息历史 | 频道成员 |
| POST | `/api/groups/:groupId/channels/:channelId/messages` | 发送消息 | 频道成员 |
| PUT | `/api/groups/:groupId/channels/:channelId/messages/:messageId` | 编辑消息 | 消息作者 |
| DELETE | `/api/groups/:groupId/channels/:channelId/messages/:messageId` | 删除消息 | 消息作者 |

### 文件上传接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/upload/avatar` | 上传头像 | 认证用户 |
| POST | `/api/upload/image` | 上传聊天图片 | 认证用户 |
| POST | `/api/upload/file` | 上传文件 | 认证用户 |
| POST | `/api/upload/files` | 批量上传文件 | 认证用户 |
| DELETE | `/api/upload/file/:filename` | 删除文件 | 认证用户 |
| GET | `/api/upload/file/:filename` | 获取文件信息 | 认证用户 |

## 🔄 Socket.io 事件

### 客户端发送事件

| 事件名 | 数据 | 描述 |
|--------|------|------|
| `user-join` | `{id, username, avatar}` | 用户加入系统 |
| `join-channel` | `{channelId, user}` | 加入频道 |
| `leave-channel` | `{channelId, user}` | 离开频道 |
| `send-message` | `{channelId, message, user, type, ...}` | 发送消息 |
| `typing-start` | `{channelId, user}` | 开始输入 |
| `typing-stop` | `{channelId, user}` | 停止输入 |

### 服务端发送事件

| 事件名 | 数据 | 描述 |
|--------|------|------|
| `user-online` | `{userId, username}` | 用户上线 |
| `user-offline` | `{userId, username}` | 用户离线 |
| `user-joined-channel` | `{userId, username, message}` | 用户加入频道 |
| `user-left-channel` | `{userId, username, message}` | 用户离开频道 |
| `receive-message` | `{id, content, sender, ...}` | 接收消息 |
| `channel-users` | `{channelId, users}` | 频道在线用户 |
| `typing-start` | `{userId, username}` | 用户开始输入 |
| `typing-stop` | `{userId, username}` | 用户停止输入 |

### 视频通话信令事件

| 事件名 | 数据 | 描述 |
|--------|------|------|
| `video-call-offer` | `{targetUserId, offer, callerId}` | 发起视频通话 |
| `video-call-answer` | `{callerSocketId, answer}` | 接受视频通话 |
| `video-call-ice-candidate` | `{targetSocketId, candidate}` | ICE 候选交换 |
| `video-call-end` | `{targetSocketId}` | 结束视频通话 |

## 📁 项目结构（第二阶段）

```
/mnt/d/Angular/
├── 📁 client/                     # Angular 前端应用
│   ├── 📁 src/app/
│   │   ├── 📁 components/
│   │   │   ├── login/             # 登录组件
│   │   │   ├── dashboard/         # 仪表板组件
│   │   │   └── chat/              # 聊天组件
│   │   ├── 📁 services/
│   │   │   ├── auth.service.ts    # 认证服务
│   │   │   ├── group.service.ts   # 群组服务
│   │   │   ├── upload.service.ts  # 文件上传服务
│   │   │   └── video-call.service.ts # 视频通话服务
│   │   ├── 📁 models/             # 数据模型
│   │   └── 📁 guards/             # 路由守卫
│   └── package.json               # 前端依赖
├── 📁 server/                     # Node.js 后端应用
│   ├── 📁 config/
│   │   └── database.js            # MongoDB 连接配置
│   ├── 📁 models/
│   │   ├── 📁 mongodb/            # Mongoose 模型
│   │   │   ├── User.js
│   │   │   ├── Group.js
│   │   │   ├── Channel.js
│   │   │   └── Message.js
│   │   └── mongoDataStore.js      # 数据访问层
│   ├── 📁 routes/
│   │   ├── auth2.js               # 认证路由（MongoDB版本）
│   │   ├── groups2.js             # 群组路由（MongoDB版本）
│   │   └── upload.js              # 文件上传路由
│   ├── 📁 middleware/
│   │   └── auth.js                # JWT 认证中间件
│   ├── 📁 uploads/                # 文件上传目录
│   │   ├── avatars/               # 用户头像
│   │   ├── images/                # 聊天图片
│   │   └── files/                 # 其他文件
│   ├── server2.js                 # 主服务器（第二阶段）
│   ├── peerServer.js              # PeerJS 视频服务器
│   ├── .env                       # 环境变量配置
│   └── package.json               # 后端依赖
├── docker-compose.yml             # Docker 编排配置
├── init-mongo.js                  # MongoDB 初始化脚本
├── start.sh                       # 启动脚本
├── stop.sh                        # 停止脚本
└── README-Stage2.md               # 第二阶段文档
```

## 🎯 核心功能特性

### ✅ 已实现功能（第二阶段）

#### 用户管理
- [x] JWT 基于令牌的认证系统
- [x] 三级权限管理（超级管理员/群组管理员/普通用户）
- [x] 用户注册和登录
- [x] 用户头像上传和显示
- [x] 用户在线状态管理
- [x] 个人资料编辑

#### 群组和频道管理
- [x] 创建和管理群组
- [x] 群组内创建多个频道
- [x] 群组成员管理（添加/移除）
- [x] 权限控制和访问管理
- [x] 群组管理员权限分配

#### 实时聊天
- [x] 基于 Socket.io 的实时消息传递
- [x] 支持文本、图片、文件等多种消息类型
- [x] 消息历史记录和分页加载
- [x] 用户输入状态提示
- [x] 消息编辑和删除
- [x] 频道在线用户显示

#### 文件和媒体
- [x] 图片上传和即时显示
- [x] 文件上传和分享（文档、压缩包等）
- [x] 头像系统
- [x] 文件大小和类型限制
- [x] 文件预览和下载

#### 视频通话
- [x] 基于 PeerJS 的一对一视频通话
- [x] 音频通话支持
- [x] 通话状态管理
- [x] 摄像头和麦克风控制
- [x] 通话记录和状态显示

#### 数据持久化
- [x] MongoDB 数据库完全集成
- [x] 用户数据持久化存储
- [x] 聊天记录永久保存
- [x] 文件元数据管理
- [x] 数据索引优化

#### 部署和运维
- [x] Docker 容器化部署
- [x] Docker Compose 一键部署
- [x] MongoDB Express 管理界面
- [x] 健康检查和监控接口
- [x] 环境配置管理
- [x] 自动化启动脚本

## 🔧 开发和调试

### 环境变量配置

在 `server/.env` 文件中配置：

```env
# 服务器配置
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key

# MongoDB 配置
MONGODB_URI=mongodb://admin:chatpassword@localhost:27017/chatdb?authSource=admin

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# CORS 配置
CLIENT_URL=http://localhost:4200

# PeerJS 配置
PEER_SERVER_PORT=9000
PEER_SERVER_PATH=/peerjs
```

### 开发模式启动

```bash
# 启动完整开发环境（服务器 + PeerJS）
cd server
npm run dev:full

# 分别启动
npm run dev          # 主服务器
npm run start:peer   # PeerJS 服务器
```

### 数据库管理

- **MongoDB Express**: http://localhost:8081
  - 用户名：admin
  - 密码：chatpassword

- **直接连接 MongoDB**:
```bash
docker exec -it chat_mongodb mongo -u admin -p chatpassword
```

### 日志和调试

```bash
# 查看服务器日志
docker-compose logs -f

# 查看 MongoDB 日志
docker-compose logs -f mongodb

# 进入容器调试
docker exec -it chat_mongodb bash
```

## 🚦 性能优化

### 已实现的优化

1. **数据库索引优化**
   - 用户名和邮箱唯一索引
   - 频道和群组关联索引
   - 消息时间戳索引

2. **Socket.io 优化**
   - 房间管理优化
   - 事件监听器优化
   - 连接状态管理

3. **文件上传优化**
   - 文件类型和大小限制
   - 多文件上传支持
   - 文件存储路径优化

4. **前端性能优化**
   - 消息分页加载
   - 图片懒加载
   - 组件状态优化

## 🔒 安全特性

### 已实施的安全措施

1. **认证和授权**
   - JWT 令牌认证
   - 密码 bcrypt 加密
   - 细粒度权限控制

2. **文件上传安全**
   - 文件类型白名单
   - 文件大小限制
   - 路径遍历防护

3. **数据验证**
   - 输入数据验证
   - SQL 注入防护（NoSQL）
   - XSS 防护

4. **网络安全**
   - CORS 配置
   - HTTPS 支持（生产环境）
   - Socket.io 安全配置

## 🐛 故障排除

### 常见问题解决

#### 数据库连接失败
```bash
# 检查 Docker 容器状态
docker-compose ps

# 重启 MongoDB
docker-compose restart mongodb

# 查看日志
docker-compose logs mongodb
```

#### 文件上传失败
- 检查上传目录权限
- 确认文件大小限制
- 验证文件类型支持

#### 视频通话连接失败
- 确认 PeerJS 服务器运行状态
- 检查浏览器媒体权限
- 验证防火墙设置

#### Socket.io 连接问题
- 检查 CORS 配置
- 确认端口占用情况
- 查看浏览器控制台错误

## 📈 未来扩展规划

### 第三阶段功能规划

- [ ] **群组视频会议**：多人视频通话支持
- [ ] **消息搜索**：全文搜索和高级筛选
- [ ] **通知系统**：邮件和推送通知
- [ ] **机器人集成**：聊天机器人和自动化
- [ ] **多语言支持**：国际化和本地化
- [ ] **移动端应用**：React Native 移动应用
- [ ] **集群部署**：负载均衡和高可用性
- [ ] **数据分析**：用户行为分析和报表

### 技术债务和改进

- [ ] **单元测试**：完整的测试覆盖
- [ ] **E2E 测试**：端到端自动化测试
- [ ] **性能监控**：APM 集成
- [ ] **日志聚合**：集中日志管理
- [ ] **缓存优化**：Redis 集成
- [ ] **CDN 集成**：静态资源加速

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支：`git checkout -b feature/AmazingFeature`
3. 提交变更：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 严格模式
- 遵循 Angular 最佳实践
- 编写有意义的提交信息
- 添加必要的注释和文档
- 确保代码通过 ESLint 检查

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- Angular 团队提供的优秀前端框架
- MongoDB 团队的高性能数据库
- Socket.io 团队的实时通信解决方案
- PeerJS 团队的视频通话技术
- Docker 团队的容器化技术
- 开源社区的宝贵贡献

## 👨‍💻 作者

- **yingzi** - *项目开发者* - [yingzi4f@hotmail.com](mailto:yingzi4f@hotmail.com)

---

**🎊 聊天系统第二阶段开发完成！**

这是一个功能完整、性能优秀、安全可靠的企业级聊天系统。项目采用了现代化的技术栈，实现了完整的用户管理、实时聊天、文件分享、视频通话等功能，支持 Docker 部署，具有良好的扩展性和维护性。

**立即体验：** 运行 `./start.sh` 开始您的聊天之旅！