# Angular Chat Application - 第二阶段

一个基于Angular和Node.js的实时聊天应用，支持群组聊天、频道管理和用户权限控制。现已集成MongoDB数据库、Socket.io实时通信和增强的文件管理功能。

## 🚀 功能特性

### 已实现功能 (第二阶段)
- ✅ **用户认证**: 注册、登录、JWT权限管理
- ✅ **群组管理**: 创建群组、管理成员、权限控制
- ✅ **实时聊天**: Socket.io实现的实时消息传递
- ✅ **频道系统**: 支持多频道聊天和管理
- ✅ **文件上传**: 图片和文件分享功能
- ✅ **管理面板**: 超级管理员和群组管理员功能
- ✅ **MongoDB集成**: 完整的数据库存储和查询
- ✅ **群组申请系统**: 用户申请加入群组的完整流程
- ✅ **在线状态管理**: 实时用户在线状态追踪
- ✅ **头像系统**: 用户头像上传和管理

## 🏗️ 技术栈

### 前端
- Angular 17
- TypeScript
- Socket.IO Client
- Angular CDK
- RxJS

### 后端
- Node.js 18+
- Express.js
- MongoDB (Mongoose ODM)
- Socket.io 4.x
- JWT认证
- bcryptjs密码加密
- Multer文件上传

### 测试
- **单元测试**: Jasmine + Karma (前端), Jest (后端)
- **集成测试**: Jest + Supertest
- **E2E测试**: Playwright
- **覆盖率**: 目标 75%+ 外部功能，50%+ 组件和服务

## 📦 安装和运行

### 前置要求
- Node.js 18.x 或更高版本
- MongoDB 7.0+ (本地安装或Docker)
- npm 或 yarn
- Git (用于版本控制)

### 快速开始

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd Angular
   ```

2. **安装依赖**
   ```bash
   # 安装前端依赖
   cd client
   npm install

   # 安装后端依赖
   cd ../server
   npm install
   ```

3. **启动MongoDB数据库**
   ```bash
   # 方法1: 使用Docker (推荐)
   docker run -d --name mongodb -p 27017:27017 mongo:7.0

   # 方法2: 本地MongoDB服务
   sudo systemctl start mongod  # Linux
   # 或
   brew services start mongodb-community  # macOS
   ```

4. **配置环境变量**
   ```bash
   # 在server目录创建.env文件
   cd server
   cp .env.example .env
   # 编辑.env文件，配置MongoDB连接
   ```

5. **启动应用**
   ```bash
   # 启动后端服务 (端口3000)
   cd server
   npm run dev

   # 新开终端，启动前端服务 (端口4200)
   cd client
   npm start
   ```

6. **访问应用**
   - 前端: http://localhost:4200
   - 后端API: http://localhost:3000/api
   - MongoDB: localhost:27017

### 默认管理员账户
应用首次启动时会自动创建超级管理员账户：
- 用户名: `super`
- 密码: `123456`
- 邮箱: `super@admin.com`

## 🧪 测试

### 快速开始测试
```bash
# 运行所有测试（推荐）
node test-runner.js --install --all

# 查看测试报告
node generate-test-summary.js
```

### 测试覆盖率现状
- ✅ **前端组件/服务**: 目标 ≥50%, 已实现完整测试套件
- ✅ **后端API功能**: 目标 ≥75%, 已实现完整集成测试
- ✅ **E2E用户流程**: 覆盖所有主要业务场景

### 测试文档
- 📖 **[完整测试文档](docs/TESTING.md)** - 详细测试架构和最佳实践
- 🚀 **[测试快速入门](docs/TESTING-QUICKSTART.md)** - 5分钟上手指南

### 分别运行测试
```bash
# 前端单元测试
cd client && npm test

# 后端集成测试
cd server && npm test

