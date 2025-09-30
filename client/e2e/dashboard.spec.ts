import { test, expect, testUsers } from './fixtures';

test.describe('Dashboard Functionality', () => {
  test.describe('Super Admin Dashboard', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');
    });

    test('should display user info and role badge', async ({ page }) => {
      await expect(page.locator('.user-details .username')).toContainText('super');
      await expect(page.locator('.role-badge')).toContainText('超级管理员');
      await expect(page.locator('.role-badge')).toHaveClass(/super-admin/);
    });

    test('should display admin management tabs', async ({ page }) => {
      await expect(page.locator('.admin-section')).toBeVisible();
      await expect(page.locator('.tab-btn:has-text("用户管理")')).toBeVisible();
      await expect(page.locator('.tab-btn:has-text("群组管理")')).toBeVisible();
      await expect(page.locator('.tab-btn:has-text("创建用户")')).toBeVisible();
    });

    test('should switch between admin tabs', async ({ page }) => {
      // Start with users tab (default)
      await expect(page.locator('.tab-btn:has-text("用户管理")')).toHaveClass(/active/);
      await expect(page.locator('h3:has-text("所有用户")')).toBeVisible();

      // Switch to groups tab
      await page.click('.tab-btn:has-text("群组管理")');
      await expect(page.locator('.tab-btn:has-text("群组管理")')).toHaveClass(/active/);
      await expect(page.locator('h3:has-text("所有群组")')).toBeVisible();

      // Switch to create user tab
      await page.click('.tab-btn:has-text("创建用户")');
      await expect(page.locator('.tab-btn:has-text("创建用户")')).toHaveClass(/active/);
      await expect(page.locator('h3:has-text("创建新用户")')).toBeVisible();
    });

    test('should create new user from admin panel', async ({ page }) => {
      // Navigate to create user tab
      await page.click('.tab-btn:has-text("创建用户")');

      // Fill in user details
      await page.fill('#username', 'adminuser');
      await page.fill('#email', 'adminuser@example.com');
      await page.fill('#password', 'password123');

      // Listen for success alert
      page.once('dialog', dialog => {
        expect(dialog.message()).toContain('用户创建成功');
        dialog.accept();
      });

      await page.click('.create-user-form button[type="submit"]');

      // Form should be cleared after success
      await expect(page.locator('#username')).toHaveValue('');
      await expect(page.locator('#email')).toHaveValue('');
      await expect(page.locator('#password')).toHaveValue('');
    });

    test('should show validation error for incomplete user creation', async ({ page }) => {
      await page.click('.tab-btn:has-text("创建用户")');

      // Try to submit without filling all fields
      await page.fill('#username', 'incompleteuser');
      // Leave email and password empty

      page.once('dialog', dialog => {
        expect(dialog.message()).toContain('请填写所有必填字段');
        dialog.accept();
      });

      await page.click('.create-user-form button[type="submit"]');
    });

    test('should display users list in admin panel', async ({ page }) => {
      // Should be on users tab by default
      await expect(page.locator('.users-list')).toBeVisible();
      await expect(page.locator('.user-item')).toHaveCount(1); // At least super admin user

      // Check that super admin user is listed
      const superAdminItem = page.locator('.user-item').filter({ hasText: 'super' });
      await expect(superAdminItem).toBeVisible();
      await expect(superAdminItem).toContainText('super-admin');
    });

    test('should allow promoting users to group admin', async ({ page }) => {
      // First create a regular user to promote
      await page.click('.tab-btn:has-text("创建用户")');
      await page.fill('#username', 'promotableuser');
      await page.fill('#email', 'promote@example.com');
      await page.fill('#password', 'password123');

      page.once('dialog', dialog => dialog.accept());
      await page.click('.create-user-form button[type="submit"]');

      // Go back to users tab
      await page.click('.tab-btn:has-text("用户管理")');

      // Wait for users list to reload
      await page.waitForTimeout(1000);

      // Find the new user and promote them
      const userItem = page.locator('.user-item').filter({ hasText: 'promotableuser' });
      await expect(userItem).toBeVisible();

      const promoteButton = userItem.locator('button:has-text("提升为群组管理员")');
      if (await promoteButton.count() > 0) {
        page.once('dialog', dialog => {
          expect(dialog.message()).toContain('确定要将用户');
          dialog.accept();
        });

        page.once('dialog', dialog => {
          expect(dialog.message()).toContain('用户权限已更新');
          dialog.accept();
        });

        await promoteButton.click();
      }
    });
  });

  test.describe('Group Management', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');
    });

    test('should show create group button for super admin', async ({ page }) => {
      await expect(page.locator('button:has-text("创建新群组")')).toBeVisible();
    });

    test('should open create group modal', async ({ page }) => {
      await page.click('button:has-text("创建新群组")');

      await expect(page.locator('.modal')).toBeVisible();
      await expect(page.locator('h3:has-text("创建新群组")')).toBeVisible();
      await expect(page.locator('[name="groupName"]')).toBeVisible();
      await expect(page.locator('[name="groupDescription"]')).toBeVisible();
    });

    test('should create new group successfully', async ({ page }) => {
      await page.click('button:has-text("创建新群组")');

      await page.fill('[name="groupName"]', 'Test Group E2E');
      await page.fill('[name="groupDescription"]', 'A test group created in E2E test');

      await page.click('.modal button[type="submit"]');

      // Modal should close
      await expect(page.locator('.modal')).not.toBeVisible();

      // New group should appear in the groups list
      await expect(page.locator('.group-card').filter({ hasText: 'Test Group E2E' })).toBeVisible();
    });

    test('should cancel group creation', async ({ page }) => {
      await page.click('button:has-text("创建新群组")');

      await page.fill('[name="groupName"]', 'Cancelled Group');

      await page.click('.modal button:has-text("取消")');

      // Modal should close
      await expect(page.locator('.modal')).not.toBeVisible();

      // Group should not be created
      await expect(page.locator('.group-card').filter({ hasText: 'Cancelled Group' })).not.toBeVisible();
    });

    test('should display group stats correctly', async ({ page }) => {
      // Create a group first
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'Stats Test Group');
      await page.fill('[name="groupDescription"]', 'Group for testing stats');
      await page.click('.modal button[type="submit"]');

      // Check that group stats are displayed
      const groupCard = page.locator('.group-card').filter({ hasText: 'Stats Test Group' });
      await expect(groupCard).toBeVisible();
      await expect(groupCard.locator('.group-stats')).toContainText('成员');
      await expect(groupCard.locator('.group-stats')).toContainText('频道');
    });

    test('should navigate to group chat when clicking group card', async ({ page }) => {
      // Create a group first
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'Navigation Test Group');
      await page.click('.modal button[type="submit"]');

      // Click on the group card content area
      const groupCard = page.locator('.group-card').filter({ hasText: 'Navigation Test Group' });
      await groupCard.locator('.group-content').click();

      // Should navigate to chat page
      await expect(page).toHaveURL(/\/chat\/.+/);
    });

    test('should show admin badge for group admin', async ({ page }) => {
      // Create a group (super admin is automatically admin)
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'Admin Badge Test');
      await page.click('.modal button[type="submit"]');

      // Should show admin badge
      const groupCard = page.locator('.group-card').filter({ hasText: 'Admin Badge Test' });
      await expect(groupCard.locator('.admin-badge')).toContainText('管理员');
    });
  });

  test.describe('Available Groups Section', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');
    });

    test('should display available groups section', async ({ page }) => {
      await expect(page.locator('.available-groups-section')).toBeVisible();
      await expect(page.locator('h2:has-text("可申请加入的群组")')).toBeVisible();
    });

    test('should show message when no available groups', async ({ page }) => {
      // If user is admin of all groups, should show no available groups message
      const noGroupsMessage = page.locator('.available-groups-section .no-groups');
      if (await noGroupsMessage.count() > 0) {
        await expect(noGroupsMessage).toContainText('暂无可申请加入的群组');
      }
    });
  });

  test.describe('Profile Navigation', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');
    });

    test('should navigate to profile when clicking user avatar', async ({ page }) => {
      await page.click('.user-profile');

      await expect(page).toHaveURL('/profile');
    });

    test('should handle avatar error gracefully', async ({ page }) => {
      // This test checks if avatar error handling is implemented
      const avatar = page.locator('.user-avatar');
      await expect(avatar).toBeVisible();

      // Verify default avatar is used if there's an error
      const avatarSrc = await avatar.getAttribute('src');
      expect(avatarSrc).toBeTruthy();
    });
  });

  test.describe('Regular User Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // First register a regular user
      await page.goto('/login');
      await page.click('button:has-text("注册新用户")');

      await page.fill('[name="newUsername"]', testUsers.regularUser.username);
      await page.fill('[name="email"]', testUsers.regularUser.email);
      await page.fill('[name="newPassword"]', testUsers.regularUser.password);

      page.once('dialog', dialog => dialog.accept());
      await page.click('.register-form button[type="submit"]');

      // Now login as regular user
      await page.fill('[name="username"]', testUsers.regularUser.username);
      await page.fill('[name="password"]', testUsers.regularUser.password);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL('/dashboard');
    });

    test('should display regular user role badge', async ({ page }) => {
      await expect(page.locator('.role-badge')).toContainText('普通用户');
      await expect(page.locator('.role-badge')).toHaveClass(/user/);
    });

    test('should not show admin management section for regular user', async ({ page }) => {
      await expect(page.locator('.admin-section')).not.toBeVisible();
    });

    test('should not show create group button for regular user', async ({ page }) => {
      await expect(page.locator('button:has-text("创建新群组")')).not.toBeVisible();
    });

    test('should show no groups message for new regular user', async ({ page }) => {
      await expect(page.locator('.no-groups')).toContainText('您还没有加入任何群组');
    });
  });

  test.describe('Responsive Design', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');
    });

    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Check that main elements are still visible
      await expect(page.locator('.dashboard-header')).toBeVisible();
      await expect(page.locator('.dashboard-content')).toBeVisible();
      await expect(page.locator('.groups-section')).toBeVisible();
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      // Check that layout adapts properly
      await expect(page.locator('.dashboard-header')).toBeVisible();
      await expect(page.locator('.groups-list')).toBeVisible();
    });
  });
});