import { test as base } from '@playwright/test';

export interface TestUser {
  username: string;
  password: string;
  email: string;
  roles: string[];
}

export const testUsers: { [key: string]: TestUser } = {
  superAdmin: {
    username: 'super',
    password: '123',
    email: 'super@example.com',
    roles: ['user', 'super-admin']
  },
  groupAdmin: {
    username: 'admin',
    password: 'password123',
    email: 'admin@example.com',
    roles: ['user', 'group-admin']
  },
  regularUser: {
    username: 'testuser',
    password: 'password123',
    email: 'test@example.com',
    roles: ['user']
  }
};

export const test = base.extend<{
  authenticatedPage: any;
  loginAsUser: (userType: keyof typeof testUsers) => Promise<void>;
}>({
  authenticatedPage: async ({ page }, use) => {
    await use(page);
  },

  loginAsUser: async ({ page }, use) => {
    const loginAsUser = async (userType: keyof typeof testUsers) => {
      const user = testUsers[userType];

      await page.goto('/login');
      await page.fill('[name="username"]', user.username);
      await page.fill('[name="password"]', user.password);
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await page.waitForURL('/dashboard');
    };

    await use(loginAsUser);
  },
});

export { expect } from '@playwright/test';