# E2E端到端测试
cd client && npm run e2e
```

## 数据结构设计 (第二阶段 - MongoDB集成)

### 客户端数据结构

#### 用户模型 (User)
```typescript
interface User {
  id?: string;               // 客户端ID（可选）
  _id?: string;              // MongoDB ObjectId
  username: string;          // 用户名（唯一）
  email: string;             // 电子邮件（唯一）
  roles: string[];           // 角色数组 ['user', 'group-admin', 'super-admin']
  groups: string[];          // 用户所属群组ID数组
  avatar?: string;           // 用户头像URL（新增）
  isOnline?: boolean;        // 在线状态（新增）
  lastSeen?: Date;           // 最后在线时间（新增）
  createdAt?: Date;          // 创建时间
  updatedAt?: Date;          // 更新时间
}
```

#### 群组模型 (Group)
```typescript
interface Group {
  id?: string;               // 客户端ID（可选）
  _id?: string;              // MongoDB ObjectId
  name: string;              // 群组名称
  description?: string;      // 群组描述
  adminIds: any[];           // 管理员ID数组（可能包含User对象）
  memberIds: any[];          // 成员ID数组（可能包含User对象）
  pendingApplications?: GroupApplication[]; // 待审核申请（新增）
  channels: Channel[];       // 频道数组
  createdBy: any;            // 创建者ID或User对象
  isPrivate?: boolean;       // 是否私有群组（新增）
  maxMembers?: number;       // 最大成员数（新增）
  createdAt?: Date | string; // 创建时间
  updatedAt?: Date | string; // 更新时间
  __v?: number;              // MongoDB版本号
}
```

#### 频道模型 (Channel)
```typescript
interface Channel {
  id?: string;               // 客户端ID（可选）
  _id?: string;              // MongoDB ObjectId
  name: string;              // 频道名称
  description?: string;      // 频道描述
  groupId: string;           // 所属群组ID
  memberIds: string[];       // 成员ID数组
  messages?: Message[];      // 消息数组（可选）
  createdAt?: Date;          // 创建时间
  updatedAt?: Date;          // 更新时间
}
```

#### 消息模型 (Message)
```typescript
interface Message {
  id?: string;               // 客户端ID（可选）
  _id?: string;              // MongoDB ObjectId
  content: string;           // 消息内容
  senderId: string;          // 发送者ID
  senderUsername: string;    // 发送者用户名
  channelId: string;         // 所属频道ID
  timestamp?: Date;          // 时间戳（可选）
  createdAt?: Date;          // 创建时间
  type: 'text' | 'image' | 'file';  // 消息类型
  fileUrl?: string;          // 文件URL（可选）
  fileName?: string;         // 文件名（新增）
  fileSize?: number;         // 文件大小（新增）
  mimeType?: string;         // MIME类型（新增）
}
```

#### 群组申请模型 (GroupApplication) - 新增
```typescript
interface GroupApplication {
  id?: string;               // 客户端ID（可选）
  _id?: string;              // MongoDB ObjectId
  groupId: string;           // 群组ID
  userId: string;            // 申请用户ID
  username: string;          // 申请用户名
  status: 'pending' | 'approved' | 'rejected'; // 申请状态
  appliedAt: Date | string;  // 申请时间
  reviewedBy?: string;       // 审核人ID（可选）
  reviewedAt?: Date | string;// 审核时间（可选）
  message?: string;          // 申请消息（可选）
}
```

### 服务器端数据结构 (第二阶段 - MongoDB)

服务器端使用MongoDB数据库存储，采用Mongoose ODM进行数据模型定义：

#### MongoDB Collections
- **users**: 用户数据集合
- **groups**: 群组数据集合
- **channels**: 频道数据集合
- **messages**: 消息数据集合
- **groupapplications**: 群组申请数据集合

#### Schema特性
- **自动时间戳**: 所有模型包含 `createdAt` 和 `updatedAt`
- **数据验证**: 字段长度、格式、必填验证
- **索引优化**: 查询字段建立索引提升性能
- **关联查询**: 使用populate进行关联数据查询
- **密码加密**: 用户密码使用bcrypt自动加密

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

### 默认管理员信息
应用启动时自动创建：
- **超级管理员**:
  - 用户名: `super`
  - 密码: `123456`
  - 邮箱: `super@admin.com`

## 功能特性

### 已实现功能 (第二阶段完整版)
- ✅ 用户认证和权限管理 (JWT + bcrypt)
- ✅ 群组创建和管理 (MongoDB集成)
- ✅ 频道创建和管理 (自动创建默认频道)
- ✅ 实时文本聊天 (Socket.io优化)
- ✅ 用户管理系统 (完整CRUD操作)
- ✅ 群组申请审批流程 (新增功能)
- ✅ 文件上传和分享 (图片/文件支持)
- ✅ 用户在线状态管理 (实时状态)
- ✅ 头像系统 (用户头像上传)
- ✅ 响应式界面设计 (移动端友好)

### 未来规划功能 (第三阶段)
- 📋 视频聊天功能 (PeerJS/WebRTC)
- 📋 消息搜索和过滤
- 📋 消息编辑和删除
- 📋 emoji表情支持
- 📋 消息通知系统
- 📋 移动端适配
- 📋 多语言支持
- 📋 主题定制

## 🔧 开发工具

### 代码质量
- **ESLint**: TypeScript/JavaScript代码检查
- **Prettier**: 代码格式化
- **Husky**: Git hooks自动化
- **Angular CLI**: 开发工具链

### CI/CD
- **GitHub Actions**: 自动化测试和部署
- **Codecov**: 覆盖率报告
- **CodeQL**: 安全扫描

## 📁 项目结构

```
Angular/
├── client/                 # Angular前端应用
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # Angular组件
│   │   │   │   ├── login/login.component.spec.ts
│   │   │   │   └── dashboard/dashboard.component.spec.ts
│   │   │   ├── services/   # Angular服务
│   │   │   │   ├── auth.service.spec.ts
│   │   │   │   └── group.service.spec.ts
│   │   │   ├── models/     # TypeScript模型
│   │   │   └── ...
│   │   └── ...
│   ├── e2e/               # E2E测试文件
│   │   ├── fixtures.ts    # 测试工具和数据
│   │   ├── auth.spec.ts   # 认证流程测试
│   │   ├── dashboard.spec.ts # 仪表板测试
│   │   └── chat.spec.ts   # 聊天功能测试
│   ├── karma.conf.js      # 单元测试配置
│   ├── playwright.config.ts # E2E测试配置
│   └── package.json
├── server/                # Node.js后端应用
│   ├── routes/           # Express路由
│   ├── models/           # 数据模型
│   ├── middleware/       # 中间件
│   ├── tests/           # 集成测试
│   │   ├── auth.test.js  # 认证API测试
│   │   ├── groups.test.js # 群组API测试
│   │   └── setup.js     # 测试环境配置
│   ├── jest.config.js   # Jest配置
│   └── package.json
├── docs/               # 项目文档
│   ├── TESTING.md      # 完整测试文档
│   └── TESTING-QUICKSTART.md # 测试快速入门
├── .github/workflows/   # GitHub Actions
│   └── ci.yml          # CI/CD配置
├── test-runner.js      # 统一测试运行器
├── generate-test-summary.js # 测试报告生成器
└── README.md
```

## 🤝 贡献指南

### 开发流程
1. **Fork项目并创建分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **开发新功能（推荐TDD）**
   ```bash
   # 先写测试
   npm test -- --watch

   # 实现功能让测试通过
   # 重构和优化
   ```

3. **确保测试通过**
   ```bash
   # 运行所有测试
   node test-runner.js --all

   # 检查覆盖率
   node generate-test-summary.js
   ```

4. **提交代码**
   ```bash
   git commit -m 'feat: add amazing feature'
   git push origin feature/amazing-feature
   ```

5. **创建Pull Request**

### 贡献要求
- ✅ 所有测试必须通过
- ✅ 新功能必须包含相应测试
- ✅ 保持或提高代码覆盖率
- ✅ 遵循现有代码风格
- ✅ 更新相关文档

### 测试要求
- **新增组件**: 必须包含单元测试
- **新增API**: 必须包含集成测试
- **新增功能**: 必须包含E2E测试
- **Bug修复**: 必须包含回归测试

### 代码审查清单
- [ ] 功能完整实现
- [ ] 测试覆盖充分
- [ ] 代码风格一致
- [ ] 性能无显著下降
- [ ] 文档已更新

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

## 🔄 版本历史

### 第二阶段 (当前版本)
- ✅ 集成MongoDB数据库存储
- ✅ 完整的Socket.io实时通信
- ✅ 群组申请审批系统
- ✅ 文件上传和头像功能
- ✅ 用户在线状态管理
- ✅ 完整的测试覆盖 (75%+ 后端，50%+ 前端)

### 第一阶段 (已完成)
- ✅ 基础Angular前端架构
- ✅ Node.js + Express后端
- ✅ 本地JSON文件存储
- ✅ 基础用户认证和权限管理
- ✅ 群组和频道基础功能

**当前状态**: 第二阶段开发完成，系统稳定运行，准备进入第三阶段功能扩展。