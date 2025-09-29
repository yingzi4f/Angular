# 测试快速入门指南

## 🚀 5分钟快速开始

### 1. 环境准备
```bash
# 确保已安装依赖
cd client && npm install
cd ../server && npm install
```

### 2. 运行所有测试
```bash
# 一键运行所有测试（推荐）
node test-runner.js --install --all
```

### 3. 查看测试结果
```bash
# 生成测试报告
node generate-test-summary.js

# 查看覆盖率报告
open client/coverage/index.html      # macOS
xdg-open client/coverage/index.html  # Linux
start client/coverage/index.html     # Windows
```

## 📋 常用命令速查

### 单元测试
```bash
# 前端单元测试
cd client && npm test

# 后端集成测试
cd server && npm test

# 带覆盖率报告
cd client && npm run test:coverage
cd server && npm run test:coverage
```

### E2E测试
```bash
# 无头模式（快速）
cd client && npm run e2e

# 有界面模式（调试）
cd client && npm run e2e:headed

# 可视化工具
cd client && npm run e2e:ui
```

### 测试运行器选项
```bash
node test-runner.js --help           # 查看所有选项
node test-runner.js                  # 仅单元测试
node test-runner.js --e2e            # 仅E2E测试
node test-runner.js --skip-unit --e2e # 跳过单元测试
```

## 🎯 覆盖率目标检查

当前目标：
- ✅ **前端组件/服务**: ≥ 50%
- ✅ **后端API功能**: ≥ 75%
- ✅ **E2E用户流程**: 100%

快速检查：
```bash
# 检查前端覆盖率
cd client && npm run test:coverage | grep "All files"

# 检查后端覆盖率
cd server && npm run test:coverage | grep "All files"

# 生成汇总报告
node generate-test-summary.js
```

## 🔧 故障排除

### 常见问题速解

#### MongoDB连接失败
```bash
# 启动MongoDB（Docker）
docker run -d -p 27017:27017 mongo:7.0

# 或使用本地MongoDB
sudo systemctl start mongod
```

#### 端口占用
```bash
# 检查并终止占用进程
lsof -ti:3000 | xargs kill -9
lsof -ti:4200 | xargs kill -9
```

#### Chrome/浏览器问题
```bash
# 重新安装Playwright浏览器
cd client && npx playwright install
```

#### 依赖问题
```bash
# 清理重装（核武器选项）
rm -rf node_modules package-lock.json
npm install
```

## 📊 测试类型概览

| 测试类型 | 技术栈 | 运行时间 | 用途 |
|----------|--------|----------|------|
| **单元测试** | Jasmine/Jest | ~30秒 | 组件和服务功能验证 |
| **集成测试** | Jest + Supertest | ~1分钟 | API端点和数据库交互 |
| **E2E测试** | Playwright | ~3分钟 | 完整用户流程验证 |

## 🎨 开发中的测试工作流

### 开发新功能时
1. **先写测试** (TDD推荐)
   ```bash
   # 运行失败的测试
   cd client && npm test -- --watch
   ```

2. **实现功能**
   ```typescript
   // 让测试通过的最小实现
   ```

3. **重构和优化**
   ```bash
   # 确保测试持续通过
   npm test
   ```

### 修复Bug时
1. **添加复现Bug的测试**
2. **修复Bug直到测试通过**
3. **检查覆盖率没有下降**

### 重构代码时
1. **运行所有相关测试**
2. **确保测试100%通过**
3. **检查性能没有显著下降**

## 🔍 测试调试技巧

### 前端调试
```bash
# 在浏览器中调试单个测试
cd client && npm test -- --watch --browsers=Chrome

# 查看详细错误信息
npm test -- --verbose
```

### 后端调试
```bash
# 启用调试日志
DEBUG=* npm test

# 运行单个测试文件
npm test auth.test.js
```

### E2E调试
```bash
# 慢速执行观察过程
npx playwright test --headed --slowMo=1000

# 调试模式（暂停执行）
npx playwright test --debug

# 生成失败时的截图和视频
npx playwright test --trace=on
```

## 📈 CI/CD集成

### 本地模拟CI环境
```bash
# 模拟CI环境运行
CI=true node test-runner.js --all

# 检查构建是否通过
cd client && npm run build
cd server && npm test
```

### 提交前检查清单
- [ ] 所有测试通过
- [ ] 覆盖率达标
- [ ] 代码格式化
- [ ] 无TypeScript错误
- [ ] E2E测试通过

```bash
# 一键检查脚本
node test-runner.js --all && echo "✅ 准备提交！"
```

## 🎯 下一步

- 📖 阅读完整 [测试文档](TESTING.md)
- 🔧 配置IDE测试插件
- 📊 设置测试覆盖率监控
- 🤖 配置自动化测试提醒

---

**提示**: 将此页面加入书签，开发时随时参考！

有问题？查看 [完整测试文档](TESTING.md) 或提交 Issue。