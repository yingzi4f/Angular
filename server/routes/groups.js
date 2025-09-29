const express = require('express');
const dataStore = require('../models/mongoDataStore');

const router = express.Router();

function hasPermission(user, group, action) {
  switch (action) {
    case 'manage':
      if (user.roles.includes('super-admin')) return true;

      // 检查用户是否是群组管理员（考虑populate后的对象格式）
      return group.adminIds.some(admin => {
        const adminId = admin._id ? admin._id.toString() : admin.toString();
        return adminId === user.id.toString();
      });

    case 'view':
      if (user.roles.includes('super-admin')) return true;

      // 检查用户是否是群组成员或管理员（考虑populate后的对象格式）
      const isMember = group.memberIds.some(member => {
        const memberId = member._id ? member._id.toString() : member.toString();
        return memberId === user.id.toString();
      });

      const isAdmin = group.adminIds.some(admin => {
        const adminId = admin._id ? admin._id.toString() : admin.toString();
        return adminId === user.id.toString();
      });

      return isMember || isAdmin;

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
    let userGroups = [];

    // 超级管理员可以看到所有群组，其他管理员只能看到自己管理/加入的群组
    if (req.user.roles.includes('super-admin')) {
      userGroups = allGroups;
    } else {
      userGroups = allGroups.filter(group => {
        // 检查用户是否是群组成员或管理员（考虑populate后的对象格式）
        const isMember = group.memberIds.some(member => {
          const memberId = member._id ? member._id.toString() : member.toString();
          return memberId === req.user.id.toString();
        });

        const isAdmin = group.adminIds.some(admin => {
          const adminId = admin._id ? admin._id.toString() : admin.toString();
          return adminId === req.user.id.toString();
        });

        return isMember || isAdmin;
      });
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
      userGroups = allGroups.filter(group => {
        // 检查用户是否是群组成员或管理员（考虑populate后的对象格式）
        const isMember = group.memberIds.some(member => {
          const memberId = member._id ? member._id.toString() : member.toString();
          return memberId === req.user.id.toString();
        });

        const isAdmin = group.adminIds.some(admin => {
          const adminId = admin._id ? admin._id.toString() : admin.toString();
          return adminId === req.user.id.toString();
        });

        return isMember || isAdmin;
      });
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

// 删除群组
router.delete('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    // 权限检查：超级管理员可以删除所有群组，群组管理员只能删除自己创建的群组
    const isSuperAdmin = req.user.roles.includes('super-admin');
    const isCreator = group.createdBy.toString() === req.user.id.toString();

    if (!isSuperAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有超级管理员或群组创建者可以删除群组'
      });
    }

    const success = await dataStore.deleteGroup(groupId);

    if (success) {
      res.json({
        success: true,
        message: '群组已删除'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '删除群组失败'
      });
    }

  } catch (error) {
    console.error('Delete group error:', error);
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

// 删除频道
router.delete('/:groupId/channels/:channelId', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;

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

    const channel = await dataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: '频道未找到'
      });
    }

    // 防止删除general频道（默认频道）
    if (channel.name === 'general') {
      return res.status(400).json({
        success: false,
        message: '不能删除默认频道'
      });
    }

    const success = await dataStore.deleteChannel(channelId);

    if (success) {
      res.json({
        success: true,
        message: '频道已删除'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '删除频道失败'
      });
    }

  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 添加成员到频道
