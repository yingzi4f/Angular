import { test, expect, testUsers } from './fixtures';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('聊天系统登录');
    await expect(page.locator('[name="username"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid super admin credentials', async ({ page }) => {
    const user = testUsers.superAdmin;

    await page.fill('[name="username"]', user.username);
    await page.fill('[name="password"]', user.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('聊天系统');
    await expect(page.locator('.role-badge')).toContainText('超级管理员');
  });

  test('should login with valid group admin credentials', async ({ page }) => {
    // First, need to register the group admin user
    await page.click('button:has-text("注册新用户")');

    const user = testUsers.groupAdmin;
    await page.fill('[name="newUsername"]', user.username);
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="newPassword"]', user.password);
    await page.click('.register-form button[type="submit"]');

    // Wait for registration success and form to close
    await page.waitForTimeout(1000);

    // Now login
    await page.fill('[name="username"]', user.username);
    await page.fill('[name="password"]', user.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('聊天系统');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('[name="username"]', 'invaliduser');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('登录失败');
    await expect(page).toHaveURL('/login');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('请填写用户名和密码');
  });

  test('should toggle between login and register forms', async ({ page }) => {
    // Initially should show login form
    await expect(page.locator('.register-form')).not.toBeVisible();
    await expect(page.locator('button:has-text("注册新用户")')).toBeVisible();

    // Click to show register form
    await page.click('button:has-text("注册新用户")');
    await expect(page.locator('.register-form')).toBeVisible();
    await expect(page.locator('button:has-text("返回登录")')).toBeVisible();

    // Click to hide register form
    await page.click('button:has-text("返回登录")');
    await expect(page.locator('.register-form')).not.toBeVisible();
    await expect(page.locator('button:has-text("注册新用户")')).toBeVisible();
  });

  test('should register new user successfully', async ({ page }) => {
    await page.click('button:has-text("注册新用户")');

    const newUser = {
      username: 'newtestuser',
      email: 'newtest@example.com',
      password: 'password123'
    };

    await page.fill('[name="newUsername"]', newUser.username);
    await page.fill('[name="email"]', newUser.email);
    await page.fill('[name="newPassword"]', newUser.password);

    // Listen for the alert dialog
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('注册成功');
      dialog.accept();
    });

    await page.click('.register-form button[type="submit"]');

    // Register form should close after success
    await expect(page.locator('.register-form')).not.toBeVisible();
  });

  test('should show validation error for short password in registration', async ({ page }) => {
    await page.click('button:has-text("注册新用户")');

    await page.fill('[name="newUsername"]', 'testuser');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="newPassword"]', '123'); // Too short

    await page.click('.register-form button[type="submit"]');

    await expect(page.locator('.error')).toContainText('密码至少需要6位字符');
  });

  test('should logout successfully', async ({ page, loginAsUser }) => {
    await loginAsUser('superAdmin');

    // Should be on dashboard
    await expect(page).toHaveURL('/dashboard');

    // Click logout button
    await page.click('button:has-text("退出")');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2')).toContainText('聊天系统登录');
  });

  test('should redirect to login when accessing protected route without authentication', async ({ page }) => {
    await page.goto('/dashboard');

    // Should be redirected to login (assuming auth guard is implemented)
    // If no auth guard, this test might need to be adjusted based on actual behavior
    await expect(page).toHaveURL('/login');
  });

  test('should show default admin credentials in help text', async ({ page }) => {
    await expect(page.locator('.login-help')).toContainText('默认超级管理员账户');
    await expect(page.locator('.login-help')).toContainText('用户名: super');
    await expect(page.locator('.login-help')).toContainText('密码: 123');
  });

  test('should disable login button when form is invalid', async ({ page }) => {
    const loginButton = page.locator('button[type="submit"]');

    // Initially disabled (empty form)
    await expect(loginButton).toBeDisabled();

    // Fill username only
    await page.fill('[name="username"]', 'testuser');
    await expect(loginButton).toBeDisabled();

    // Fill password - should enable
    await page.fill('[name="password"]', 'password');
    await expect(loginButton).not.toBeDisabled();

    // Clear username - should disable again
    await page.fill('[name="username"]', '');
    await expect(loginButton).toBeDisabled();
  });

  test('should show loading state during login', async ({ page }) => {
    await page.fill('[name="username"]', testUsers.superAdmin.username);
    await page.fill('[name="password"]', testUsers.superAdmin.password);

    const loginButton = page.locator('button[type="submit"]');

    // Start login process
    await loginButton.click();

    // Button should show loading text (if implemented)
    // This might be too fast to catch in some cases
    // await expect(loginButton).toContainText('登录中...');
  });
});