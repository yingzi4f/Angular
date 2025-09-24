// MongoDB 初始化脚本
// 创建聊天系统数据库和默认数据

db = db.getSiblingDB('chatdb');

// 创建用户集合并插入默认超级管理员
db.users.insertOne({
  username: 'super',
  email: 'super@admin.com',
  password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 对应密码: 123
  roles: ['super-admin'],
  groups: [],
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 创建群组集合索引
db.groups.createIndex({ "name": 1 });
db.groups.createIndex({ "adminIds": 1 });
db.groups.createIndex({ "memberIds": 1 });

// 创建频道集合索引
db.channels.createIndex({ "groupId": 1 });
db.channels.createIndex({ "memberIds": 1 });

// 创建消息集合索引
db.messages.createIndex({ "channelId": 1 });
db.messages.createIndex({ "senderId": 1 });
db.messages.createIndex({ "timestamp": -1 });

// 创建用户集合索引
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

print('数据库初始化完成！');
print('默认管理员账户：用户名: super, 密码: 123');