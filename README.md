# 聊天系统 - MEAN Stack 实现

## 项目概述

这是一个基于 MEAN 堆栈（MongoDB、Express、Angular、Node.js）的实时聊天系统，支持文本/视频聊天功能。系统实现了三级权限管理：超级管理员、群组管理员和普通用户。

## 技术栈

### 前端 (Angular)
- **Angular 17**: 前端框架
- **TypeScript**: 开发语言
- **RxJS**: 响应式编程
- **Socket.io-client**: WebSocket 客户端通信
- **CSS3**: 样式设计

### 后端 (Node.js)
- **Node.js**: 运行时环境
- **Express.js**: Web 框架
- **Socket.io**: 实时双向通信
- **JSON Web Token (JWT)**: 用户认证
- **bcryptjs**: 密码加密
- **UUID**: 唯一标识符生成

## Git 存储库组织

### 分支策略
- `master`: 主分支，包含稳定版本
- `develop`: 开发分支，用于集成新功能
- `feature/*`: 功能分支，用于开发具体功能

### 更新频率
- 每完成一个功能模块进行一次提交
- 每日至少一次推送到远程仓库
- 重要里程碑创建标签

### 目录结构
```
/
├── client/          # Angular 前端应用
├── server/          # Node.js 后端应用
├── 1.txt           # 项目需求文档
├── README.md       # 项目文档
└── .gitignore      # Git 忽略文件
```

## 数据结构设计

### 客户端数据结构

#### 用户模型 (User)
```typescript
interface User {
  id: string;                // 用户唯一标识
  username: string;          // 用户名（唯一）
  email: string;             // 电子邮件
  roles: string[];           // 角色数组 ['user', 'group-admin', 'super-admin']
  groups: string[];          // 用户所属群组ID数组
  createdAt?: Date;          // 创建时间
  updatedAt?: Date;          // 更新时间
}
```

#### 群组模型 (Group)
```typescript
interface Group {
  id: string;                // 群组唯一标识
  name: string;              // 群组名称
  description?: string;      // 群组描述
  adminIds: string[];        // 管理员ID数组
  memberIds: string[];       // 成员ID数组
  channels: Channel[];       // 频道数组
  createdBy: string;         // 创建者ID
  createdAt?: Date;          // 创建时间
  updatedAt?: Date;          // 更新时间
}
```

#### 频道模型 (Channel)
```typescript
interface Channel {
  id: string;                // 频道唯一标识
  name: string;              // 频道名称
  description?: string;      // 频道描述
  groupId: string;           // 所属群组ID
  memberIds: string[];       // 成员ID数组
  messages: Message[];       // 消息数组
  createdAt?: Date;          // 创建时间
  updatedAt?: Date;          // 更新时间
}
```

#### 消息模型 (Message)
```typescript
interface Message {
  id: string;                // 消息唯一标识
  content: string;           // 消息内容
  senderId: string;          // 发送者ID
  senderUsername: string;    // 发送者用户名
  channelId: string;         // 所属频道ID
  timestamp: Date;           // 时间戳
  type: 'text' | 'image' | 'file';  // 消息类型
  fileUrl?: string;          // 文件URL（可选）
}
```

### 服务器端数据结构

服务器端使用相同的数据模型，并通过 JSON 文件存储（第一阶段），数据存储在以下文件中：
- `server/data/users.json`: 用户数据
- `server/data/groups.json`: 群组数据
- `server/data/messages.json`: 消息数据

## Angular 架构

### 组件 (Components)

#### 1. LoginComponent (`client/src/app/components/login/`)
- **功能**: 用户登录和注册界面
- **职责**:
  - 处理用户认证
  - 表单验证
  - 显示错误信息
  - 支持新用户注册

#### 2. DashboardComponent (`client/src/app/components/dashboard/`)
- **功能**: 用户主面板
- **职责**:
  - 显示用户群组列表
  - 权限管理界面（管理员）
  - 创建群组功能
  - 用户管理功能

#### 3. ChatComponent (`client/src/app/components/chat/`)
- **功能**: 聊天界面
- **职责**:
  - 显示聊天消息
  - 发送消息
  - 频道切换
  - 成员管理

### 服务 (Services)

#### 1. AuthService (`client/src/app/services/auth.service.ts`)
- **功能**: 用户认证管理
- **主要方法**:
  ```typescript
  login(credentials: LoginRequest): Observable<LoginResponse>
  logout(): void
  isAuthenticated(): boolean
  getCurrentUser(): User | null
  hasRole(role: string): boolean
  registerUser(user: Partial<User>): Observable<any>
  ```

