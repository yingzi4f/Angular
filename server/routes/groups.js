const express = require('express');
const dataStore = require('../models/dataStore');

const router = express.Router();

function hasPermission(user, group, action) {
  switch (action) {
    case 'manage':
      return user.roles.includes('super-admin') || group.adminIds.includes(user.id);
    case 'view':
      return user.roles.includes('super-admin') ||
             group.memberIds.includes(user.id) ||
             group.adminIds.includes(user.id);
    default:
      return false;
  }
}

router.get('/', (req, res) => {
  try {
    const allGroups = dataStore.getGroups();
    let userGroups = [];

    if (req.user.roles.includes('super-admin')) {
      userGroups = allGroups;
    } else {
      userGroups = allGroups.filter(group =>
        group.memberIds.includes(req.user.id) || group.adminIds.includes(req.user.id)
      );
    }

    res.json({
      success: true,
      groups: userGroups
    });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

router.get('/all', (req, res) => {
  try {
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const allGroups = dataStore.getGroups();

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

router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;

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

    const newGroup = dataStore.addGroup({
      name,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      group: newGroup
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

router.post('/:groupId/channels', (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '频道名称不能为空'
      });
    }

    const group = dataStore.findGroupById(groupId);
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

    const newChannel = dataStore.addChannelToGroup(groupId, {
      name,
      description
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

router.post('/:groupId/members', (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    const group = dataStore.findGroupById(groupId);
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

    const user = dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    const success = dataStore.addUserToGroup(groupId, userId);

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

router.delete('/:groupId/members/:userId', (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = dataStore.findGroupById(groupId);
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

    const success = dataStore.removeUserFromGroup(groupId, userId);

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

router.get('/:groupId/channels/:channelId/messages', (req, res) => {
  try {
    const { groupId, channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const group = dataStore.findGroupById(groupId);
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

    const channel = group.channels.find(c => c.id === channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: '频道未找到'
      });
    }

    if (!channel.memberIds.includes(req.user.id) && !req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '您不是该频道的成员'
      });
    }

    const messages = dataStore.getChannelMessages(channelId, limit);

    res.json({
      success: true,
      messages: messages
    });

  } catch (error) {
    console.error('Get channel messages error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

router.post('/:groupId/channels/:channelId/messages', (req, res) => {
  try {
    const { groupId, channelId } = req.params;
    const { content, type = 'text' } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    const group = dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    const channel = group.channels.find(c => c.id === channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: '频道未找到'
      });
    }

    if (!channel.memberIds.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '您不是该频道的成员'
      });
    }

    const message = dataStore.addMessage({
      content,
      senderId: req.user.id,
      senderUsername: req.user.username,
      channelId,
      type
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

module.exports = router;