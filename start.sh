#!/bin/bash

echo "🚀 启动聊天系统第二阶段"
echo "=========================="

# 检查 Docker 是否正在运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 启动 MongoDB 和 Mongo Express
echo "🐳 启动 MongoDB 数据库..."
docker-compose up -d

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 检查数据库是否启动成功
if docker-compose ps | grep -q "Up"; then
    echo "✅ MongoDB 数据库启动成功"
    echo "📊 MongoDB Express 管理界面: http://localhost:8081"
else
    echo "❌ 数据库启动失败"
    exit 1
fi

# 安装服务器端依赖（如果需要）
if [ ! -d "server/node_modules" ]; then
    echo "📦 安装服务器端依赖..."
    cd server
    npm install
    cd ..
fi

# 安装客户端依赖（如果需要）
if [ ! -d "client/node_modules" ]; then
    echo "📦 安装客户端依赖..."
    cd client
    npm install
    cd ..
fi

echo ""
echo "🎉 聊天系统第二阶段准备完成！"
echo ""
echo "请按以下步骤启动服务："
echo "1. 启动服务器: cd server && npm run dev"
echo "2. 启动客户端: cd client && npm start"
echo ""
echo "访问地址："
echo "- 客户端: http://localhost:4200"
echo "- 服务器API: http://localhost:3000"
echo "- MongoDB管理: http://localhost:8081"
echo ""
echo "默认登录账户："
echo "- 用户名: super"
echo "- 密码: 123"
echo ""
echo "新功能："
echo "✨ MongoDB 数据库持久化"
echo "✨ 图片和文件上传"
echo "✨ 视频聊天功能"
echo "✨ 实时消息历史"
echo "✨ 用户头像支持"
echo "✨ 增强的实时通信"