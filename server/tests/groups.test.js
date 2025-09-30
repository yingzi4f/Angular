const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const groupRoutes = require('../routes/groups');
const authMiddleware = require('../middleware/auth');
const dataStore = require('../models/mongoDataStore');

const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use('/api/groups', async (req, res, next) => {
  // Simple mock auth - set user from test header
  const testUserId = req.headers['x-test-user-id'];
  const testUserRoles = req.headers['x-test-user-roles'] ?
    req.headers['x-test-user-roles'].split(',') : ['user'];

  if (testUserId) {
    // Find the actual user to get their username
    try {
      const user = await dataStore.findUserById(testUserId);
      req.user = {
        id: testUserId,
        username: user ? user.username : 'testuser',
        roles: testUserRoles
      };
    } catch (error) {
      req.user = {
        id: testUserId,
        username: 'testuser',
        roles: testUserRoles
      };
    }
  }
  next();
});

app.use('/api/groups', groupRoutes);

describe('Groups API Integration Tests', () => {
  let testUser, adminUser, superAdmin, testGroup, testChannel;

  beforeEach(async () => {
    // Clean up any existing test data
    const User = require('../models/mongodb/User');
    const Group = require('../models/mongodb/Group');
    const Channel = require('../models/mongodb/Channel');
    const Message = require('../models/mongodb/Message');

    await User.deleteMany({});
    await Group.deleteMany({});
    await Channel.deleteMany({});
    await Message.deleteMany({});

    // Recreate super admin user after cleanup
    await dataStore.initializeDefaultUser();

    // Create test users (User model will automatically hash passwords)
    testUser = await dataStore.addUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      roles: ['user']
    });

    adminUser = await dataStore.addUser({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      roles: ['user', 'group-admin']
    });

    superAdmin = await dataStore.addUser({
      username: 'superadmin',
      email: 'super@example.com',
      password: 'password123',
      roles: ['user', 'super-admin']
    });

    // Create test group
    testGroup = await dataStore.addGroup({
      name: 'Test Group',
      description: 'A test group',
      createdBy: adminUser._id || adminUser.id,
      memberIds: [testUser._id || testUser.id, adminUser._id || adminUser.id],
      adminIds: [adminUser._id || adminUser.id]
    });

    // Create test channel
    testChannel = await dataStore.addChannelToGroup(testGroup._id || testGroup.id, {
      name: 'General',
      description: 'General chat',
      groupId: testGroup._id || testGroup.id,
      memberIds: [testUser._id || testUser.id, adminUser._id || adminUser.id],
      createdBy: adminUser._id || adminUser.id
    });
  });

  describe('GET /api/groups', () => {
    it('should get user groups for authenticated user', async () => {
      const response = await request(app)
        .get('/api/groups')
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.groups)).toBe(true);
      expect(response.body.groups.length).toBeGreaterThan(0);

      const group = response.body.groups.find(g => g.name === 'Test Group');
      expect(group).toBeDefined();
    });

    it('should get all groups for super admin', async () => {
      const response = await request(app)
        .get('/api/groups')
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.groups)).toBe(true);
    });
  });

  describe('GET /api/groups/available', () => {
    beforeEach(async () => {
      // Create a group that testUser is not a member of
      await dataStore.addGroup({
        name: 'Available Group',
        description: 'A group available for joining',
        createdBy: adminUser._id || adminUser.id,
        memberIds: [adminUser._id || adminUser.id],
        adminIds: [adminUser._id || adminUser.id]
      });
    });

    it('should get available groups for user', async () => {
      const response = await request(app)
        .get('/api/groups/available')
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.groups)).toBe(true);

      const availableGroup = response.body.groups.find(g => g.name === 'Available Group');
      expect(availableGroup).toBeDefined();
    });
  });

  describe('POST /api/groups', () => {
    it('should create group as group admin', async () => {
      const groupData = {
        name: 'New Group',
        description: 'A new test group'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send(groupData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.group).toBeDefined();
      expect(response.body.group.name).toBe('New Group');
      expect(response.body.group.description).toBe('A new test group');
    });

    it('should create group as super admin', async () => {
      const groupData = {
        name: 'Super Group',
        description: 'A super admin group'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin')
        .send(groupData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.group.name).toBe('Super Group');
    });

    it('should fail to create group as regular user', async () => {
      const groupData = {
        name: 'Fail Group',
        description: 'This should fail'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user')
        .send(groupData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to create group with missing name', async () => {
      const groupData = {
        description: 'Missing name'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send(groupData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should get group details for member', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroup._id || testGroup.id}`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.group).toBeDefined();
      expect(response.body.group.name).toBe('Test Group');
    });

    it('should fail to get group details for non-member', async () => {
      const nonMemberUser = await dataStore.addUser({
        username: 'nonmember',
        email: 'nonmember@example.com',
        password: 'password123',
        roles: ['user']
      });

      const response = await request(app)
        .get(`/api/groups/${testGroup._id || testGroup.id}`)
        .set('x-test-user-id', nonMemberUser._id || nonMemberUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should get group details as super admin even if not member', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroup._id || testGroup.id}`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.group.name).toBe('Test Group');
    });
  });

  describe('POST /api/groups/:id/members', () => {
    let newUser;

    beforeEach(async () => {
      newUser = await dataStore.addUser({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        roles: ['user']
      });
    });

    it('should add member to group as admin', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/members`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({ userId: newUser._id || newUser.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户已添加到群组');
    });

    it('should fail to add member as regular user', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/members`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user')
        .send({ userId: newUser._id || newUser.id });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to add non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/members`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({ userId: nonExistentId.toString() });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/groups/:id/members/:userId', () => {
    it('should remove member from group as admin', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/members/${testUser._id || testUser.id}`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('移除');
    });

    it('should fail to remove member as regular user', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/members/${testUser._id || testUser.id}`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/groups/:id/channels', () => {
    it('should create channel as group admin', async () => {
      const channelData = {
        name: 'New Channel',
        description: 'A new test channel'
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send(channelData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.channel).toBeDefined();
      expect(response.body.channel.name).toBe('New Channel');
    });

    it('should fail to create channel as regular member', async () => {
      const channelData = {
        name: 'Fail Channel',
        description: 'This should fail'
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user')
        .send(channelData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to create channel with missing name', async () => {
      const channelData = {
        description: 'Missing name'
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send(channelData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/groups/:id/channels', () => {
    it('should get group channels for member', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroup._id || testGroup.id}/channels`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const channel = response.body.find(c => c.name === 'General');
      expect(channel).toBeDefined();
    });

    it('should fail to get channels for non-member', async () => {
      const nonMemberUser = await dataStore.addUser({
        username: 'nonmember2',
        email: 'nonmember2@example.com',
        password: 'password123',
        roles: ['user']
      });

      const response = await request(app)
        .get(`/api/groups/${testGroup._id || testGroup.id}/channels`)
        .set('x-test-user-id', nonMemberUser._id || nonMemberUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/groups/:groupId/channels/:channelId/messages', () => {
    it('should send message to channel as member', async () => {
      const messageData = {
        content: 'Hello world!',
        type: 'text'
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/messages`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user')
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.message.content).toBe('Hello world!');
      expect(response.body.message.type).toBe('text');
    });

    it('should fail to send message as non-member', async () => {
      const nonMemberUser = await dataStore.addUser({
        username: 'nonmember3',
        email: 'nonmember3@example.com',
        password: 'password123',
        roles: ['user']
      });

      const messageData = {
        content: 'This should fail',
        type: 'text'
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/messages`)
        .set('x-test-user-id', nonMemberUser._id || nonMemberUser.id)
        .set('x-test-user-roles', 'user')
        .send(messageData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to send empty message', async () => {
      const messageData = {
        content: '',
        type: 'text'
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/messages`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user')
        .send(messageData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/groups/:groupId/channels/:channelId/messages', () => {
    beforeEach(async () => {
      // Create some test messages
      await dataStore.addMessage({
        content: 'First message',
        type: 'text',
        senderId: testUser._id || testUser.id,
        senderUsername: 'testuser',
        channelId: testChannel._id || testChannel.id
      });

      await dataStore.addMessage({
        content: 'Second message',
        type: 'text',
        senderId: adminUser._id || adminUser.id,
        senderUsername: 'admin',
        channelId: testChannel._id || testChannel.id
      });
    });

    it('should get channel messages for member', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/messages`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBeGreaterThan(0);

      const message = response.body.messages.find(m => m.content === 'First message');
      expect(message).toBeDefined();
    });

    it('should get limited messages with limit parameter', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/messages?limit=1`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messages.length).toBe(1);
    });

    it('should fail to get messages for non-member', async () => {
      const nonMemberUser = await dataStore.addUser({
        username: 'nonmember4',
        email: 'nonmember4@example.com',
        password: 'password123',
        roles: ['user']
      });

      const response = await request(app)
        .get(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/messages`)
        .set('x-test-user-id', nonMemberUser._id || nonMemberUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/groups/:id', () => {
    it('should delete group as creator', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('删除');
    });

    it('should delete group as super admin', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail to delete group as regular member', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});