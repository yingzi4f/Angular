# 测试示例和最佳实践

## 📚 测试示例集合

### 前端单元测试示例

#### Angular服务测试
```typescript
// auth.service.spec.ts - 完整示例
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('login', () => {
    it('should login successfully and store user data', () => {
      const mockCredentials = { username: 'test', password: 'pass' };
      const mockResponse = {
        success: true,
        user: { id: '1', username: 'test', roles: ['user'] },
        token: 'jwt-token'
      };

      service.login(mockCredentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.getCurrentUser()).toEqual(mockResponse.user);
        expect(localStorage.getItem('token')).toEqual('jwt-token');
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCredentials);
      req.flush(mockResponse);
    });
  });
});
```

#### Angular组件测试
```typescript
// login.component.spec.ts - 组件交互测试
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, FormsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should login and navigate on success', () => {
    const mockResponse = { success: true, user: null, token: 'token' };
    authService.login.and.returnValue(of(mockResponse));

    component.credentials = { username: 'test', password: 'pass' };
    component.onLogin();

    expect(authService.login).toHaveBeenCalledWith(component.credentials);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show error message on login failure', () => {
    const mockResponse = { success: false, message: 'Invalid credentials' };
    authService.login.and.returnValue(of(mockResponse));

    component.credentials = { username: 'test', password: 'wrong' };
    component.onLogin();

    expect(component.errorMessage).toBe('Invalid credentials');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
```

### 后端集成测试示例

#### API端点测试
```javascript
// auth.test.js - 完整API测试示例
const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
  beforeEach(async () => {
    // 设置测试数据
    await dataStore.createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      roles: ['user']
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名或密码错误');
    });
  });
});
```

#### 中间件测试
```javascript
// middleware/auth.test.js - 中间件单独测试
const { authenticateToken, generateToken } = require('../middleware/auth');

describe('Auth Middleware', () => {
  it('should generate and verify JWT token', () => {
    const user = { id: '1', username: 'test', roles: ['user'] };
    const token = generateToken(user);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // 验证令牌
    const req = {
      headers: { authorization: `Bearer ${token}` }
    };
    const res = {};
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.username).toBe('test');
    expect(next).toHaveBeenCalled();
  });
});
```

### E2E测试示例

#### 页面对象模式
```typescript
// e2e/pages/login.page.ts - 页面对象
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async fillCredentials(username: string, password: string) {
    await this.page.fill('[name="username"]', username);
    await this.page.fill('[name="password"]', password);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async getErrorMessage() {
    return await this.page.locator('.error').textContent();
  }

  async isLoginButtonDisabled() {
    return await this.page.locator('button[type="submit"]').isDisabled();
  }
}
```

#### 完整E2E流程测试
```typescript
// e2e/user-journey.spec.ts - 用户旅程测试
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Complete User Journey', () => {
  test('should complete full registration and group creation flow', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // 1. 访问登录页面
    await loginPage.goto();
    await expect(page).toHaveTitle(/聊天系统/);

    // 2. 注册新用户
    await page.click('button:has-text("注册新用户")');
    await page.fill('[name="newUsername"]', 'e2euser');
    await page.fill('[name="email"]', 'e2e@example.com');
    await page.fill('[name="newPassword"]', 'password123');

    page.once('dialog', dialog => dialog.accept());
    await page.click('.register-form button[type="submit"]');

    // 3. 登录
    await loginPage.fillCredentials('e2euser', 'password123');
    await loginPage.submit();

    // 4. 验证进入仪表板
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.username')).toContainText('e2euser');

    // 5. 创建群组（如果有权限）
    const createGroupBtn = page.locator('button:has-text("创建新群组")');
    if (await createGroupBtn.count() > 0) {
      await createGroupBtn.click();
      await page.fill('[name="groupName"]', 'E2E Test Group');
      await page.fill('[name="groupDescription"]', 'Created by E2E test');
      await page.click('.modal button[type="submit"]');

      // 6. 验证群组创建成功
      await expect(page.locator('.group-card').filter({ hasText: 'E2E Test Group' })).toBeVisible();

      // 7. 进入群组聊天
      await page.locator('.group-card').filter({ hasText: 'E2E Test Group' }).click();
      await expect(page).toHaveURL(/\/chat\/.+/);

      // 8. 发送消息
      const messageInput = page.locator('.message-input');
      if (await messageInput.count() > 0) {
        await messageInput.fill('Hello from E2E test!');
        await messageInput.press('Enter');

        await expect(page.locator('.message').filter({
          hasText: 'Hello from E2E test!'
        })).toBeVisible();
      }
    }

    // 9. 登出
    await page.click('button:has-text("退出")');
    await expect(page).toHaveURL('/login');
  });
});
```

## 🎯 测试最佳实践

### 1. 测试命名规范

```typescript
// ❌ 不好的命名
it('test login', () => {});

// ✅ 好的命名
it('should redirect to dashboard when login is successful', () => {});
it('should show error message when credentials are invalid', () => {});
it('should disable submit button when form is incomplete', () => {});
```

