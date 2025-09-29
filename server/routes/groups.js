const express = require('express');
const dataStore = require('../models/mongoDataStore');

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

// STATIC ROUTES FIRST (no parameters)

// 获取可申请的群组（用户未加入的群组）
router.get('/available', async (req, res) => {
  try {
    const availableGroups = await dataStore.getAvailableGroups(req.user.id);

    res.json({
      success: true,
      groups: availableGroups
    });
  } catch (error) {
    console.error('Get available groups error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取所有待审核申请（超级管理员用）
router.get('/applications', async (req, res) => {
  try {
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要超级管理员权限'
      });
    }

    const applications = await dataStore.getPendingApplications();

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 审核申请
router.post('/applications/:applicationId/review', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action, message = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作'
      });
    }

    const reviewedApplication = await dataStore.reviewGroupApplication(applicationId, {
      action,
      message,
      reviewedBy: req.user.id
    });

    res.json({
      success: true,
      message: action === 'approve' ? '申请已批准' : '申请已拒绝',
      application: reviewedApplication
    });
  } catch (error) {
    if (error.message === '申请不存在' || error.message === '申请已被处理') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Review application error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取所有群组（管理员用）
router.get('/all', async (req, res) => {
  try {
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const allGroups = await dataStore.getGroups();

    // 为每个群组添加channels信息
    const groupsWithChannels = await Promise.all(
      allGroups.map(async (group) => {
        const channels = await dataStore.getGroupChannels(group._id.toString());
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
    console.error('Get all groups error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取用户群组
router.get('/', async (req, res) => {
  try {
    const allGroups = await dataStore.getGroups();
    let userGroups = [];

    if (req.user.roles.includes('super-admin')) {
      userGroups = allGroups;
    } else {
      userGroups = allGroups.filter(group =>
        group.memberIds.includes(req.user.id) || group.adminIds.includes(req.user.id)
      );
    }

    // 为每个群组添加channels信息
    const groupsWithChannels = await Promise.all(
      userGroups.map(async (group) => {
        const channels = await dataStore.getGroupChannels(group._id.toString());
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

// 创建群组
router.post('/', async (req, res) => {
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

    const newGroup = await dataStore.addGroup({
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

// PARAMETERIZED ROUTES AFTER STATIC ROUTES

// 获取单个群组信息
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await dataStore.findGroupById(groupId);
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
    const channels = await dataStore.getGroupChannels(groupId);

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

// 申请加入群组
router.post('/:groupId/apply', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message = '' } = req.body;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    // 检查用户是否已经是成员
    if (group.memberIds.some(id => id.toString() === req.user.id.toString()) ||
        group.adminIds.some(id => id.toString() === req.user.id.toString())) {
      return res.status(400).json({
        success: false,
        message: '您已经是该群组的成员'
      });
    }

    const application = await dataStore.createGroupApplication({
      groupId,
      userId: req.user.id,
      message
    });

    res.status(201).json({
      success: true,
      message: '申请已提交，等待管理员审核',
      application
    });
  } catch (error) {
    if (error.message === '已有待审核的申请') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Apply to group error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取群组的待审核申请（管理员用）
router.get('/:groupId/applications', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await dataStore.findGroupById(groupId);
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

    const applications = await dataStore.getPendingApplications(groupId);

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Get group applications error:', error);
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
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '频道名称不能为空'
      });
    }

    const group = await dataStore.findGroupById(groupId);
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

    const newChannel = await dataStore.addChannelToGroup(groupId, {
      name,
      description,
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

    const group = await dataStore.findGroupById(groupId);
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

    const user = await dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    const success = await dataStore.addUserToGroup(groupId, userId);

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

    const group = await dataStore.findGroupById(groupId);
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

    const success = await dataStore.removeUserFromGroup(groupId, userId);

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
    const limit = parseInt(req.query.limit) || 50;

    const group = await dataStore.findGroupById(groupId);
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

    const channel = await dataStore.findChannelById(channelId);
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

    const messages = await dataStore.getChannelMessages(channelId, limit);

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

// 发送消息
router.post('/:groupId/channels/:channelId/messages', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;
    const { content, type = 'text' } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    const channel = await dataStore.findChannelById(channelId);
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

    const message = await dataStore.addMessage({
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