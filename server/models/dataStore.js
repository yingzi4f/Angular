const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DataStore {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.groupsFile = path.join(this.dataDir, 'groups.json');
    this.messagesFile = path.join(this.dataDir, 'messages.json');

    this.ensureDataDirectory();
    this.initializeDefaultData();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  initializeDefaultData() {
    if (!fs.existsSync(this.usersFile)) {
      const defaultUsers = [
        {
          id: '1',
          username: 'super',
          email: 'super@admin.com',
          password: '123',
          roles: ['super-admin'],
          groups: [],
          createdAt: new Date().toISOString()
        }
      ];
      this.saveUsers(defaultUsers);
    }

    if (!fs.existsSync(this.groupsFile)) {
      this.saveGroups([]);
    }

    if (!fs.existsSync(this.messagesFile)) {
      this.saveMessages([]);
    }
  }

  getUsers() {
    try {
      const data = fs.readFileSync(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading users file:', error);
      return [];
    }
  }

  saveUsers(users) {
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving users file:', error);
      return false;
    }
  }

  addUser(userData) {
    const users = this.getUsers();
    const newUser = {
      id: uuidv4(),
      username: userData.username,
      email: userData.email,
      password: userData.password,
      roles: userData.roles || ['user'],
      groups: [],
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  findUserByUsername(username) {
    const users = this.getUsers();
    return users.find(user => user.username === username);
  }

  findUserById(id) {
    const users = this.getUsers();
    return users.find(user => user.id === id);
  }

  updateUser(userId, updates) {
    const users = this.getUsers();
    const userIndex = users.findIndex(user => user.id === userId);

    if (userIndex === -1) return null;

    users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date().toISOString() };
    this.saveUsers(users);
    return users[userIndex];
  }

  deleteUser(userId) {
    const users = this.getUsers();
    const filteredUsers = users.filter(user => user.id !== userId);

    if (users.length === filteredUsers.length) return false;

    this.saveUsers(filteredUsers);
    return true;
  }

  getGroups() {
    try {
      const data = fs.readFileSync(this.groupsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading groups file:', error);
      return [];
    }
  }

  saveGroups(groups) {
    try {
      fs.writeFileSync(this.groupsFile, JSON.stringify(groups, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving groups file:', error);
      return false;
    }
  }

  addGroup(groupData) {
    const groups = this.getGroups();
    const newGroup = {
      id: uuidv4(),
      name: groupData.name,
      description: groupData.description || '',
      adminIds: [groupData.createdBy],
      memberIds: [groupData.createdBy],
      channels: [
        {
          id: uuidv4(),
          name: 'general',
          description: '默认频道',
          groupId: null,
          memberIds: [groupData.createdBy],
          messages: [],
          createdAt: new Date().toISOString()
        }
      ],
      createdBy: groupData.createdBy,
      createdAt: new Date().toISOString()
    };

    newGroup.channels[0].groupId = newGroup.id;
    groups.push(newGroup);
    this.saveGroups(groups);
    return newGroup;
  }

  findGroupById(id) {
    const groups = this.getGroups();
    return groups.find(group => group.id === id);
  }

  updateGroup(groupId, updates) {
    const groups = this.getGroups();
    const groupIndex = groups.findIndex(group => group.id === groupId);

    if (groupIndex === -1) return null;

    groups[groupIndex] = { ...groups[groupIndex], ...updates, updatedAt: new Date().toISOString() };
    this.saveGroups(groups);
    return groups[groupIndex];
  }

  addChannelToGroup(groupId, channelData) {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) return null;

    const newChannel = {
      id: uuidv4(),
      name: channelData.name,
      description: channelData.description || '',
      groupId: groupId,
      memberIds: [...group.memberIds],
      messages: [],
      createdAt: new Date().toISOString()
    };

    group.channels.push(newChannel);
    this.saveGroups(groups);
    return newChannel;
  }

  addUserToGroup(groupId, userId) {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) return false;

    if (!group.memberIds.includes(userId)) {
      group.memberIds.push(userId);

      group.channels.forEach(channel => {
        if (!channel.memberIds.includes(userId)) {
          channel.memberIds.push(userId);
        }
      });

      this.saveGroups(groups);
    }

    return true;
  }

  removeUserFromGroup(groupId, userId) {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) return false;

    group.memberIds = group.memberIds.filter(id => id !== userId);
    group.adminIds = group.adminIds.filter(id => id !== userId);

    group.channels.forEach(channel => {
      channel.memberIds = channel.memberIds.filter(id => id !== userId);
    });

    this.saveGroups(groups);
    return true;
  }

  getMessages() {
    try {
      const data = fs.readFileSync(this.messagesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading messages file:', error);
      return [];
    }
  }

  saveMessages(messages) {
    try {
      fs.writeFileSync(this.messagesFile, JSON.stringify(messages, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving messages file:', error);
      return false;
    }
  }

  addMessage(messageData) {
    const messages = this.getMessages();
    const newMessage = {
      id: uuidv4(),
      content: messageData.content,
      senderId: messageData.senderId,
      senderUsername: messageData.senderUsername,
      channelId: messageData.channelId,
      timestamp: new Date().toISOString(),
      type: messageData.type || 'text'
    };

    messages.push(newMessage);
    this.saveMessages(messages);
    return newMessage;
  }

  getChannelMessages(channelId, limit = 50) {
    const messages = this.getMessages();
    return messages
      .filter(msg => msg.channelId === channelId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-limit);
  }
}

module.exports = new DataStore();