### 2. AAA模式 (Arrange-Act-Assert)

```typescript
it('should calculate total price with tax', () => {
  // Arrange - 准备测试数据
  const items = [{ price: 10 }, { price: 20 }];
  const taxRate = 0.1;
  const calculator = new PriceCalculator();

  // Act - 执行被测试的操作
  const total = calculator.calculateTotal(items, taxRate);

  // Assert - 验证结果
  expect(total).toBe(33); // (10 + 20) * 1.1
});
```

### 3. Mock和Spy使用

```typescript
describe('UserService', () => {
  let httpSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: spy }]
    });
    httpSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
  });

  it('should fetch user data', () => {
    const mockUser = { id: 1, name: 'Test' };
    httpSpy.get.and.returnValue(of(mockUser));

    service.getUser(1).subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    expect(httpSpy.get).toHaveBeenCalledWith('/api/users/1');
  });
});
```

### 4. 异步测试处理

```typescript
// Promise测试
it('should handle async operations', async () => {
  const result = await service.asyncOperation();
  expect(result).toBe('expected');
});

// Observable测试
it('should handle observables', () => {
  service.getData().subscribe(data => {
    expect(data).toBeDefined();
  });
});

// 错误处理测试
it('should handle errors gracefully', () => {
  service.riskyOperation().subscribe({
    next: () => fail('should have failed'),
    error: (error) => {
      expect(error.message).toContain('expected error');
    }
  });
});
```

### 5. 测试数据管理

```typescript
// 使用工厂函数创建测试数据
const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  roles: ['user'],
  ...overrides
});

// 使用Builder模式
class UserBuilder {
  private user = { id: '1', username: 'test', roles: ['user'] };

  withRole(role: string) {
    this.user.roles = [role];
    return this;
  }

  withUsername(username: string) {
    this.user.username = username;
    return this;
  }

  build() {
    return { ...this.user };
  }
}

const adminUser = new UserBuilder()
  .withUsername('admin')
  .withRole('super-admin')
  .build();
```

### 6. 边界条件测试

```typescript
describe('boundary conditions', () => {
  it('should handle empty input', () => {
    expect(service.process([])).toEqual([]);
  });

  it('should handle null input', () => {
    expect(service.process(null)).toBeNull();
  });

  it('should handle large datasets', () => {
    const largeArray = new Array(10000).fill(1);
    expect(() => service.process(largeArray)).not.toThrow();
  });

  it('should handle special characters', () => {
    const specialInput = '<script>alert("xss")</script>';
    expect(service.sanitize(specialInput)).not.toContain('<script>');
  });
});
```

## 🚀 性能测试示例

### 组件性能测试
```typescript
it('should render large list efficiently', async () => {
  const largeDataset = new Array(1000).fill(0).map((_, i) => ({ id: i, name: `Item ${i}` }));

  const startTime = performance.now();
  component.items = largeDataset;
  fixture.detectChanges();
  await fixture.whenStable();
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(100); // 100ms内完成
});
```

### API性能测试
```javascript
it('should respond within acceptable time', async () => {
  const startTime = Date.now();

  const response = await request(app)
    .get('/api/groups')
    .expect(200);

  const endTime = Date.now();
  const responseTime = endTime - startTime;

  expect(responseTime).toBeLessThan(500); // 500ms内响应
  expect(response.body.groups).toBeDefined();
});
```

## 🔍 调试技巧

### 前端调试
```typescript
// 在测试中添加调试信息
it('should debug component state', () => {
  component.someMethod();
  console.log('Component state:', component.state);
  fixture.detectChanges();

  // 使用debugElement查看DOM
  const debugElement = fixture.debugElement;
  console.log('DOM:', debugElement.nativeElement.innerHTML);

  expect(component.state).toBe('expected');
});
```

### E2E调试
```typescript
test('should debug page interactions', async ({ page }) => {
  // 启用追踪
  await page.tracing.start({ screenshots: true, snapshots: true });

  await page.goto('/login');

  // 添加调试暂停点
  await page.pause();

  // 截图用于调试
  await page.screenshot({ path: 'debug-screenshot.png' });

  await page.tracing.stop({ path: 'trace.zip' });
});
```

## 📊 覆盖率优化

### 忽略不必要的代码
```typescript
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}

/* istanbul ignore if */
if (typeof window === 'undefined') {
  // SSR环境下的代码
}
```

### 重点测试关键路径
```typescript
// 重点测试业务逻辑
describe('critical business logic', () => {
  it('should handle payment processing correctly', () => {
    // 支付处理的关键逻辑测试
  });

  it('should validate user permissions properly', () => {
    // 权限验证的关键逻辑测试
  });
});
```

---

这些示例展示了如何编写高质量的测试代码，涵盖了从基础的单元测试到复杂的E2E场景。记住，好的测试不仅能发现Bug，还能作为代码的文档和重构的安全网。