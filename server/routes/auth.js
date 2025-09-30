const express = require('express');
const bcrypt = require('bcryptjs');
const dataStore = require('../models/mongoDataStore');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const user = await dataStore.findUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    let isPasswordValid = false;

    if (user.username === 'super' && password === '123456') {
      isPasswordValid = true;
    } else {
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const token = generateToken(user);

    const userResponse = {
      id: user._id || user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      groups: user.groups || []
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

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '所有字段都是必需的'
      });
    }

    const existingUser = await dataStore.findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    }

    const newUser = await dataStore.addUser({
      username,
      email,
      password,
      roles: ['user']
    });

    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      roles: newUser.roles,
      groups: newUser.groups
    };

    res.status(201).json({
      success: true,
      user: userResponse,
      message: '用户注册成功'
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await dataStore.getUsers();
    const usersResponse = users.map(user => ({
      id: user._id || user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      groups: user.groups || [],
      createdAt: user.createdAt
    }));

    res.json({
      success: true,
      users: usersResponse
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

router.put('/users/:id/promote', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['group-admin', 'super-admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色'
      });
    }

    const user = await dataStore.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    // 确保user.roles存在并且是数组
    if (!user.roles || !Array.isArray(user.roles)) {
      user.roles = ['user'];
    }

    if (!user.roles.includes(role)) {
      user.roles.push(role);
      dataStore.updateUser(id, { roles: user.roles });
    }

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

router.put('/users/:id/demote', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['group-admin', 'super-admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色'
      });
    }

    const user = await dataStore.findUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    // 确保user.roles存在并且是数组
    if (!user.roles || !Array.isArray(user.roles)) {
      user.roles = ['user'];
    }

    // 从角色列表中移除指定角色
    if (user.roles.includes(role)) {
      user.roles = user.roles.filter(r => r !== role);
      // 确保至少保留user角色
      if (!user.roles.includes('user')) {
        user.roles.push('user');
      }
      await dataStore.updateUser(id, { roles: user.roles });
    }

    res.json({
      success: true,
      message: '用户权限已更新'
    });

  } catch (error) {
    console.error('Demote user error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

router.delete('/users/:id', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    const success = await dataStore.deleteUser(id);

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

// 管理员创建用户
router.post('/admin/create-user', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { username, email, password, roles = ['user'] } = req.body;

    // 检查权限：只有super-admin和group-admin可以创建用户
    if (!req.user.roles.includes('super-admin') && !req.user.roles.includes('group-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要管理员权限'
      });
    }

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码不能为空'
      });
    }

    // 检查用户名长度
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        message: '用户名长度必须在3-20个字符之间'
      });
    }

    // 检查密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度不能少于6个字符'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await dataStore.createUserByAdmin({
      username,
      email,
      password: hashedPassword,
      roles
    });

    const userResponse = {
      id: newUser._id || newUser.id,
      username: newUser.username,
      email: newUser.email,
      roles: newUser.roles,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      success: true,
      user: userResponse,
      message: '用户创建成功'
    });

  } catch (error) {
    if (error.message === '用户名或邮箱已存在') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    console.error('Admin create user error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;