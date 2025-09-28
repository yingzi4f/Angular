const mongoose = require('mongoose');

const groupApplicationSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewMessage: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true
});

// 索引
groupApplicationSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupApplicationSchema.index({ status: 1 });
groupApplicationSchema.index({ createdAt: -1 });

// 静态方法：获取用户的申请记录
groupApplicationSchema.statics.getUserApplications = function(userId) {
  return this.find({ userId })
    .populate('groupId', 'name description')
    .sort({ createdAt: -1 });
};

// 静态方法：获取群组的待审核申请
groupApplicationSchema.statics.getPendingApplicationsForGroup = function(groupId) {
  return this.find({ groupId, status: 'pending' })
    .populate('userId', 'username email avatar')
    .populate('groupId', 'name description')
    .sort({ createdAt: -1 });
};

// 静态方法：获取所有待审核申请（管理员用）
groupApplicationSchema.statics.getAllPendingApplications = function() {
  return this.find({ status: 'pending' })
    .populate('userId', 'username email avatar')
    .populate('groupId', 'name description')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('GroupApplication', groupApplicationSchema);