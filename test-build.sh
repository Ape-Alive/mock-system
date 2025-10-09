#!/bin/bash

echo "🧪 测试打包脚本..."
echo "=================="

# 检查脚本是否存在
if [ ! -f "build.sh" ]; then
    echo "❌ build.sh 不存在"
    exit 1
fi

# 检查脚本权限
if [ ! -x "build.sh" ]; then
    echo "❌ build.sh 没有执行权限"
    exit 1
fi

# 检查 package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json 不存在"
    exit 1
fi

# 检查 Prisma schema
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Prisma schema 不存在"
    exit 1
fi

# 检查 electron-main.js
if [ ! -f "electron-main.js" ]; then
    echo "❌ electron-main.js 不存在"
    exit 1
fi

echo "✅ 所有必要文件都存在"
echo "✅ 打包脚本准备就绪"
echo ""
echo "🚀 运行打包脚本: ./build.sh"
