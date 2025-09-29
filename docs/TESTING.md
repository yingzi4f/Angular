# 测试文档

## 📋 概述

本项目实现了全面的三层测试架构，确保代码质量和功能稳定性。测试覆盖率目标：
- **外部功能覆盖率**: ≥ 75%
- **Angular组件/服务覆盖率**: ≥ 50%
- **后端API覆盖率**: ≥ 80%
- **E2E测试**: 覆盖所有主要用户流程

## 🏗️ 测试架构

### 测试金字塔

```
       /\
      /  \     E2E Tests (端到端测试)
     /____\    - Playwright
    /      \   - 用户流程验证
   /________\  - 跨浏览器测试
  /          \
 / Integration \ Integration Tests (集成测试)
/______________\ - Jest + Supertest
/              \ - API端点测试
/    Unit Tests  \ - 数据库集成测试
/__________________\
Unit Tests (单元测试)
- Jasmine + Karma (前端)
- Jest (后端)
- 组件和服务测试
```

## 🧪 测试类型详解

### 1. 单元测试 (Unit Tests)

#### 前端单元测试
**技术栈**: Jasmine + Karma + Angular Testing Utilities

**测试文件位置**:
```
client/src/app/
├── services/
│   ├── auth.service.spec.ts
│   └── group.service.spec.ts
└── components/
    ├── login/login.component.spec.ts
    └── dashboard/dashboard.component.spec.ts
```

**主要测试内容**:

##### AuthService 测试
- ✅ 用户登录和注册
- ✅ JWT令牌管理
- ✅ 权限检查 (isSuperAdmin, isGroupAdmin)
- ✅ 用户状态管理
- ✅ localStorage集成
- ✅ HTTP错误处理

```typescript
// 示例测试用例
it('should login successfully and store user data', () => {
  service.login(mockLoginRequest).subscribe(response => {
    expect(response).toEqual(mockLoginResponse);
    expect(service.getCurrentUser()).toEqual(mockUser);
    expect(localStorage.getItem('token')).toEqual('mock-jwt-token');
  });
});
```

##### GroupService 测试
- ✅ 群组CRUD操作
- ✅ 频道管理
- ✅ 成员管理
- ✅ 消息发送和接收
- ✅ 文件上传
- ✅ 权限验证集成

##### 组件测试
- ✅ LoginComponent: 表单验证、用户交互、错误处理
- ✅ DashboardComponent: 数据展示、权限控制、管理功能

#### 后端单元测试
**技术栈**: Jest + MongoDB Memory Server

**测试文件位置**:
```
server/tests/
├── auth.test.js
├── groups.test.js
└── setup.js
```

### 2. 集成测试 (Integration Tests)

#### API集成测试
**技术栈**: Jest + Supertest + MongoDB Memory Server

**测试覆盖**:

##### 认证API (`/api/auth`)
```javascript
// 测试用例示例
describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
  });
});
```

测试场景：
- ✅ 用户登录/注册
- ✅ JWT令牌验证
- ✅ 用户权限提升
- ✅ 用户删除
- ✅ 管理员创建用户

##### 群组API (`/api/groups`)
测试场景：
- ✅ 群组创建和管理
- ✅ 成员添加/移除
- ✅ 频道创建和管理
- ✅ 消息发送和接收
- ✅ 权限控制验证
- ✅ 错误处理

#### 数据库集成测试
- ✅ MongoDB Memory Server隔离环境
- ✅ 数据持久化验证
- ✅ 事务处理测试
- ✅ 数据一致性检查

### 3. E2E测试 (End-to-End Tests)

#### 技术栈
**Playwright** - 跨浏览器端到端测试

**测试文件位置**:
```
client/e2e/
├── fixtures.ts          # 测试数据和工具函数
├── auth.spec.ts         # 认证流程测试
├── dashboard.spec.ts    # 仪表板功能测试
└── chat.spec.ts        # 聊天功能测试
```

#### 浏览器支持
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari/WebKit
- ✅ 移动端Chrome (Pixel 5)

