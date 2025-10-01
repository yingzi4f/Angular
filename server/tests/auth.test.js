const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('../routes/auth');
const dataStore = require('../models/mongoDataStore');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API Integration Tests', () => {
  beforeEach(async () => {
    // Clean up any existing test data including the auto-created super user
    const User = require('../models/mongodb/User');
    await User.deleteMany({});

    // Recreate super admin user after cleanup
    await dataStore.initializeDefaultUser();

    // Create test users before each test
    // Note: User model will automatically hash passwords via pre-save middleware

    await dataStore.addUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      roles: ['user']
    });

    await dataStore.addUser({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      roles: ['user', 'group-admin']
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
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.roles).toContain('user');
    });

    it('should login super admin with hardcoded credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'super',
          password: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('super');
      expect(response.body.user.roles).toContain('super-admin');
    });

    it('should fail login with invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('should fail login with invalid password', async () => {
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

    it('should fail login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名和密码不能为空');
    });

    it('should fail login with empty credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: '',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名和密码不能为空');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'registereduser',
          email: 'registered@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('registereduser');
      expect(response.body.user.email).toBe('registered@example.com');
      expect(response.body.user.roles).toContain('user');
      expect(response.body.message).toBe('用户注册成功');
    });

    it('should fail registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('所有字段都是必需的');
    });

    it('should fail registration with existing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'another@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名已存在');
    });
  });

  describe('GET /api/auth/users', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/auth/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);

      const user = response.body.users.find(u => u.username === 'testuser');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.roles).toContain('user');
    });
  });

  describe('PUT /api/auth/users/:id/promote', () => {
    it('should promote user to group-admin', async () => {
      const users = await dataStore.getUsers();
      const testUser = users.find(u => u.username === 'testuser');

      const response = await request(app)
        .put(`/api/auth/users/${testUser._id || testUser.id}/promote`)
        .send({
          role: 'group-admin'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户权限已更新');

      // Verify the user was promoted
      const updatedUser = await dataStore.findUserById(testUser._id || testUser.id);
      expect(updatedUser.roles).toContain('group-admin');
    });

    it('should promote user to super-admin', async () => {
      const users = await dataStore.getUsers();
      const testUser = users.find(u => u.username === 'testuser');

      const response = await request(app)
        .put(`/api/auth/users/${testUser._id || testUser.id}/promote`)
        .send({
          role: 'super-admin'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户权限已更新');

      // Verify the user was promoted
      const updatedUser = await dataStore.findUserById(testUser._id || testUser.id);
      expect(updatedUser.roles).toContain('super-admin');
    });

    it('should fail to promote with invalid role', async () => {
      const users = await dataStore.getUsers();
      const testUser = users.find(u => u.username === 'testuser');

      const response = await request(app)
        .put(`/api/auth/users/${testUser._id || testUser.id}/promote`)
        .send({
          role: 'invalid-role'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('无效的角色');
    });

    it('should fail to promote non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/auth/users/${nonExistentId}/promote`)
        .send({
          role: 'group-admin'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户未找到');
    });

    it('should not promote user if already has role', async () => {
      const users = await dataStore.getUsers();
      const adminUser = users.find(u => u.username === 'admin');

      const response = await request(app)
        .put(`/api/auth/users/${adminUser._id || adminUser.id}/promote`)
        .send({
          role: 'group-admin'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户权限已更新');
    });
  });

  describe('PUT /api/auth/users/:id/demote', () => {
    it('should demote user from group-admin', async () => {
      const users = await dataStore.getUsers();
      const adminUser = users.find(u => u.username === 'admin');

      const response = await request(app)
        .put(`/api/auth/users/${adminUser._id || adminUser.id}/demote`)
        .send({
          role: 'group-admin'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户权限已更新');

      // Verify the user was demoted
      const updatedUser = await dataStore.findUserById(adminUser._id || adminUser.id);
      expect(updatedUser.roles).not.toContain('group-admin');
      expect(updatedUser.roles).toContain('user'); // Should still have user role
    });

    it('should fail to demote with invalid role', async () => {
      const users = await dataStore.getUsers();
      const testUser = users.find(u => u.username === 'testuser');

      const response = await request(app)
        .put(`/api/auth/users/${testUser._id || testUser.id}/demote`)
        .send({
          role: 'invalid-role'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('无效的角色');
    });

    it('should fail to demote non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/auth/users/${nonExistentId}/demote`)
        .send({
          role: 'group-admin'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户未找到');
    });

    it('should not affect user if role not present', async () => {
      const users = await dataStore.getUsers();
      const testUser = users.find(u => u.username === 'testuser');

      const response = await request(app)
        .put(`/api/auth/users/${testUser._id || testUser.id}/demote`)
        .send({
          role: 'super-admin'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户权限已更新');
    });
  });

  describe('DELETE /api/auth/users/:id', () => {
    let adminToken;

    beforeEach(async () => {
      // Get admin token for authenticated requests
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });
      adminToken = loginResponse.body.token;
    });

    it('should delete user with valid authentication', async () => {
      const users = await dataStore.getUsers();
      const testUser = users.find(u => u.username === 'testuser');

      const response = await request(app)
        .delete(`/api/auth/users/${testUser._id || testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户已删除');

      // Verify user was deleted
      const deletedUser = await dataStore.findUserById(testUser._id || testUser.id);
      expect(deletedUser).toBeNull();
    });

    it('should fail to delete without authentication', async () => {
      const users = await dataStore.getUsers();
      const testUser = users.find(u => u.username === 'testuser');

      const response = await request(app)
        .delete(`/api/auth/users/${testUser._id || testUser.id}`);

      expect(response.status).toBe(401);
    });

    it('should fail to delete own account', async () => {
      const users = await dataStore.getUsers();
      const adminUser = users.find(u => u.username === 'admin');

      const response = await request(app)
        .delete(`/api/auth/users/${adminUser._id || adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('不能删除自己的账户');
    });

    it('should fail to delete non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/auth/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户未找到');
    });
  });

  describe('POST /api/auth/admin/create-user', () => {
    let adminToken;
    let superAdminToken;

    beforeEach(async () => {
      // Get admin token
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });
      adminToken = adminLoginResponse.body.token;

      // Get super admin token
      const superAdminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'super',
          password: '123456'
        });
      superAdminToken = superAdminLoginResponse.body.token;
    });

    it('should create user as group admin', async () => {
      const response = await request(app)
        .post('/api/auth/admin/create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'createduser',
          email: 'created@example.com',
          password: 'password123',
          roles: ['user']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('createduser');
      expect(response.body.user.email).toBe('created@example.com');
      expect(response.body.user.roles).toContain('user');
      expect(response.body.message).toBe('用户创建成功');
    });

    it('should create user as super admin', async () => {
      const response = await request(app)
        .post('/api/auth/admin/create-user')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          username: 'superuser',
          email: 'super@example.com',
          password: 'password123',
          roles: ['user', 'group-admin']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.roles).toContain('group-admin');
    });

    it('should fail to create user without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/admin/create-user')
        .send({
          username: 'failuser',
          email: 'fail@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
    });

    it('should fail to create user as regular user', async () => {
      const userLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const response = await request(app)
        .post('/api/auth/admin/create-user')
        .set('Authorization', `Bearer ${userLoginResponse.body.token}`)
        .send({
          username: 'failuser',
          email: 'fail@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('权限不足，需要管理员权限');
    });

    it('should fail to create user with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/admin/create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'incompleteuser',
          email: 'incomplete@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名、邮箱和密码不能为空');
    });

    it('should fail to create user with short username', async () => {
      const response = await request(app)
        .post('/api/auth/admin/create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'ab',
          email: 'short@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名长度必须在3-20个字符之间');
    });

    it('should fail to create user with short password', async () => {
      const response = await request(app)
        .post('/api/auth/admin/create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'shortpassuser',
          email: 'shortpass@example.com',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('密码长度不能少于6个字符');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database errors in login', async () => {
      const originalFind = dataStore.findUserByUsername;
      dataStore.findUserByUsername = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      dataStore.findUserByUsername = originalFind;
    });

    it('should handle database errors in register', async () => {
      const originalAdd = dataStore.addUser;
      dataStore.addUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      dataStore.addUser = originalAdd;
    });

    it('should handle database errors in getUsers', async () => {
      const originalGet = dataStore.getUsers;
      dataStore.getUsers = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/users');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      dataStore.getUsers = originalGet;
    });

    it('should handle database errors in promote', async () => {
      const user = await dataStore.findUserByUsername('testuser');
      const originalFind = dataStore.findUserById;
      dataStore.findUserById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/auth/users/${user._id || user.id}/promote`)
        .send({ role: 'group-admin' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      dataStore.findUserById = originalFind;
    });

    it('should handle user with missing roles array in promote', async () => {
      const user = await dataStore.findUserByUsername('testuser');
      const originalFind = dataStore.findUserById;

      // Mock a user without roles array
      dataStore.findUserById = jest.fn().mockResolvedValue({
        _id: user._id || user.id,
        username: user.username,
        email: user.email
        // No roles property
      });

      const response = await request(app)
        .put(`/api/auth/users/${user._id || user.id}/promote`)
        .send({ role: 'group-admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      dataStore.findUserById = originalFind;
    });

    it('should handle database errors in demote', async () => {
      const admin = await dataStore.findUserByUsername('admin');
      const originalFind = dataStore.findUserById;
      dataStore.findUserById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/auth/users/${admin._id || admin.id}/demote`)
        .send({ role: 'group-admin' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      dataStore.findUserById = originalFind;
    });

    it('should handle user with missing roles array in demote', async () => {
      const admin = await dataStore.findUserByUsername('admin');
      const originalFind = dataStore.findUserById;

      // Mock a user without roles array
      dataStore.findUserById = jest.fn().mockResolvedValue({
        _id: admin._id || admin.id,
        username: admin.username,
        email: admin.email,
        roles: null  // Invalid roles
      });

      const response = await request(app)
        .put(`/api/auth/users/${admin._id || admin.id}/demote`)
        .send({ role: 'group-admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      dataStore.findUserById = originalFind;
    });

    it('should ensure user role exists after demote', async () => {
      const admin = await dataStore.findUserByUsername('admin');
      const originalFind = dataStore.findUserById;
      const originalUpdate = dataStore.updateUser;

      let capturedRoles;
      dataStore.updateUser = jest.fn().mockImplementation((id, updates) => {
        capturedRoles = updates.roles;
        return Promise.resolve({ ...admin, roles: updates.roles });
      });

      const response = await request(app)
        .put(`/api/auth/users/${admin._id || admin.id}/demote`)
        .send({ role: 'group-admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(capturedRoles).toContain('user');

      dataStore.findUserById = originalFind;
      dataStore.updateUser = originalUpdate;
    });

    it('should handle database errors in delete user', async () => {
      // Login as admin first
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });
      const adminToken = adminLoginResponse.body.token;

      const user = await dataStore.findUserByUsername('testuser');
      const originalDelete = dataStore.deleteUser;
      dataStore.deleteUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/auth/users/${user._id || user.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      dataStore.deleteUser = originalDelete;
    });

    it('should handle database errors in create user', async () => {
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password123'
        });
      const adminToken = adminLoginResponse.body.token;

      const originalCreate = dataStore.createUserByAdmin;

      // Mock createUserByAdmin to throw error
      dataStore.createUserByAdmin = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/admin/create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'erroruser',
          email: 'error@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      dataStore.createUserByAdmin = originalCreate;
    });
  });
});