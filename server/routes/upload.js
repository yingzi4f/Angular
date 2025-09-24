const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 配置文件存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = './uploads/files';

    // 根据文件类型选择不同的存储目录
    if (file.fieldname === 'avatar') {
      uploadPath = './uploads/avatars';
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath = './uploads/images';
    }

    // 确保目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = {
    avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    file: [
      // 图片
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      // 文档
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // 压缩文件
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // 其他
      'application/json', 'text/csv'
    ]
  };

  const fieldType = file.fieldname || 'file';
  const allowed = allowedTypes[fieldType] || allowedTypes.file;

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 配置 multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 默认 10MB
    files: 5 // 最多 5 个文件
  }
});

// 头像上传
router.post('/avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const fileUrl = `/uploads/avatars/${req.file.filename}`;

    res.json({
      success: true,
      message: '头像上传成功',
      fileUrl: fileUrl,
      fileInfo: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
});

// 聊天图片上传
router.post('/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const fileUrl = `/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      message: '图片上传成功',
      fileUrl: fileUrl,
      fileInfo: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
        width: req.body.width || null,
        height: req.body.height || null
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
});

// 文件上传
router.post('/file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    let uploadSubDir = 'files';
    if (req.file.mimetype.startsWith('image/')) {
      uploadSubDir = 'images';
    }

    const fileUrl = `/uploads/${uploadSubDir}/${req.file.filename}`;

    res.json({
      success: true,
      message: '文件上传成功',
      fileUrl: fileUrl,
      fileInfo: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
});

// 多文件上传
router.post('/files', upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const uploadedFiles = req.files.map(file => {
      let uploadSubDir = 'files';
      if (file.mimetype.startsWith('image/')) {
        uploadSubDir = 'images';
      }

      return {
        originalName: file.originalname,
        filename: file.filename,
        fileUrl: `/uploads/${uploadSubDir}/${file.filename}`,
        size: file.size,
        mimeType: file.mimetype
      };
    });

    res.json({
      success: true,
      message: `成功上传 ${uploadedFiles.length} 个文件`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
});

// 删除文件
router.delete('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const { type = 'files' } = req.query;

    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: '无效的文件名'
      });
    }

    const allowedTypes = ['files', 'images', 'avatars'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的文件类型'
      });
    }

    const filePath = path.join(__dirname, '..', 'uploads', type, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 删除文件
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
});

// 获取文件信息
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const { type = 'files' } = req.query;

    // 安全检查
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: '无效的文件名'
      });
    }

    const allowedTypes = ['files', 'images', 'avatars'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的文件类型'
      });
    }

    const filePath = path.join(__dirname, '..', 'uploads', type, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filename);

    res.json({
      success: true,
      fileInfo: {
        filename: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: ext,
        type: type
      }
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: '获取文件信息失败'
    });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '文件数量超过限制'
      });
    }
  }

  res.status(400).json({
    success: false,
    message: error.message || '上传失败'
  });
});

module.exports = router;