#### 测试场景

##### 用户认证流程 (`auth.spec.ts`)
```typescript
test('should login with valid super admin credentials', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="username"]', 'super');
  await page.fill('[name="password"]', '123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('.role-badge')).toContainText('超级管理员');
});
```

测试用例：
- ✅ 登录表单验证
- ✅ 成功登录和重定向
- ✅ 注册新用户
- ✅ 登出功能
- ✅ 权限验证
- ✅ 错误处理

##### 仪表板功能 (`dashboard.spec.ts`)
测试用例：
- ✅ 用户信息显示
- ✅ 群组列表和管理
- ✅ 管理员权限控制
- ✅ 用户管理功能
- ✅ 群组创建和删除
- ✅ 响应式设计

##### 聊天功能 (`chat.spec.ts`)
测试用例：
- ✅ 聊天界面加载
- ✅ 消息发送和接收
- ✅ 频道切换
- ✅ 成员管理
- ✅ 实时功能
- ✅ 键盘导航

## 🛠️ 测试工具和配置

### 配置文件详解

#### 前端测试配置 (`karma.conf.js`)
```javascript
coverageReporter: {
  check: {
    global: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75
    }
  }
}
```

#### 后端测试配置 (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

#### E2E测试配置 (`playwright.config.ts`)
```typescript
export default defineConfig({
  webServer: [
    { command: 'npm start', port: 4200 },  // 前端服务器
    { command: 'npm start', port: 3000 }   // 后端服务器
  ],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry'
  }
});
```

### 测试数据管理

#### 前端测试数据
```typescript
const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  roles: ['user']
};

const testUsers = {
  superAdmin: { username: 'super', password: '123' },
  groupAdmin: { username: 'admin', password: 'password123' },
  regularUser: { username: 'testuser', password: 'password123' }
};
```

#### 后端测试数据
- MongoDB Memory Server提供隔离环境
- 每个测试后自动清理数据
- 预置测试用户和群组数据

## 🚀 运行测试

### 统一测试运行器

**基本用法**:
```bash
# 运行所有测试
node test-runner.js --install --all

# 仅运行单元测试
node test-runner.js

# 仅运行E2E测试
node test-runner.js --e2e

# 跳过单元测试，仅运行E2E
node test-runner.js --skip-unit --e2e
```

**选项说明**:
- `--install`: 运行测试前安装依赖
- `--all`: 运行所有类型的测试
- `--e2e`: 运行E2E测试
- `--skip-unit`: 跳过单元测试
- `--help`: 显示帮助信息

### 分别运行测试

#### 前端单元测试
```bash
cd client

# 交互模式
npm test

# 单次运行 + 覆盖率
npm run test:coverage

# CI模式
npm test -- --watch=false --browsers=ChromeHeadless
```

#### 后端集成测试
```bash
cd server

# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

#### E2E测试
```bash
cd client

# 无头模式
npm run e2e

# 有界面模式（调试用）
npm run e2e:headed

