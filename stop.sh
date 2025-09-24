#!/bin/bash

echo "🛑 停止聊天系统第二阶段"
echo "========================"

# 停止 Docker 容器
echo "🐳 停止 MongoDB 数据库和相关服务..."
docker-compose down

# 检查是否还有相关进程运行
echo "🔍 检查是否有遗留进程..."

# 查找并停止 Node.js 进程
PIDS=$(ps aux | grep -E "(server|client)" | grep -v grep | awk '{print $2}')
if [ ! -z "$PIDS" ]; then
    echo "🔄 停止遗留的 Node.js 进程..."
    echo $PIDS | xargs kill -9 2>/dev/null || true
fi

echo "✅ 聊天系统已完全停止"
echo ""
echo "数据已保存在 Docker 卷中"
echo "下次启动时数据将自动恢复"