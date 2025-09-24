const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    },
    trim: true,
    maxlength: 2000
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderUsername: {
    type: String,
    required: true
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'video'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    required: function() {
      return ['image', 'file', 'video'].includes(this.type);
    }
  },
  fileName: {
    type: String,
    required: function() {
      return ['file', 'video'].includes(this.type);
    }
  },
  fileSize: {
    type: Number,
    required: function() {
      return ['image', 'file', 'video'].includes(this.type);
    }
  },
  mimeType: {
    type: String,
    required: function() {
      return ['image', 'file', 'video'].includes(this.type);
    }
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// 索引
messageSchema.index({ channelId: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ channelId: 1, createdAt: -1 });

// 实例方法：添加反应
messageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(
    reaction => reaction.userId.toString() === userId.toString() && reaction.emoji === emoji
  );

  if (!existingReaction) {
    this.reactions.push({ userId, emoji });
    return this.save();
  }

  return Promise.resolve(this);
};

// 实例方法：移除反应
messageSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(
    reaction => !(reaction.userId.toString() === userId.toString() && reaction.emoji === emoji)
  );
  return this.save();
};

// 实例方法：编辑消息
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// 静态方法：获取频道消息（分页）
messageSchema.statics.getChannelMessages = function(channelId, options = {}) {
  const { page = 1, limit = 50, before } = options;
  const skip = (page - 1) * limit;

  let query = { channelId };
  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .populate('senderId', 'username avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Message', messageSchema);