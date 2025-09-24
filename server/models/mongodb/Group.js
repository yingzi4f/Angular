const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  adminIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  maxMembers: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true
});

// 索引
groupSchema.index({ name: 1 });
groupSchema.index({ adminIds: 1 });
groupSchema.index({ memberIds: 1 });
groupSchema.index({ createdBy: 1 });

// 实例方法：检查用户是否是管理员
groupSchema.methods.isAdmin = function(userId) {
  return this.adminIds.some(id => id.toString() === userId.toString());
};

// 实例方法：检查用户是否是成员
groupSchema.methods.isMember = function(userId) {
  return this.memberIds.some(id => id.toString() === userId.toString());
};

// 实例方法：添加成员
groupSchema.methods.addMember = function(userId) {
  if (!this.isMember(userId)) {
    this.memberIds.push(userId);
  }
  return this.save();
};

// 实例方法：移除成员
groupSchema.methods.removeMember = function(userId) {
  this.memberIds = this.memberIds.filter(id => id.toString() !== userId.toString());
  this.adminIds = this.adminIds.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// 静态方法：获取用户的群组
groupSchema.statics.getUserGroups = function(userId) {
  return this.find({
    $or: [
      { adminIds: userId },
      { memberIds: userId }
    ]
  }).populate('adminIds memberIds', 'username email avatar');
};

module.exports = mongoose.model('Group', groupSchema);