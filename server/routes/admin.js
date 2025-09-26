const express = require('express');
const mongoDataStore = require('../models/mongoDataStore');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有用户 (仅超级管理员)
router.get('/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await mongoDataStore.getUsers();
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

// 获取所有群组 (仅超级管理员)
router.get('/groups', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const groups = await mongoDataStore.getGroups();
    res.json(groups);
  } catch (error) {
    console.error('获取群组列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取群组列表失败',
      error: error.message
    });
  }
});

// 删除用户 (仅超级管理员)
router.delete('/users/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // 防止删除超级管理员自己
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    const result = await mongoDataStore.deleteUser(userId);

    if (result) {
      res.json({
        success: true,
        message: '用户删除成功'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      error: error.message
    });
  }
});

// 更新用户角色 (仅超级管理员)
router.put('/users/:userId/roles', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;

    if (!Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        message: '角色必须是数组格式'
      });
    }

    // 验证角色
    const validRoles = ['user', 'group-admin', 'super-admin'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));

    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `无效的角色: ${invalidRoles.join(', ')}`
      });
    }

    // 防止移除自己的超级管理员权限
    if (req.user.id === userId && !roles.includes('super-admin')) {
      return res.status(400).json({
        success: false,
        message: '不能移除自己的超级管理员权限'
      });
    }

    const updatedUser = await mongoDataStore.updateUser(userId, { roles });

    if (updatedUser) {
      res.json({
        success: true,
        message: '用户角色更新成功',
        user: updatedUser
      });
    } else {
      res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }
  } catch (error) {
    console.error('更新用户角色失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户角色失败',
      error: error.message
    });
  }
});

module.exports = router;