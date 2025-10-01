const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const profileRoutes = require('../routes/profile');
const authRoutes = require('../routes/auth');
const dataStore = require('../models/mongoDataStore');

const app = express();
app.use(express.json());
app.use('/api/profile', profileRoutes);
app.use('/api/auth', authRoutes);

describe('Profile API Integration Tests', () => {
  let userToken;
  let testUserId;
  const uploadDir = path.join(__dirname, '../uploads/avatars');

  beforeAll(() => {
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Clean up users
    const User = require('../models/mongodb/User');
    await User.deleteMany({});

    // Recreate super admin
    await dataStore.initializeDefaultUser();

    // Create test user
    const testUser = await dataStore.addUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      roles: ['user']
    });
    testUserId = testUser._id || testUser.id;

    // Get authentication token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    userToken = loginResponse.body.token;
  });

  afterAll(() => {
    // Clean up test avatar files
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach(file => {
        if (file.startsWith('avatar-')) {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      });
    }
  });

  describe('GET /api/profile/me', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/profile/me');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      // Mock dataStore to throw an error
      const originalFindUserById = dataStore.findUserById;
      dataStore.findUserById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      // Restore original function
      dataStore.findUserById = originalFindUserById;
    });

    it('should handle non-existent user', async () => {
      // Mock dataStore to return null
      const originalFindUserById = dataStore.findUserById;
      dataStore.findUserById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户未找到');

      // Restore original function
      dataStore.findUserById = originalFindUserById;
    });
  });

  describe('PUT /api/profile/me', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'newusername',
          email: 'newemail@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('个人资料更新成功');
      expect(response.body.user.username).toBe('newusername');
      expect(response.body.user.email).toBe('newemail@example.com');
    });

    it('should update only username', async () => {
      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'onlyusername'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('onlyusername');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should update only email', async () => {
      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'onlyemail@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('onlyemail@example.com');
    });

    it('should trim whitespace from inputs', async () => {
      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: '  trimmed  ',
          email: '  TRIMMED@EXAMPLE.COM  '
        });

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('trimmed');
      expect(response.body.user.email).toBe('trimmed@example.com');
    });

    it('should fail with duplicate username', async () => {
      // Create another user
      await dataStore.addUser({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        roles: ['user']
      });

      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'existinguser'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名已存在');
    });

    it('should fail with duplicate email', async () => {
      // Create another user
      await dataStore.addUser({
        username: 'anotheruser',
        email: 'duplicate@example.com',
        password: 'password123',
        roles: ['user']
      });

      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'duplicate@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('邮箱已存在');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put('/api/profile/me')
        .send({
          username: 'newname'
        });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      // Mock dataStore to throw an error
      const originalUpdateUser = dataStore.updateUser;
      dataStore.updateUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'test'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      // Restore original function
      dataStore.updateUser = originalUpdateUser;
    });

    it('should handle non-existent user', async () => {
      // Mock dataStore to return null
      const originalUpdateUser = dataStore.updateUser;
      dataStore.updateUser = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'test'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户未找到');

      // Restore original function
      dataStore.updateUser = originalUpdateUser;
    });
  });

  describe('DELETE /api/profile/avatar', () => {
    it('should delete avatar successfully', async () => {
      const testImagePath = path.join(__dirname, 'test-avatar.png');

      // Create test image
      if (!fs.existsSync(testImagePath)) {
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
          0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
          0x42, 0x60, 0x82
        ]);
        fs.writeFileSync(testImagePath, pngBuffer);
      }

      // Upload avatar first
      const uploadResponse = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(uploadResponse.status).toBe(200);

      // Delete avatar
      const response = await request(app)
        .delete('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('头像删除成功');

      // Clean up test image
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('should fail to delete non-existent avatar', async () => {
      const response = await request(app)
        .delete('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('未找到头像');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete('/api/profile/avatar');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      const testImagePath = path.join(__dirname, 'test-avatar.png');

      // Create test image
      if (!fs.existsSync(testImagePath)) {
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
          0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
          0x42, 0x60, 0x82
        ]);
        fs.writeFileSync(testImagePath, pngBuffer);
      }

      // Upload avatar first
      await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      // Mock dataStore to throw an error
      const originalUpdateUser = dataStore.updateUser;
      dataStore.updateUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器错误');

      // Restore original function
      dataStore.updateUser = originalUpdateUser;

      // Clean up test image
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });
  });

  describe('POST /api/profile/avatar', () => {
    it('should upload avatar successfully', async () => {
      const testImagePath = path.join(__dirname, 'test-avatar.png');

      // Create a simple test image file if it doesn't exist
      if (!fs.existsSync(testImagePath)) {
        // Create a minimal PNG file (1x1 pixel)
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
          0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
          0x42, 0x60, 0x82
        ]);
        fs.writeFileSync(testImagePath, pngBuffer);
      }

      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('头像上传成功');
      expect(response.body.avatar).toBeDefined();
      expect(response.body.avatar).toMatch(/^\/uploads\/avatars\/avatar-/);

      // Clean up test image
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('should fail without file', async () => {
      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('请选择要上传的头像文件');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/profile/avatar');

      expect(response.status).toBe(401);
    });

    it('should reject non-image files', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'This is a text file');

      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testFilePath);

      // Multer fileFilter rejects non-image files
      expect(response.status).toBe(500);
      if (response.body.success !== undefined) {
        expect(response.body.success).toBe(false);
      }

      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should handle update user failure', async () => {
      const testImagePath = path.join(__dirname, 'test-avatar.png');

      // Create test image
      if (!fs.existsSync(testImagePath)) {
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
          0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
          0x42, 0x60, 0x82
        ]);
        fs.writeFileSync(testImagePath, pngBuffer);
      }

      // Mock dataStore to return null for updateUser
      const originalUpdateUser = dataStore.updateUser;
      dataStore.updateUser = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户未找到');

      // Restore original function
      dataStore.updateUser = originalUpdateUser;

      // Clean up test image
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('should replace old avatar', async () => {
      const testImagePath = path.join(__dirname, 'test-avatar.png');

      // Create test image
      if (!fs.existsSync(testImagePath)) {
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
          0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
          0x42, 0x60, 0x82
        ]);
        fs.writeFileSync(testImagePath, pngBuffer);
      }

      // Upload first avatar
      const firstResponse = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(firstResponse.status).toBe(200);
      const firstAvatar = firstResponse.body.avatar;

      // Upload second avatar
      const secondResponse = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.avatar).not.toBe(firstAvatar);

      // Clean up test image
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });
  });

});