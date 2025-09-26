const express = require('express');
const mongoDataStore = require('../models/mongoDataStore');

const router = express.Router();

function hasPermission(user, group, action) {
  switch (action) {
    case 'manage':
      return user.roles.includes('super-admin') ||
             group.adminIds.some(id => id.toString() === user.id);
    case 'view':
      return user.roles.includes('super-admin') ||
             group.memberIds.some(id => id.toString() === user.id) ||
             group.adminIds.some(id => id.toString() === user.id);
    default:
      return false;
  }
}

// 获取用户的群组列表
router.get('/', async (req, res) => {
  try {
    let userGroups = [];

    if (req.user.roles.includes('super-admin')) {
      userGroups = await mongoDataStore.getGroups();
    } else {
      userGroups = await mongoDataStore.getUserGroups(req.user.id);
    }

    // 为每个群组获取频道信息
    const groupsWithChannels = await Promise.all(
      userGroups.map(async (group) => {
        const channels = await mongoDataStore.getGroupChannels(group._id);
        return {
          ...group.toObject(),
          channels: channels
        };
      })
    );

    res.json({
      success: true,
      groups: groupsWithChannels
    });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取指定用户的群组列表
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 只允许获取自己的群组或超级管理员可以获取任何用户的群组
    if (req.user.id !== userId && !req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const userGroups = await mongoDataStore.getUserGroups(userId);

    // 为每个群组获取频道信息
    const groupsWithChannels = await Promise.all(
      userGroups.map(async (group) => {
        const channels = await mongoDataStore.getGroupChannels(group._id);
        return {
          ...group.toObject(),
          channels: channels
        };
      })
    );

    res.json(groupsWithChannels);

  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取所有群组（超级管理员）
router.get('/all', async (req, res) => {
  try {
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const allGroups = await mongoDataStore.getGroups();

    res.json({
      success: true,
      groups: allGroups
    });

  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建群组
router.post('/', async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '群组名称不能为空'
      });
    }

    if (!req.user.roles.includes('group-admin') && !req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要群组管理员权限'
      });
    }

    const newGroup = await mongoDataStore.addGroup({
      name,
      description,
      isPrivate: isPrivate || false,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      group: newGroup
    });

  } catch (error) {
    console.error('Create group error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '群组名称已存在'
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取群组详细信息
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await mongoDataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    if (!hasPermission(req.user, group, 'view')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    // 获取群组的频道
    const channels = await mongoDataStore.getGroupChannels(groupId);

    res.json({
      success: true,
      group: {
        ...group.toObject(),
        channels: channels
      }
    });

  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新群组信息
router.put('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPrivate } = req.body;

    const group = await mongoDataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isPrivate !== undefined) updates.isPrivate = isPrivate;

    const updatedGroup = await mongoDataStore.updateGroup(groupId, updates);

    res.json({
      success: true,
      group: updatedGroup
    });

  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建频道
router.post('/:groupId/channels', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '频道名称不能为空'
      });
    }

    const group = await mongoDataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const newChannel = await mongoDataStore.addChannelToGroup(groupId, {
      name,
      description,
      isPrivate: isPrivate || false,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      channel: newChannel
    });

  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取群组频道列表
router.get('/:groupId/channels', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await mongoDataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    if (!hasPermission(req.user, group, 'view')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const channels = await mongoDataStore.getGroupChannels(groupId);

    res.json({
      success: true,
      channels: channels
    });

  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 添加成员到群组
router.post('/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    const group = await mongoDataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const user = await mongoDataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    const success = await mongoDataStore.addUserToGroup(groupId, userId);

    if (success) {
      res.json({
        success: true,
        message: '用户已添加到群组'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '添加用户失败'
      });
    }

  } catch (error) {
    console.error('Add user to group error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 从群组移除成员
router.delete('/:groupId/members/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await mongoDataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const success = await mongoDataStore.removeUserFromGroup(groupId, userId);

    if (success) {
      res.json({
        success: true,
        message: '用户已从群组移除'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '移除用户失败'
      });
    }

  } catch (error) {
    console.error('Remove user from group error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取频道消息
router.get('/:groupId/channels/:channelId/messages', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    const group = await mongoDataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    if (!hasPermission(req.user, group, 'view')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const channel = await mongoDataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: '频道未找到'
      });
    }

    if (!channel.memberIds.some(id => id.toString() === req.user.id) &&
        !req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '您不是该频道的成员'
      });
    }

    const messages = await mongoDataStore.getChannelMessages(channelId, {
      page: parseInt(page),
      limit: parseInt(limit),
      before: before ? new Date(before) : undefined
    });

    res.json({
      success: true,
      messages: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get channel messages error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 发送消息到频道
router.post('/:groupId/channels/:channelId/messages', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;
    const { content, type = 'text', fileUrl, fileName, fileSize, mimeType } = req.body;

    if (!content && type === 'text') {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    const group = await mongoDataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    const channel = await mongoDataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: '频道未找到'
      });
    }

    if (!channel.memberIds.some(id => id.toString() === req.user.id) &&
        !req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '您不是该频道的成员'
      });
    }

    const message = await mongoDataStore.addMessage({
      content,
      senderId: req.user.id,
      senderUsername: req.user.username,
      channelId,
      type,
      fileUrl,
      fileName,
      fileSize,
      mimeType
    });

    res.status(201).json({
      success: true,
      message: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 编辑消息
router.put('/:groupId/channels/:channelId/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    const updatedMessage = await mongoDataStore.updateMessage(messageId, content);

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message: '消息未找到'
      });
    }

    // 只有消息发送者或超级管理员可以编辑
    if (updatedMessage.senderId.toString() !== req.user.id &&
        !req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    res.json({
      success: true,
      message: updatedMessage
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除消息
router.delete('/:groupId/channels/:channelId/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const deletedMessage = await mongoDataStore.deleteMessage(messageId);

    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        message: '消息未找到'
      });
    }

    // 只有消息发送者或超级管理员可以删除
    if (deletedMessage.senderId.toString() !== req.user.id &&
        !req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    res.json({
      success: true,
      message: '消息已删除'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;