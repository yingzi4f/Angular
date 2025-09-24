const express = require('express');
const mongoDataStore = require('../models/mongoDataStore');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const user = await mongoDataStore.findUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    let isPasswordValid = false;

    // 特殊处理超级管理员默认密码
    if (user.username === 'super' && password === '123') {
      isPasswordValid = true;
    } else {
      isPasswordValid = await user.comparePassword(password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 更新用户在线状态
    await mongoDataStore.setUserOnline(user._id, true);

    const token = generateToken(user);

    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      avatar: user.avatar,
      groups: user.groups
    };

    res.json({
      success: true,
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '所有字段都是必需的'
      });
    }

    const existingUser = await mongoDataStore.findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    }

    const newUser = await mongoDataStore.addUser({
      username,
      email,
      password,
      roles: ['user']
    });

    const userResponse = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      roles: newUser.roles,
      avatar: newUser.avatar,
      groups: newUser.groups
    };

    res.status(201).json({
      success: true,
      user: userResponse,
      message: '用户注册成功'
    });

  } catch (error) {
    console.error('Register error:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field === 'email' ? '邮箱' : '用户名'}已存在`
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取所有用户（需要认证）
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await mongoDataStore.getUsers();

    res.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 提升用户权限
router.put('/users/:id/promote', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // 检查操作者权限
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    if (!['group-admin', 'super-admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色'
      });
    }

    const user = await mongoDataStore.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    // 添加新角色（如果还没有）
    const updatedRoles = [...new Set([...user.roles, role])];
    await mongoDataStore.updateUser(id, { roles: updatedRoles });

    res.json({
      success: true,
      message: '用户权限已更新'
    });

  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除用户
router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查操作者权限
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    const success = await mongoDataStore.deleteUser(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    res.json({
      success: true,
      message: '用户已删除'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新用户资料
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { email, avatar } = req.body;
    const updates = {};

    if (email) updates.email = email;
    if (avatar) updates.avatar = avatar;

    const updatedUser = await mongoDataStore.updateUser(req.user.id, updates);

    res.json({
      success: true,
      user: updatedUser,
      message: '资料更新成功'
    });

  } catch (error) {
    console.error('Update profile error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '邮箱已存在'
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取在线用户
router.get('/online-users', authenticateToken, async (req, res) => {
  try {
    const onlineUsers = await mongoDataStore.getOnlineUsers();

    res.json({
      success: true,
      users: onlineUsers
    });

  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 用户登出
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // 更新用户离线状态
    await mongoDataStore.setUserOnline(req.user.id, false);

    res.json({
      success: true,
      message: '已成功登出'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;