#### 2. GroupService (`client/src/app/services/group.service.ts`)
- **功能**: 群组和频道管理
- **主要方法**:
  ```typescript
  getUserGroups(): Observable<Group[]>
  createGroup(groupData: Partial<Group>): Observable<Group>
  createChannel(groupId: string, channelData: Partial<Channel>): Observable<Channel>
  sendMessage(channelId: string, content: string): Observable<Message>
  addUserToGroup(groupId: string, userId: string): Observable<boolean>
  ```

### 模型 (Models)
- `user.model.ts`: 用户相关接口定义
- `group.model.ts`: 群组、频道、消息接口定义

### 路由 (Routes)
```typescript
const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'chat/:id', component: ChatComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];
```

### 守卫 (Guards)
- **AuthGuard**: 保护需要认证的路由

## Node.js 服务器架构

### 模块结构

#### 1. 主服务器 (`server/server.js`)
- Express 应用初始化
- Socket.io 配置
- 路由挂载
- CORS 配置

#### 2. 认证中间件 (`server/middleware/auth.js`)
- JWT 令牌验证
- 用户权限检查
- 令牌生成

#### 3. 数据存储 (`server/models/dataStore.js`)
- 文件系统数据操作
- CRUD 操作封装
- 数据验证

#### 4. 路由模块

##### 认证路由 (`server/routes/auth.js`)
```javascript
POST /api/auth/login          // 用户登录
POST /api/auth/register       // 用户注册
GET  /api/auth/users          // 获取用户列表
PUT  /api/auth/users/:id/promote  // 提升用户权限
DELETE /api/auth/users/:id    // 删除用户
```

##### 群组路由 (`server/routes/groups.js`)
```javascript
GET    /api/groups                           // 获取用户群组
GET    /api/groups/all                       // 获取所有群组（管理员）
POST   /api/groups                           // 创建群组
POST   /api/groups/:id/channels              // 创建频道
POST   /api/groups/:id/members               // 添加成员
DELETE /api/groups/:id/members/:userId       // 移除成员
GET    /api/groups/:id/channels/:channelId/messages  // 获取消息
POST   /api/groups/:id/channels/:channelId/messages  // 发送消息
```

### 全局变量
```javascript
const activeUsers = new Map();    // 活跃用户映射
const roomUsers = new Map();      // 房间用户映射
const JWT_SECRET = 'your-secret-key-here';  // JWT 密钥
```

### Socket.io 事件处理
```javascript
// 连接事件
'connection'         // 用户连接
'user-join'          // 用户加入
'join-channel'       // 加入频道
'leave-channel'      // 离开频道
'send-message'       // 发送消息
'typing-start'       // 开始输入
'typing-stop'        // 停止输入
'disconnect'         // 断开连接
```

## 服务器端路由详细说明

### 认证路由参数和返回值

#### POST /api/auth/login
- **参数**: `{ username: string, password: string }`
- **返回**: `{ success: boolean, user?: User, token?: string, message?: string }`
- **用途**: 用户登录认证

#### POST /api/auth/register
- **参数**: `{ username: string, email: string, password: string }`
- **返回**: `{ success: boolean, user?: User, message: string }`
- **用途**: 新用户注册

#### GET /api/auth/users
- **参数**: 无
- **返回**: `{ success: boolean, users: User[] }`
- **用途**: 获取所有用户列表（管理员功能）

### 群组路由参数和返回值

#### GET /api/groups
- **参数**: 无
- **返回**: `{ success: boolean, groups: Group[] }`
- **用途**: 获取当前用户的群组列表

#### POST /api/groups
- **参数**: `{ name: string, description?: string }`
- **返回**: `{ success: boolean, group: Group }`
- **用途**: 创建新群组（需要管理员权限）

#### POST /api/groups/:groupId/channels
- **参数**: `{ name: string, description?: string }`
- **返回**: `{ success: boolean, channel: Channel }`
- **用途**: 在群组中创建新频道

## 客户端与服务器交互详细说明

### 认证流程
1. **用户登录**:
   - 客户端发送 POST 请求到 `/api/auth/login`
   - 服务器验证凭据并返回 JWT 令牌
   - 客户端存储令牌和用户信息到 localStorage
   - AuthService 更新 currentUser BehaviorSubject

2. **权限验证**:
   - 每个受保护的请求都携带 Authorization 头
   - 服务器中间件验证 JWT 令牌
   - 根据用户角色进行权限检查

### 群组管理流程
1. **创建群组**:
   - Dashboard 组件调用 GroupService.createGroup()
   - 服务端验证权限并创建群组
   - 客户端更新本地群组列表

