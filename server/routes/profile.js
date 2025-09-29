const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const dataStore = require('../models/mongoDataStore');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only accept image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const user = await dataStore.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// Update user profile
router.put('/me', async (req, res) => {
  try {
    const { username, email } = req.body;
    const updates = {};

    if (username && username.trim()) {
      updates.username = username.trim();
    }
    if (email && email.trim()) {
      updates.email = email.trim().toLowerCase();
    }

    const updatedUser = await dataStore.updateUser(req.user.id, updates);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    res.json({
      success: true,
      message: '个人资料更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'username' ? '用户名' : '邮箱'}已存在`
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// Upload avatar
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件'
      });
    }

    // Get current user to delete old avatar
    const currentUser = await dataStore.findUserById(req.user.id);
    if (currentUser && currentUser.avatar) {
      // Delete old avatar file
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(currentUser.avatar));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user with new avatar path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await dataStore.updateUser(req.user.id, { avatar: avatarUrl });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    res.json({
      success: true,
      message: '头像上传成功',
      avatar: avatarUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error('上传头像失败:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小不能超过5MB'
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// Delete avatar
router.delete('/avatar', async (req, res) => {
  try {
    const currentUser = await dataStore.findUserById(req.user.id);
    if (!currentUser || !currentUser.avatar) {
      return res.status(404).json({
        success: false,
        message: '未找到头像'
      });
    }

    // Delete avatar file
    const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(currentUser.avatar));
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    // Remove avatar from user
    const updatedUser = await dataStore.updateUser(req.user.id, { avatar: null });

    res.json({
      success: true,
      message: '头像删除成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('删除头像失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;