const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
    this.connect();
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:chatpassword@localhost:27017/chatdb?authSource=admin';

      const options = {
        maxPoolSize: 10, // 最大连接池大小
        serverSelectionTimeoutMS: 5000, // 服务器选择超时时间
        socketTimeoutMS: 45000 // Socket 超时时间
      };

      this.connection = await mongoose.connect(mongoUri, options);

      console.log(`✅ MongoDB 连接成功: ${this.connection.connection.host}:${this.connection.connection.port}`);
      console.log(`📂 数据库名称: ${this.connection.connection.name}`);

      // 监听连接事件
      mongoose.connection.on('connected', () => {
        console.log('📡 MongoDB 连接已建立');
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB 连接错误:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📡 MongoDB 连接已断开');
      });

      // 优雅关闭
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ MongoDB 连接失败:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        console.log('📡 MongoDB 连接已关闭');
      }
    } catch (error) {
      console.error('❌ 关闭 MongoDB 连接时出错:', error);
    }
  }

  getConnection() {
    return this.connection;
  }

  // 健康检查
  async healthCheck() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      return {
        status: state === 1 ? 'healthy' : 'unhealthy',
        state: states[state],
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new Database();