2. **加入频道**:
   - Chat 组件发送 'join-channel' Socket 事件
   - 服务器将用户加入 Socket.io 房间
   - 广播用户加入消息给频道内其他用户

### 实时消息流程
1. **发送消息**:
   - Chat 组件调用 GroupService.sendMessage()
   - 同时发送 'send-message' Socket 事件
   - 服务器验证权限并存储消息
   - 广播 'receive-message' 给频道内所有用户

2. **接收消息**:
   - Chat 组件监听 'receive-message' 事件
   - 更新本地消息列表
   - 自动滚动到最新消息

### 数据同步策略
- **本地存储**: 使用 localStorage 持久化用户状态
- **实时更新**: Socket.io 确保消息实时同步
- **错误处理**: 网络错误时显示用户友好的错误信息
- **重连机制**: Socket 连接断开时自动重连

## 权限管理系统

### 三级权限结构

#### 1. 超级管理员 (super-admin)
- **权限**:
  - 访问所有群组和频道
  - 提升用户为群组管理员或超级管理员
  - 删除任意用户
  - 查看和管理所有系统资源

#### 2. 群组管理员 (group-admin)
- **权限**:
  - 创建群组
  - 管理自己创建的群组
  - 在群组内创建和管理频道
  - 添加/移除群组成员
  - 删除群组内的用户

#### 3. 普通用户 (user)
- **权限**:
  - 查看已加入的群组
  - 在群组频道内发送消息
  - 离开群组
  - 删除自己的账户

### 权限验证实现

#### 客户端权限控制
```typescript
// AuthService 中的权限检查方法
isSuperAdmin(): boolean {
  return this.hasRole('super-admin');
}

isGroupAdmin(): boolean {
  return this.hasRole('group-admin');
}

hasRole(role: string): boolean {
  const user = this.getCurrentUser();
  return user ? user.roles.includes(role) : false;
}
```

#### 服务器端权限验证
```javascript
// 权限检查函数
function hasPermission(user, group, action) {
  switch (action) {
    case 'manage':
      return user.roles.includes('super-admin') ||
             group.adminIds.includes(user.id);
    case 'view':
      return user.roles.includes('super-admin') ||
             group.memberIds.includes(user.id) ||
             group.adminIds.includes(user.id);
  }
}
```

## 项目启动说明

### 环境要求
- Node.js 16+
- npm 8+
- Angular CLI 17+

### 安装和运行步骤

#### 1. 安装依赖
```bash
# 安装服务器端依赖
cd server
npm install

# 安装客户端依赖
cd ../client
npm install
```

#### 2. 启动服务器
```bash
cd server
npm run dev    # 开发模式
# 或
npm start      # 生产模式
```
服务器将在 http://localhost:3000 启动

#### 3. 启动客户端
```bash
cd client
npm start
```
客户端将在 http://localhost:4200 启动

### 默认登录信息
- **超级管理员**:
  - 用户名: `super`
  - 密码: `123`

## 功能特性

### 已实现功能
- ✅ 用户认证和权限管理
- ✅ 群组创建和管理
- ✅ 频道创建和管理
- ✅ 实时文本聊天
- ✅ 用户管理（增删改查）
- ✅ 响应式界面设计

### 第二阶段规划功能
- 🔄 MongoDB 数据库集成
- 🔄 Socket.io 实时通信优化
- 🔄 图像上传和显示
- 🔄 视频聊天功能 (PeerJS)
- 🔄 聊天历史记录
- 🔄 文件共享

## 测试说明

### 测试用例

#### 1. 用户认证测试
- 使用默认管理员账户登录
- 创建新用户账户
- 验证权限控制

#### 2. 群组管理测试
- 创建新群组
- 添加用户到群组
- 创建频道
- 管理权限验证

#### 3. 聊天功能测试
- 发送和接收消息
- 多用户同时聊天
- 频道切换功能

### 运行测试
```bash
# 客户端测试
cd client
npm test

# 服务器端测试
cd server
npm test
```

## 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交变更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 作者

- **yingzi** - *初始开发* - [yingzi4f@hotmail.com](mailto:yingzi4f@hotmail.com)

## 致谢

- Angular 团队提供优秀的前端框架
- Express.js 和 Node.js 社区的支持
- Socket.io 实时通信解决方案
- 课程导师的指导和建议

---

**注意**: 这是第一阶段的实现，使用本地存储。第二阶段将集成 MongoDB 数据库、Socket.io 实时通信优化和多媒体功能支持。