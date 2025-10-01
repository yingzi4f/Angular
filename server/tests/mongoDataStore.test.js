const dataStore = require('../models/mongoDataStore');
const User = require('../models/mongodb/User');
const Group = require('../models/mongodb/Group');
const Channel = require('../models/mongodb/Channel');
const Message = require('../models/mongodb/Message');

describe('MongoDataStore Tests', () => {
  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await Group.deleteMany({});
    await Channel.deleteMany({});
    await Message.deleteMany({});

    // Initialize default user
    await dataStore.initializeDefaultUser();
  });

  describe('User Management', () => {
    it('should set user online status', async () => {
      const user = await dataStore.addUser({
        username: 'onlinetest',
        email: 'online@test.com',
        password: 'password123',
        roles: ['user']
      });

      const updatedUser = await dataStore.setUserOnline(user._id, true);
      expect(updatedUser.isOnline).toBe(true);
      expect(updatedUser.lastSeen).toBeDefined();
    });

    it('should set user offline status', async () => {
      const user = await dataStore.addUser({
        username: 'offlinetest',
        email: 'offline@test.com',
        password: 'password123',
        roles: ['user']
      });

      await dataStore.setUserOnline(user._id, true);
      const updatedUser = await dataStore.setUserOnline(user._id, false);
      expect(updatedUser.isOnline).toBe(false);
    });

    it('should get online users', async () => {
      const user1 = await dataStore.addUser({
        username: 'user1',
        email: 'user1@test.com',
        password: 'password123',
        roles: ['user']
      });

      const user2 = await dataStore.addUser({
        username: 'user2',
        email: 'user2@test.com',
        password: 'password123',
        roles: ['user']
      });

      await dataStore.setUserOnline(user1._id, true);
      await dataStore.setUserOnline(user2._id, false);

      const onlineUsers = await dataStore.getOnlineUsers();
      expect(onlineUsers.length).toBe(1);
      expect(onlineUsers[0].username).toBe('user1');
    });
  });

  describe('Message Management', () => {
    let testUser, testGroup, testChannel;

    beforeEach(async () => {
      testUser = await dataStore.addUser({
        username: 'messagetest',
        email: 'message@test.com',
        password: 'password123',
        roles: ['user']
      });

      testGroup = await dataStore.addGroup({
        name: 'Message Test Group',
        description: 'Testing messages',
        createdBy: testUser._id
      });

      const channels = await dataStore.getGroupChannels(testGroup._id);
      testChannel = channels[0];
    });

    it('should add message successfully', async () => {
      const message = await dataStore.addMessage({
        content: 'Test message',
        senderId: testUser._id,
        senderUsername: testUser.username,
        channelId: testChannel._id,
        type: 'text'
      });

      expect(message.content).toBe('Test message');
      // senderId is populated, so check the _id property
      const senderId = message.senderId._id || message.senderId;
      expect(senderId.toString()).toBe(testUser._id.toString());
    });

    it('should get channel messages', async () => {
      await dataStore.addMessage({
        content: 'Message 1',
        senderId: testUser._id,
        senderUsername: testUser.username,
        channelId: testChannel._id,
        type: 'text'
      });

      await dataStore.addMessage({
        content: 'Message 2',
        senderId: testUser._id,
        senderUsername: testUser.username,
        channelId: testChannel._id,
        type: 'text'
      });

      const messages = await dataStore.getChannelMessages(testChannel._id);
      expect(messages.length).toBe(2);
    });

    it('should limit channel messages', async () => {
      for (let i = 0; i < 10; i++) {
        await dataStore.addMessage({
          content: `Message ${i}`,
          senderId: testUser._id,
          senderUsername: testUser.username,
          channelId: testChannel._id,
          type: 'text'
        });
      }

      const messages = await dataStore.getChannelMessages(testChannel._id, { limit: 5 });
      expect(messages.length).toBe(5);
    });

    it('should update message', async () => {
      const message = await dataStore.addMessage({
        content: 'Original content',
        senderId: testUser._id,
        senderUsername: testUser.username,
        channelId: testChannel._id,
        type: 'text'
      });

      const updatedMessage = await dataStore.updateMessage(message._id, 'Updated content');
      expect(updatedMessage.content).toBe('Updated content');
      expect(updatedMessage.isEdited).toBe(true);
    });

    it('should delete message', async () => {
      const message = await dataStore.addMessage({
        content: 'To be deleted',
        senderId: testUser._id,
        senderUsername: testUser.username,
        channelId: testChannel._id,
        type: 'text'
      });

      const deletedMessage = await dataStore.deleteMessage(message._id);
      expect(deletedMessage).toBeDefined();

      const messages = await dataStore.getChannelMessages(testChannel._id);
      expect(messages.length).toBe(0);
    });

    it('should handle update of non-existent message', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await dataStore.updateMessage(fakeId, 'Updated content');
      expect(result).toBeNull();
    });
  });

  describe('Group and Channel Management', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await dataStore.addUser({
        username: 'grouptest',
        email: 'group@test.com',
        password: 'password123',
        roles: ['user']
      });
    });

    it('should get user groups', async () => {
      const group1 = await dataStore.addGroup({
        name: 'Group 1',
        description: 'First group',
        createdBy: testUser._id
      });

      const group2 = await dataStore.addGroup({
        name: 'Group 2',
        description: 'Second group',
        createdBy: testUser._id
      });

      const userGroups = await dataStore.getUserGroups(testUser._id);
      expect(userGroups.length).toBe(2);
    });

    it('should find channel by id', async () => {
      const group = await dataStore.addGroup({
        name: 'Test Group',
        description: 'Test',
        createdBy: testUser._id
      });

      const channels = await dataStore.getGroupChannels(group._id);
      const channel = await dataStore.findChannelById(channels[0]._id);

      expect(channel).toBeDefined();
      expect(channel.name).toBe('general');
    });

    it('should update group', async () => {
      const group = await dataStore.addGroup({
        name: 'Original Name',
        description: 'Original description',
        createdBy: testUser._id
      });

      const updatedGroup = await dataStore.updateGroup(group._id, {
        name: 'Updated Name',
        description: 'Updated description'
      });

      expect(updatedGroup.name).toBe('Updated Name');
      expect(updatedGroup.description).toBe('Updated description');
    });

    it('should get available groups for user', async () => {
      const user1 = await dataStore.addUser({
        username: 'user1',
        email: 'user1@test.com',
        password: 'password123',
        roles: ['user']
      });

      const user2 = await dataStore.addUser({
        username: 'user2',
        email: 'user2@test.com',
        password: 'password123',
        roles: ['user']
      });

      // User1 creates a group
      await dataStore.addGroup({
        name: 'User1 Group',
        description: 'Group by user1',
        createdBy: user1._id
      });

      // User2 should see this as an available group
      const availableGroups = await dataStore.getAvailableGroups(user2._id);
      expect(availableGroups.length).toBeGreaterThan(0);
    });

    it('should get user applications', async () => {
      const applicant = await dataStore.addUser({
        username: 'applicant',
        email: 'applicant@test.com',
        password: 'password123',
        roles: ['user']
      });

      const group = await dataStore.addGroup({
        name: 'Test Group',
        description: 'Test',
        createdBy: testUser._id
      });

      await dataStore.createGroupApplication({
        groupId: group._id,
        userId: applicant._id,
        message: 'I want to join'
      });

      const applications = await dataStore.getUserApplications(applicant._id);
      expect(applications.length).toBe(1);
      expect(applications[0].message).toBe('I want to join');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await dataStore.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.counts).toBeDefined();
      expect(health.counts.users).toBeGreaterThan(0);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle getUsers errors', async () => {
      // Mock User.find to throw error
      const originalFind = User.find;
      User.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(dataStore.getUsers()).rejects.toThrow('Database error');

      // Restore original
      User.find = originalFind;
    });

    it('should handle addUser errors', async () => {
      // Try to add user with duplicate username
      await dataStore.addUser({
        username: 'duplicate',
        email: 'dup1@test.com',
        password: 'password123',
        roles: ['user']
      });

      await expect(dataStore.addUser({
        username: 'duplicate',
        email: 'dup2@test.com',
        password: 'password123',
        roles: ['user']
      })).rejects.toThrow();
    });

    it('should handle findUserByUsername errors', async () => {
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(dataStore.findUserByUsername('test')).rejects.toThrow();

      User.findOne = originalFindOne;
    });

    it('should handle findUserById errors', async () => {
      const originalFindById = User.findById;
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        })
      });

      await expect(dataStore.findUserById('123')).rejects.toThrow();

      User.findById = originalFindById;
    });

    it('should handle updateUser errors', async () => {
      const user = await dataStore.addUser({
        username: 'updatetest',
        email: 'update@test.com',
        password: 'password123',
        roles: ['user']
      });

      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Update error');
      });

      await expect(dataStore.updateUser(user._id, { username: 'newname' })).rejects.toThrow();

      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should handle deleteUser errors', async () => {
      const originalFindByIdAndDelete = User.findByIdAndDelete;
      User.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Delete error');
      });

      await expect(dataStore.deleteUser('123')).rejects.toThrow();

      User.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should handle getGroups errors', async () => {
      const originalFind = Group.find;
      Group.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(dataStore.getGroups()).rejects.toThrow();

      Group.find = originalFind;
    });

    it('should handle getUserGroups errors', async () => {
      const originalGetUserGroups = Group.getUserGroups;
      Group.getUserGroups = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(dataStore.getUserGroups('123')).rejects.toThrow();

      Group.getUserGroups = originalGetUserGroups;
    });

    it('should handle addGroup errors', async () => {
      const originalSave = Group.prototype.save;
      Group.prototype.save = jest.fn().mockImplementation(() => {
        throw new Error('Save error');
      });

      await expect(dataStore.addGroup({
        name: 'Test',
        description: 'Test',
        createdBy: '507f1f77bcf86cd799439011'
      })).rejects.toThrow();

      Group.prototype.save = originalSave;
    });

    it('should handle findGroupById errors', async () => {
      const originalFindById = Group.findById;
      Group.findById = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.findGroupById('123')).rejects.toThrow();

      Group.findById = originalFindById;
    });

    it('should handle updateGroup errors', async () => {
      const originalFindByIdAndUpdate = Group.findByIdAndUpdate;
      Group.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Update error');
      });

      await expect(dataStore.updateGroup('123', { name: 'New Name' })).rejects.toThrow();

      Group.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should handle deleteGroup errors', async () => {
      const originalFindById = Group.findById;
      Group.findById = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.deleteGroup('123')).rejects.toThrow();

      Group.findById = originalFindById;
    });

    it('should handle promoteUserToGroupAdmin errors', async () => {
      const originalFindById = Group.findById;
      Group.findById = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.promoteUserToGroupAdmin('123', '456')).rejects.toThrow();

      Group.findById = originalFindById;
    });

    it('should handle demoteUserFromGroupAdmin errors', async () => {
      const originalFindById = Group.findById;
      Group.findById = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.demoteUserFromGroupAdmin('123', '456')).rejects.toThrow();

      Group.findById = originalFindById;
    });

    it('should handle getGroupChannels errors', async () => {
      const originalGetGroupChannels = Channel.getGroupChannels;
      Channel.getGroupChannels = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.getGroupChannels('123')).rejects.toThrow();

      Channel.getGroupChannels = originalGetGroupChannels;
    });

    it('should handle addChannelToGroup errors', async () => {
      const originalFindById = Group.findById;
      Group.findById = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.addChannelToGroup('123', {
        name: 'test',
        description: 'test',
        createdBy: '456'
      })).rejects.toThrow();

      Group.findById = originalFindById;
    });

    it('should handle findChannelById errors', async () => {
      const originalFindById = Channel.findById;
      Channel.findById = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.findChannelById('123')).rejects.toThrow();

      Channel.findById = originalFindById;
    });

    it('should handle deleteChannel errors', async () => {
      const originalDeleteMany = Message.deleteMany;
      Message.deleteMany = jest.fn().mockImplementation(() => {
        throw new Error('Delete error');
      });

      await expect(dataStore.deleteChannel('123')).rejects.toThrow();

      Message.deleteMany = originalDeleteMany;
    });

    it('should handle getChannelMessages errors', async () => {
      const originalGetChannelMessages = Message.getChannelMessages;
      Message.getChannelMessages = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.getChannelMessages('123')).rejects.toThrow();

      Message.getChannelMessages = originalGetChannelMessages;
    });

    it('should handle addMessage errors', async () => {
      const originalSave = Message.prototype.save;
      Message.prototype.save = jest.fn().mockImplementation(() => {
        throw new Error('Save error');
      });

      await expect(dataStore.addMessage({
        content: 'test',
        senderId: '123',
        senderUsername: 'test',
        channelId: '456',
        type: 'text'
      })).rejects.toThrow();

      Message.prototype.save = originalSave;
    });

    it('should handle updateMessage errors', async () => {
      const originalFindById = Message.findById;
      Message.findById = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.updateMessage('123', 'new content')).rejects.toThrow();

      Message.findById = originalFindById;
    });

    it('should handle deleteMessage errors', async () => {
      const originalFindByIdAndDelete = Message.findByIdAndDelete;
      Message.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Delete error');
      });

      await expect(dataStore.deleteMessage('123')).rejects.toThrow();

      Message.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should handle setUserOnline errors', async () => {
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Update error');
      });

      await expect(dataStore.setUserOnline('123', true)).rejects.toThrow();

      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should handle getOnlineUsers errors', async () => {
      const originalFind = User.find;
      User.find = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.getOnlineUsers()).rejects.toThrow();

      User.find = originalFind;
    });

    it('should handle getAvailableGroups errors', async () => {
      const originalFind = Group.find;
      Group.find = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.getAvailableGroups('123')).rejects.toThrow();

      Group.find = originalFind;
    });

    it('should handle createGroupApplication errors', async () => {
      const GroupApplication = require('../models/mongodb/GroupApplication');
      const originalFindOne = GroupApplication.findOne;
      GroupApplication.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.createGroupApplication({
        groupId: '123',
        userId: '456',
        message: 'test'
      })).rejects.toThrow();

      GroupApplication.findOne = originalFindOne;
    });

    it('should handle getPendingApplications errors', async () => {
      const GroupApplication = require('../models/mongodb/GroupApplication');
      const originalMethod = GroupApplication.getPendingApplicationsForGroup;
      GroupApplication.getPendingApplicationsForGroup = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.getPendingApplications('123')).rejects.toThrow();

      GroupApplication.getPendingApplicationsForGroup = originalMethod;
    });

    it('should handle reviewGroupApplication errors', async () => {
      const GroupApplication = require('../models/mongodb/GroupApplication');
      const originalFindById = GroupApplication.findById;
      GroupApplication.findById = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.reviewGroupApplication('123', {
        action: 'approve',
        reviewedBy: '456',
        message: 'test'
      })).rejects.toThrow();

      GroupApplication.findById = originalFindById;
    });

    it('should handle getUserApplications errors', async () => {
      const GroupApplication = require('../models/mongodb/GroupApplication');
      const originalMethod = GroupApplication.getUserApplications;
      GroupApplication.getUserApplications = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.getUserApplications('123')).rejects.toThrow();

      GroupApplication.getUserApplications = originalMethod;
    });

    it('should handle createUserByAdmin errors', async () => {
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Find error');
      });

      await expect(dataStore.createUserByAdmin({
        username: 'test',
        email: 'test@test.com',
        password: 'password123',
        roles: ['user']
      })).rejects.toThrow();

      User.findOne = originalFindOne;
    });
  });
});
