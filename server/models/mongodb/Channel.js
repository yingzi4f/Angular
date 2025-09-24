const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
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
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
channelSchema.index({ groupId: 1 });
channelSchema.index({ memberIds: 1 });
channelSchema.index({ name: 1, groupId: 1 });

// 实例方法：检查用户是否是频道成员
channelSchema.methods.isMember = function(userId) {
  return this.memberIds.some(id => id.toString() === userId.toString());
};

// 实例方法：添加成员
channelSchema.methods.addMember = function(userId) {
  if (!this.isMember(userId)) {
    this.memberIds.push(userId);
  }
  return this.save();
};

// 实例方法：移除成员
channelSchema.methods.removeMember = function(userId) {
  this.memberIds = this.memberIds.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// 静态方法：获取群组的频道
channelSchema.statics.getGroupChannels = function(groupId) {
  return this.find({ groupId }).populate('memberIds', 'username email avatar');
};

// 更新最后活动时间的中间件
channelSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

module.exports = mongoose.model('Channel', channelSchema);