router.post('/:groupId/channels/:channelId/members', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;
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

    const channel = await dataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: '频道未找到'
      });
    }

    const user = await dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    // 检查用户是否已在频道中
    const isAlreadyMember = channel.memberIds.some(memberId => {
      const id = memberId._id ? memberId._id.toString() : memberId.toString();
      return id === userId.toString();
    });

    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: '用户已在频道中'
      });
    }

    // 添加成员到频道
    const success = await channel.addMember(userId);

    if (success) {
      res.json({
        success: true,
        message: '用户已添加到频道'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '添加用户失败'
      });
    }

  } catch (error) {
    console.error('Add user to channel error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 从频道移除成员
router.delete('/:groupId/channels/:channelId/members/:userId', async (req, res) => {
  try {
    const { groupId, channelId, userId } = req.params;

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

    const channel = await dataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: '频道未找到'
      });
    }

    // 检查用户是否在频道中
    const isMember = channel.memberIds.some(memberId => {
      const id = memberId._id ? memberId._id.toString() : memberId.toString();
      return id === userId.toString();
    });

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: '用户不在频道中'
      });
    }

    // 从频道移除成员
    const success = await channel.removeMember(userId);

    if (success) {
      res.json({
        success: true,
        message: '用户已从频道移除'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '移除用户失败'
      });
    }

  } catch (error) {
    console.error('Remove user from channel error:', error);
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

// 提升成员为群组管理员（仅限超级管理员）
router.put('/:groupId/members/:userId/promote', async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // 检查权限：只有超级管理员可以提升群组管理员
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有超级管理员可以提升群组管理员'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    const user = await dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    // 检查用户是否已经是群组管理员
    const isAlreadyAdmin = group.adminIds.some(adminId => {
      const id = adminId._id ? adminId._id.toString() : adminId.toString();
      return id === userId.toString();
    });

    if (isAlreadyAdmin) {
      return res.status(400).json({
        success: false,
        message: '该用户已经是群组管理员'
      });
    }

    // 检查用户是否是群组成员
    const isMember = group.memberIds.some(memberId => {
      const id = memberId._id ? memberId._id.toString() : memberId.toString();
      return id === userId.toString();
    });

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: '用户必须先是群组成员才能被提升为管理员'
      });
    }

    // 提升用户为群组管理员
    const success = await dataStore.promoteUserToGroupAdmin(groupId, userId);

    if (success) {
      res.json({
        success: true,
        message: '用户已成功提升为群组管理员'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '提升用户失败'
      });
    }

  } catch (error) {
    console.error('Promote user to group admin error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 撤销群组管理员权限（仅限超级管理员）
router.put('/:groupId/members/:userId/demote', async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // 检查权限：只有超级管理员可以撤销群组管理员权限
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有超级管理员可以撤销群组管理员权限'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组未找到'
      });
    }

    const user = await dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    // 检查用户是否是群组管理员
    const isAdmin = group.adminIds.some(adminId => {
      const id = adminId._id ? adminId._id.toString() : adminId.toString();
      return id === userId.toString();
    });

    if (!isAdmin) {
      return res.status(400).json({
        success: false,
        message: '该用户不是群组管理员'
      });
    }

    // 撤销群组管理员权限
    const success = await dataStore.demoteUserFromGroupAdmin(groupId, userId);

    if (success) {
      res.json({
        success: true,
        message: '用户的群组管理员权限已被撤销'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '撤销权限失败'
      });
    }

  } catch (error) {
    console.error('Demote user from group admin error:', error);
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

    // 检查用户是否是频道成员（考虑populate后的对象格式）
    if (!req.user.roles.includes('super-admin')) {
      const isMember = channel.memberIds.some(member => {
        const memberId = member._id ? member._id.toString() : member.toString();
        return memberId === req.user.id.toString();
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: '您不是该频道的成员'
        });
      }
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
    const { content, type = 'text', fileUrl, fileName, fileSize, mimeType } = req.body;

    // 调试日志
    console.log('Received message data:', { content, type, fileUrl, fileName, fileSize, mimeType });

    // 对于非文本消息类型，内容可以为空
    if (type === 'text' && (!content || content.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    // 对于图片、文件、视频类型，需要fileUrl
    if (['image', 'file', 'video'].includes(type) && !fileUrl) {
      return res.status(400).json({
        success: false,
        message: '文件URL不能为空'
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

    // 检查用户是否是频道成员（考虑populate后的对象格式）
    if (!req.user.roles.includes('super-admin')) {
      const isMember = channel.memberIds.some(member => {
        const memberId = member._id ? member._id.toString() : member.toString();
        return memberId === req.user.id.toString();
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: '您不是该频道的成员'
        });
      }
    }

    // 准备消息数据，包含图片相关字段（如果存在）
    const messageData = {
      content,
      senderId: req.user.id,
      senderUsername: req.user.username,
      channelId,
      type
    };

    // 如果是图片、文件或视频类型，添加相关字段
    if (['image', 'file', 'video'].includes(type)) {
      if (fileUrl) messageData.fileUrl = fileUrl;
      if (fileName) messageData.fileName = fileName;
      if (fileSize) messageData.fileSize = fileSize;
      if (mimeType) messageData.mimeType = mimeType;
    }

    const message = await dataStore.addMessage(messageData);

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