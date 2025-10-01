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
      createdBy: adminUser._id || adminUser.id
    });

    // Add testUser to the group
    await dataStore.addUserToGroup(testGroup._id || testGroup.id, testUser._id || testUser.id);

    // Reload group to get updated memberIds
    testGroup = await dataStore.findGroupById(testGroup._id || testGroup.id);

    // Create test channel
    testChannel = await dataStore.addChannelToGroup(testGroup._id || testGroup.id, {
      name: 'General',
      description: 'General chat',
      groupId: testGroup._id || testGroup.id,
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

  describe('POST /api/groups/:groupId/apply', () => {
    let nonMemberUser, applicationGroup;

    beforeEach(async () => {
      // Create a user who is not a member of any group
      nonMemberUser = await dataStore.addUser({
        username: 'nonmember',
        email: 'nonmember@example.com',
        password: 'password123',
        roles: ['user']
      });

      // Create a group without this user
      applicationGroup = await dataStore.addGroup({
        name: 'Application Group',
        description: 'A group for testing applications',
        createdBy: adminUser._id || adminUser.id
      });
    });

    it('should apply to join group successfully', async () => {
      const response = await request(app)
        .post(`/api/groups/${applicationGroup._id || applicationGroup.id}/apply`)
        .set('x-test-user-id', nonMemberUser._id || nonMemberUser.id)
        .set('x-test-user-roles', 'user')
        .send({
          message: 'I would like to join this group'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('申请已提交');
      expect(response.body.application).toBeDefined();
    });

    it('should fail to apply if already a member', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/apply`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user')
        .send({
          message: 'I want to join'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已经是该群组的成员');
    });

    it('should fail to apply to non-existent group', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/groups/${fakeId}/apply`)
        .set('x-test-user-id', nonMemberUser._id || nonMemberUser.id)
        .set('x-test-user-roles', 'user')
        .send({
          message: 'Join request'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should fail to apply twice with pending application', async () => {
      // First application
      await request(app)
        .post(`/api/groups/${applicationGroup._id || applicationGroup.id}/apply`)
        .set('x-test-user-id', nonMemberUser._id || nonMemberUser.id)
        .set('x-test-user-roles', 'user')
        .send({ message: 'First application' });

      // Second application
      const response = await request(app)
        .post(`/api/groups/${applicationGroup._id || applicationGroup.id}/apply`)
        .set('x-test-user-id', nonMemberUser._id || nonMemberUser.id)
        .set('x-test-user-roles', 'user')
        .send({ message: 'Second application' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已有待审核的申请');
    });
  });

  describe('GET /api/groups/:groupId/applications', () => {
    let applicationUser, applicationGroup;

    beforeEach(async () => {
      applicationUser = await dataStore.addUser({
        username: 'applicant',
        email: 'applicant@example.com',
        password: 'password123',
        roles: ['user']
      });

      applicationGroup = await dataStore.addGroup({
        name: 'Application Test Group',
        description: 'Testing applications',
        createdBy: adminUser._id || adminUser.id
      });

      // Create an application
      await dataStore.createGroupApplication({
        groupId: applicationGroup._id || applicationGroup.id,
        userId: applicationUser._id || applicationUser.id,
        message: 'Please let me join'
      });
    });

    it('should get group applications as group admin', async () => {
      const response = await request(app)
        .get(`/api/groups/${applicationGroup._id || applicationGroup.id}/applications`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.applications)).toBe(true);
    });

    it('should get group applications as super admin', async () => {
      const response = await request(app)
        .get(`/api/groups/${applicationGroup._id || applicationGroup.id}/applications`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail to get applications as regular member', async () => {
      const response = await request(app)
        .get(`/api/groups/${applicationGroup._id || applicationGroup.id}/applications`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to get applications for non-existent group', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/groups/${fakeId}/applications`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/groups/applications', () => {
    let applicationUser, applicationGroup;

    beforeEach(async () => {
      applicationUser = await dataStore.addUser({
        username: 'applicant2',
        email: 'applicant2@example.com',
        password: 'password123',
        roles: ['user']
      });

      applicationGroup = await dataStore.addGroup({
        name: 'Global Application Group',
        description: 'Testing global applications',
        createdBy: adminUser._id || adminUser.id
      });

      await dataStore.createGroupApplication({
        groupId: applicationGroup._id || applicationGroup.id,
        userId: applicationUser._id || applicationUser.id,
        message: 'Global application test'
      });
    });

    it('should get all applications as super admin', async () => {
      const response = await request(app)
        .get('/api/groups/applications')
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.applications)).toBe(true);
    });

    it('should fail to get all applications as group admin', async () => {
      const response = await request(app)
        .get('/api/groups/applications')
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to get all applications as regular user', async () => {
      const response = await request(app)
        .get('/api/groups/applications')
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/groups/applications/:applicationId/review', () => {
    let applicationUser, applicationGroup, applicationId;

    beforeEach(async () => {
      applicationUser = await dataStore.addUser({
        username: 'reviewapplicant',
        email: 'reviewapplicant@example.com',
        password: 'password123',
        roles: ['user']
      });

      applicationGroup = await dataStore.addGroup({
        name: 'Review Application Group',
        description: 'Testing application review',
        createdBy: adminUser._id || adminUser.id
      });

      const application = await dataStore.createGroupApplication({
        groupId: applicationGroup._id || applicationGroup.id,
        userId: applicationUser._id || applicationUser.id,
        message: 'Please approve me'
      });

      applicationId = application._id || application.id;
    });

    it('should approve application successfully', async () => {
      const response = await request(app)
        .post(`/api/groups/applications/${applicationId}/review`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({
          action: 'approve',
          message: 'Welcome to the group'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('申请已批准');
    });

    it('should reject application successfully', async () => {
      const response = await request(app)
        .post(`/api/groups/applications/${applicationId}/review`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({
          action: 'reject',
          message: 'Sorry, not at this time'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('申请已拒绝');
    });

    it('should fail with invalid action', async () => {
      const response = await request(app)
        .post(`/api/groups/applications/${applicationId}/review`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({
          action: 'invalid',
          message: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('无效的操作');
    });

    it('should fail to review non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/groups/applications/${fakeId}/review`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({
          action: 'approve'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/groups/all', () => {
    it('should get all groups as super admin', async () => {
      const response = await request(app)
        .get('/api/groups/all')
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.groups)).toBe(true);
      expect(response.body.groups.length).toBeGreaterThan(0);
    });

    it('should fail to get all groups as group admin', async () => {
      const response = await request(app)
        .get('/api/groups/all')
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to get all groups as regular user', async () => {
      const response = await request(app)
        .get('/api/groups/all')
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/groups/:groupId/channels/:channelId', () => {
    let customChannel;

    beforeEach(async () => {
      // Create a custom channel (not 'general')
      customChannel = await dataStore.addChannelToGroup(testGroup._id || testGroup.id, {
        name: 'custom-channel',
        description: 'A custom channel',
        createdBy: adminUser._id || adminUser.id
      });
    });

    it('should delete channel as group admin', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/channels/${customChannel._id || customChannel.id}`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('频道已删除');
    });

    it('should delete channel as super admin', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/channels/${customChannel._id || customChannel.id}`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail to delete general channel', async () => {
      // Find the general channel
      const channels = await dataStore.getGroupChannels(testGroup._id || testGroup.id);
      const generalChannel = channels.find(c => c.name === 'general');

      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/channels/${generalChannel._id || generalChannel.id}`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不能删除默认频道');
    });

    it('should fail to delete channel as regular member', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/channels/${customChannel._id || customChannel.id}`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to delete non-existent channel', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/channels/${fakeId}`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/groups/:groupId/channels/:channelId/members', () => {
    it('should add member to channel as group admin', async () => {
      // Create a new channel without all group members
      const privateChannel = await dataStore.addChannelToGroup(testGroup._id || testGroup.id, {
        name: 'private-channel',
        description: 'Private channel',
        createdBy: adminUser._id || adminUser.id
      });

      // Remove testUser from this new channel (they were auto-added)
      const Channel = require('../models/mongodb/Channel');
      await Channel.findByIdAndUpdate(
        privateChannel._id || privateChannel.id,
        { $pull: { memberIds: testUser._id || testUser.id } }
      );

      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels/${privateChannel._id || privateChannel.id}/members`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({
          userId: testUser._id || testUser.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('用户已添加到频道');
    });

    it('should fail to add member without userId', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/members`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户ID不能为空');
    });

    it('should fail to add non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/members`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin')
        .send({
          userId: fakeId
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should fail to add member as regular user', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/members`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user')
        .send({
          userId: superAdmin._id || superAdmin.id
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/groups/:groupId/channels/:channelId/members/:userId', () => {
    it('should remove member from channel as group admin', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/members/${testUser._id || testUser.id}`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('用户已从频道移除');
    });

    it('should fail to remove non-member from channel', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/members/${superAdmin._id || superAdmin.id}`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户不在频道中');
    });

    it('should fail to remove member as regular user', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroup._id || testGroup.id}/channels/${testChannel._id || testChannel.id}/members/${testUser._id || testUser.id}`)
        .set('x-test-user-id', testUser._id || testUser.id)
        .set('x-test-user-roles', 'user');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/groups/:groupId/members/:userId/promote', () => {
    it('should promote member to group admin as super admin', async () => {
      const response = await request(app)
        .put(`/api/groups/${testGroup._id || testGroup.id}/members/${testUser._id || testUser.id}/promote`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('提升为群组管理员');
    });

    it('should fail to promote non-member', async () => {
      const nonMember = await dataStore.addUser({
        username: 'nonmember2',
        email: 'nonmember2@example.com',
        password: 'password123',
        roles: ['user']
      });

      const response = await request(app)
        .put(`/api/groups/${testGroup._id || testGroup.id}/members/${nonMember._id || nonMember.id}/promote`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户必须先是群组成员');
    });

    it('should fail to promote already admin', async () => {
      const response = await request(app)
        .put(`/api/groups/${testGroup._id || testGroup.id}/members/${adminUser._id || adminUser.id}/promote`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已经是群组管理员');
    });

    it('should fail to promote as non-super-admin', async () => {
      const response = await request(app)
        .put(`/api/groups/${testGroup._id || testGroup.id}/members/${testUser._id || testUser.id}/promote`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to promote non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/groups/${testGroup._id || testGroup.id}/members/${fakeId}/promote`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/groups/:groupId/members/:userId/demote', () => {
    it('should demote group admin as super admin', async () => {
      const response = await request(app)
        .put(`/api/groups/${testGroup._id || testGroup.id}/members/${adminUser._id || adminUser.id}/demote`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('群组管理员权限已被撤销');
    });

    it('should fail to demote non-admin', async () => {
      const response = await request(app)
        .put(`/api/groups/${testGroup._id || testGroup.id}/members/${testUser._id || testUser.id}/demote`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不是群组管理员');
    });

    it('should fail to demote as non-super-admin', async () => {
      const response = await request(app)
        .put(`/api/groups/${testGroup._id || testGroup.id}/members/${adminUser._id || adminUser.id}/demote`)
        .set('x-test-user-id', adminUser._id || adminUser.id)
        .set('x-test-user-roles', 'user,group-admin');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail to demote from non-existent group', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/groups/${fakeId}/members/${adminUser._id || adminUser.id}/demote`)
        .set('x-test-user-id', superAdmin._id || superAdmin.id)
        .set('x-test-user-roles', 'user,super-admin');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});