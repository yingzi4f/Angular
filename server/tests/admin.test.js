const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const adminRoutes = require('../routes/admin');
const authRoutes = require('../routes/auth');
const dataStore = require('../models/mongoDataStore');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

describe('Admin API Integration Tests', () => {
  let superAdminToken;
  let groupAdminToken;
  let userToken;
  let testUserId;
  let groupAdminUserId;

  beforeEach(async () => {
    // Clean up any existing test data
    const User = require('../models/mongodb/User');
    await User.deleteMany({});

    // Recreate super admin user after cleanup
    await dataStore.initializeDefaultUser();

    // Create test users
    const testUser = await dataStore.addUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      roles: ['user']
    });
    testUserId = testUser._id || testUser.id;

    const groupAdmin = await dataStore.addUser({
      username: 'groupadmin',
      email: 'groupadmin@example.com',
      password: 'password123',
      roles: ['user', 'group-admin']
    });
    groupAdminUserId = groupAdmin._id || groupAdmin.id;

    // Get authentication tokens
    const superAdminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'super',
        password: '123456'
      });
    superAdminToken = superAdminLogin.body.token;

    const groupAdminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'groupadmin',
        password: 'password123'
      });
    groupAdminToken = groupAdminLogin.body.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    userToken = userLogin.body.token;
  });

  describe('GET /api/admin/users', () => {
    it('should get all users as super admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should include all test users
      const usernames = response.body.map(user => user.username);
      expect(usernames).toContain('super');
      expect(usernames).toContain('testuser');
      expect(usernames).toContain('groupadmin');
    });

    it('should fail to get users as group admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${groupAdminToken}`);

      expect(response.status).toBe(403);
    });

    it('should fail to get users as regular user', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should fail to get users without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      // Mock dataStore to throw an error
      const originalGetUsers = dataStore.getUsers;
      dataStore.getUsers = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('获取用户列表失败');

      // Restore original function
      dataStore.getUsers = originalGetUsers;
    });
  });

  describe('GET /api/admin/groups', () => {
    beforeEach(async () => {
      // Create a test group
      await dataStore.addGroup({
        name: 'Test Group',
        description: 'A test group',
        createdBy: testUserId
      });
    });

    it('should get all groups as super admin', async () => {
      const response = await request(app)
        .get('/api/admin/groups')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const groupNames = response.body.map(group => group.name);
      expect(groupNames).toContain('Test Group');
    });

    it('should fail to get groups as group admin', async () => {
      const response = await request(app)
        .get('/api/admin/groups')
        .set('Authorization', `Bearer ${groupAdminToken}`);

      expect(response.status).toBe(403);
    });

    it('should fail to get groups as regular user', async () => {
      const response = await request(app)
        .get('/api/admin/groups')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should handle database errors gracefully', async () => {
      // Mock dataStore to throw an error
      const originalGetGroups = dataStore.getGroups;
      dataStore.getGroups = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/groups')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('获取群组列表失败');

      // Restore original function
      dataStore.getGroups = originalGetGroups;
    });
  });

  describe('DELETE /api/admin/users/:userId', () => {
    it('should delete user as super admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户删除成功');

      // Verify user was deleted
      const deletedUser = await dataStore.findUserById(testUserId);
      expect(deletedUser).toBeNull();
    });

    it('should fail to delete own account', async () => {
      // Get super admin user ID
      const users = await dataStore.getUsers();
      const superAdmin = users.find(u => u.username === 'super');

      const response = await request(app)
        .delete(`/api/admin/users/${superAdmin._id || superAdmin.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('不能删除自己的账户');
    });

    it('should fail to delete non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/admin/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户未找到');
    });

    it('should fail to delete user as group admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${groupAdminToken}`);

      expect(response.status).toBe(403);
    });

    it('should handle database errors gracefully', async () => {
      // Mock dataStore to throw an error
      const originalDeleteUser = dataStore.deleteUser;
      dataStore.deleteUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('删除用户失败');

      // Restore original function
      dataStore.deleteUser = originalDeleteUser;
    });
  });

  describe('PUT /api/admin/users/:userId/roles', () => {
    it('should update user roles as super admin', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roles: ['user', 'group-admin']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户角色更新成功');
      expect(response.body.user).toBeDefined();

      // Verify user roles were updated
      const updatedUser = await dataStore.findUserById(testUserId);
      expect(updatedUser.roles).toContain('group-admin');
    });

    it('should fail with invalid roles format', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roles: 'not-an-array'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('角色必须是数组格式');
    });

    it('should fail with invalid roles', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roles: ['user', 'invalid-role']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('无效的角色: invalid-role');
    });

    it('should fail when trying to remove own super-admin role', async () => {
      // Get super admin user ID
      const users = await dataStore.getUsers();
      const superAdmin = users.find(u => u.username === 'super');

      const response = await request(app)
        .put(`/api/admin/users/${superAdmin._id || superAdmin.id}/roles`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roles: ['user']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('不能移除自己的超级管理员权限');
    });

    it('should fail to update roles for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/admin/users/${nonExistentId}/roles`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roles: ['user']
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户未找到');
    });

    it('should fail to update roles as group admin', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${groupAdminToken}`)
        .send({
          roles: ['user', 'group-admin']
        });

      expect(response.status).toBe(403);
    });

    it('should handle database errors gracefully', async () => {
      // Mock dataStore to throw an error
      const originalUpdateUser = dataStore.updateUser;
      dataStore.updateUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roles: ['user']
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('更新用户角色失败');

      // Restore original function
      dataStore.updateUser = originalUpdateUser;
    });
  });
});