const User = require('./mongodb/User');
const Group = require('./mongodb/Group');
const Channel = require('./mongodb/Channel');
const Message = require('./mongodb/Message');
const mongoose = require('mongoose');

class MongoDataStore {
  constructor() {
    // 初始化时确保默认超级管理员存在
    this.initializeDefaultUser();
  }

  async initializeDefaultUser() {
    try {
      const existingSuperAdmin = await User.findOne({ username: 'super' });
      if (!existingSuperAdmin) {
        const superAdmin = new User({
          username: 'super',
          email: 'super@admin.com',
          password: '123',
          roles: ['super-admin']
        });
        await superAdmin.save();
        console.log('✅ 默认超级管理员已创建');
      }
    } catch (error) {
      console.error('❌ 创建默认用户失败:', error);
    }
  }

  // 用户管理方法
  async getUsers() {
    try {
      return await User.find().select('-password');
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  async addUser(userData) {
    try {
      const user = new User(userData);
      return await user.save();
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  async findUserByUsername(username) {
    try {
      return await User.findOne({ username });
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  async findUserById(id) {
    try {
      return await User.findById(id).select('-password');
    } catch (error) {
      console.error('根据ID查找用户失败:', error);
      throw error;
    }
  }

  async updateUser(userId, updates) {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password');
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const result = await User.findByIdAndDelete(userId);
      if (result) {
        // 从所有群组中移除该用户
        await Group.updateMany(
          {},
          {
            $pull: {
              memberIds: userId,
              adminIds: userId
            }
          }
        );

        // 从所有频道中移除该用户
        await Channel.updateMany(
          {},
          { $pull: { memberIds: userId } }
        );

        return true;
      }
      return false;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  // 群组管理方法
  async getGroups() {
    try {
      return await Group.find()
        .populate('adminIds', 'username email avatar')
        .populate('memberIds', 'username email avatar')
        .populate('createdBy', 'username email');
    } catch (error) {
      console.error('获取群组列表失败:', error);
      throw error;
    }
  }

  async getUserGroups(userId) {
    try {
      return await Group.getUserGroups(userId);
    } catch (error) {
      console.error('获取用户群组失败:', error);
      throw error;
    }
  }

  async addGroup(groupData) {
    try {
      const group = new Group(groupData);

      // 创建者自动成为管理员和成员
      if (!group.adminIds.includes(groupData.createdBy)) {
        group.adminIds.push(groupData.createdBy);
      }
      if (!group.memberIds.includes(groupData.createdBy)) {
        group.memberIds.push(groupData.createdBy);
      }

      const savedGroup = await group.save();

      // 创建默认的 general 频道
      const defaultChannel = new Channel({
        name: 'general',
        description: '默认频道',
        groupId: savedGroup._id,
        memberIds: [...savedGroup.memberIds],
        createdBy: groupData.createdBy
      });

      await defaultChannel.save();

      return await Group.findById(savedGroup._id)
        .populate('adminIds', 'username email avatar')
        .populate('memberIds', 'username email avatar');
    } catch (error) {
      console.error('创建群组失败:', error);
      throw error;
    }
  }

  async findGroupById(id) {
    try {
      return await Group.findById(id)
        .populate('adminIds', 'username email avatar')
        .populate('memberIds', 'username email avatar');
    } catch (error) {
      console.error('查找群组失败:', error);
      throw error;
    }
  }

  async updateGroup(groupId, updates) {
    try {
      return await Group.findByIdAndUpdate(
        groupId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('adminIds memberIds', 'username email avatar');
    } catch (error) {
      console.error('更新群组失败:', error);
      throw error;
    }
  }

  async addUserToGroup(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      const success = await group.addMember(userId);

      // 将用户添加到群组的所有频道
      await Channel.updateMany(
        { groupId: groupId },
        { $addToSet: { memberIds: userId } }
      );

      return !!success;
    } catch (error) {
      console.error('添加用户到群组失败:', error);
      throw error;
    }
  }

  async removeUserFromGroup(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      const success = await group.removeMember(userId);

      // 从群组的所有频道中移除用户
      await Channel.updateMany(
        { groupId: groupId },
        { $pull: { memberIds: userId } }
      );

      return !!success;
    } catch (error) {
      console.error('从群组移除用户失败:', error);
      throw error;
    }
  }

  // 频道管理方法
  async getGroupChannels(groupId) {
    try {
      return await Channel.getGroupChannels(groupId);
    } catch (error) {
      console.error('获取群组频道失败:', error);
      throw error;
    }
  }

  async addChannelToGroup(groupId, channelData) {
    try {
      // 获取群组成员列表
      const group = await Group.findById(groupId);
      if (!group) return null;

      const channel = new Channel({
        ...channelData,
        groupId: groupId,
        memberIds: [...group.memberIds]
      });

      return await channel.save();
    } catch (error) {
      console.error('创建频道失败:', error);
      throw error;
    }
  }

  async findChannelById(channelId) {
    try {
      return await Channel.findById(channelId)
        .populate('memberIds', 'username email avatar')
        .populate('groupId', 'name');
    } catch (error) {
      console.error('查找频道失败:', error);
      throw error;
    }
  }

  // 消息管理方法
  async getChannelMessages(channelId, options = {}) {
    try {
      const messages = await Message.getChannelMessages(channelId, options);
      return messages.reverse(); // 返回时间正序
    } catch (error) {
      console.error('获取频道消息失败:', error);
      throw error;
    }
  }

  async addMessage(messageData) {
    try {
      const message = new Message(messageData);
      const savedMessage = await message.save();

      // 更新频道的最后活动时间
      await Channel.findByIdAndUpdate(
        messageData.channelId,
        { lastActivity: new Date() }
      );

      return await Message.findById(savedMessage._id)
        .populate('senderId', 'username avatar');
    } catch (error) {
      console.error('创建消息失败:', error);
      throw error;
    }
  }

  async updateMessage(messageId, content) {
    try {
      const message = await Message.findById(messageId);
      if (!message) return null;

      return await message.editMessage(content);
    } catch (error) {
      console.error('更新消息失败:', error);
      throw error;
    }
  }

  async deleteMessage(messageId) {
    try {
      return await Message.findByIdAndDelete(messageId);
    } catch (error) {
      console.error('删除消息失败:', error);
      throw error;
    }
  }

  // 用户在线状态管理
  async setUserOnline(userId, isOnline = true) {
    try {
      return await User.findByIdAndUpdate(
        userId,
        {
          isOnline,
          lastSeen: new Date()
        },
        { new: true }
      ).select('-password');
    } catch (error) {
      console.error('更新用户在线状态失败:', error);
      throw error;
    }
  }

  // 获取在线用户
  async getOnlineUsers() {
    try {
      return await User.find({ isOnline: true }).select('username avatar');
    } catch (error) {
      console.error('获取在线用户失败:', error);
      throw error;
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      const userCount = await User.countDocuments();
      const groupCount = await Group.countDocuments();
      const messageCount = await Message.countDocuments();

      return {
        status: 'healthy',
        counts: {
          users: userCount,
          groups: groupCount,
          messages: messageCount
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = new MongoDataStore();