# 可视化测试工具
npm run e2e:ui
```

## 📊 测试报告和覆盖率

### 覆盖率报告生成

#### 前端覆盖率
- **位置**: `client/coverage/`
- **格式**: HTML, LCOV, JSON
- **阈值**: 75% 语句、70% 分支、75% 函数、75% 行

#### 后端覆盖率
- **位置**: `server/coverage/`
- **格式**: HTML, LCOV, JSON
- **阈值**: 80% 整体覆盖率

#### E2E测试报告
- **位置**: `client/playwright-report/`
- **包含**: 测试结果、截图、视频、追踪信息

### 自动报告生成

```bash
# 生成综合测试报告
node generate-test-summary.js
```

生成文件：
- `test-summary.json`: JSON格式详细数据
- `TEST-REPORT.md`: Markdown格式可读报告

## 🔄 持续集成 (CI/CD)

### GitHub Actions配置

**工作流文件**: `.github/workflows/ci.yml`

**流水线阶段**:
1. **代码检出和环境设置**
2. **依赖安装和缓存**
3. **代码检查和构建**
4. **单元测试执行**
5. **集成测试执行**
6. **E2E测试执行**
7. **覆盖率报告上传**
8. **安全扫描**
9. **部署准备**

**矩阵测试**: Node.js 18.x 和 20.x

**服务依赖**: MongoDB 7.0

### 覆盖率集成

**Codecov集成**:
- 自动上传覆盖率报告
- 前端和后端分别标记
- PR中显示覆盖率变化
- 覆盖率下降时阻止合并

## 🐛 调试和故障排除

### 常见问题

#### 测试环境问题
1. **MongoDB连接失败**
   ```bash
   # 确保MongoDB服务运行
   sudo systemctl start mongod

   # 或使用Docker
   docker run -d -p 27017:27017 mongo:7.0
   ```

2. **端口占用**
   ```bash
   # 检查端口占用
   lsof -i :3000
   lsof -i :4200

   # 终止占用进程
   kill -9 <PID>
   ```

3. **依赖版本冲突**
   ```bash
   # 清理并重新安装
   rm -rf node_modules package-lock.json
   npm install
   ```

#### 前端测试问题
1. **Chrome启动失败**
   ```bash
   # 安装Chrome（Ubuntu）
   wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   sudo apt-get install google-chrome-stable
   ```

2. **Angular测试超时**
   ```javascript
   // 在测试中增加超时时间
   beforeEach(async () => {
     jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
   });
   ```

#### E2E测试问题
1. **Playwright浏览器未安装**
   ```bash
   npx playwright install
   ```

2. **测试超时**
   ```typescript
   // 在playwright.config.ts中增加超时
   export default defineConfig({
     timeout: 60000,
     expect: { timeout: 10000 }
   });
   ```

### 调试技巧

#### 前端调试
```bash
# 启用详细日志
npm test -- --verbose

# 在浏览器中查看测试
npm test -- --watch --browsers=Chrome
```

#### 后端调试
```bash
# 启用调试模式
DEBUG=* npm test

# 仅运行特定测试
npm test -- --testNamePattern="login"
```

#### E2E调试
```bash
# 有界面模式观察测试执行
npm run e2e:headed

# 使用调试模式
npx playwright test --debug

# 生成测试代码
npx playwright codegen localhost:4200
```

## 📈 测试最佳实践

### 编写测试的原则

1. **AAA模式** (Arrange-Act-Assert)
   ```typescript
   it('should calculate total correctly', () => {
     // Arrange
     const calculator = new Calculator();
     const numbers = [1, 2, 3];

     // Act
     const result = calculator.sum(numbers);

     // Assert
     expect(result).toBe(6);
   });
   ```

2. **测试命名规范**
   - 使用描述性名称
   - 说明测试条件和预期结果
   - 使用"should"语句格式

3. **测试隔离**
   - 每个测试独立运行
   - 不依赖其他测试的状态
   - 使用beforeEach/afterEach清理

4. **Mock和Stub使用**
   ```typescript
   // 模拟HTTP请求
   const httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
   httpSpy.get.and.returnValue(of(mockData));
   ```

### 测试覆盖率优化

1. **重点测试业务逻辑**
2. **覆盖边界条件**
3. **测试错误处理路径**
4. **验证用户交互**
5. **测试异步操作**

### 性能优化

1. **并行执行测试**
2. **使用测试数据缓存**
3. **优化测试环境启动时间**
4. **合理使用测试mock**

## 🔮 测试策略演进

### 短期计划
- ✅ 达到覆盖率目标
- ✅ 建立CI/CD流水线
- ✅ 完善E2E测试场景

### 中期计划
- 🔄 性能测试集成
- 🔄 视觉回归测试
- 🔄 API契约测试
- 🔄 负载测试

### 长期计划
- 📋 测试数据管理平台
- 📋 智能测试生成
- 📋 测试结果分析和优化
- 📋 测试环境自动化

---

本测试文档将随着项目发展持续更新，确保测试策略与项目需求保持同步。如有疑问或建议，请参考项目README或提交Issue。