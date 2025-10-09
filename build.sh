#!/bin/bash

# Mock System 打包脚本
set -e

echo "🚀 Mock System 打包脚本"
echo "========================"

# 检查环境
echo "ℹ️  检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi
echo "✅ 环境检查通过"

# 清理环境
echo "ℹ️  清理环境..."
pkill -f "Mock System" 2>/dev/null || true
sleep 2
rm -rf dist/
echo "✅ 环境清理完成"

# 安装依赖
echo "ℹ️  安装依赖..."
npm install
echo "✅ 依赖安装完成"

# 生成 Prisma 客户端
echo "ℹ️  生成 Prisma 客户端..."
npx prisma generate
echo "✅ Prisma 客户端生成完成"

# 检查数据库
echo "ℹ️  检查数据库..."
if [ ! -f "prisma/dev.db" ]; then
    echo "⚠️  创建数据库..."
    npx prisma db push
fi
echo "✅ 数据库检查完成"

# 构建应用
echo "ℹ️  构建应用..."
export CSC_IDENTITY_AUTO_DISCOVERY=false
export ELECTRON_BUILDER_CACHE="/tmp/electron-builder-cache"
mkdir -p "/tmp/electron-builder-cache"
npm run build-mac
echo "✅ 应用构建完成"

# 修复权限
echo "ℹ️  修复应用权限..."
if [ -d "dist/mac/Mock System.app" ]; then
    xattr -dr com.apple.quarantine "dist/mac/Mock System.app" 2>/dev/null || true
    codesign --force --deep --sign - "dist/mac/Mock System.app" 2>/dev/null || true
    echo "✅ x64 版本权限已修复"
fi

if [ -d "dist/mac-arm64/Mock System.app" ]; then
    xattr -dr com.apple.quarantine "dist/mac-arm64/Mock System.app" 2>/dev/null || true
    codesign --force --deep --sign - "dist/mac-arm64/Mock System.app" 2>/dev/null || true
    echo "✅ ARM64 版本权限已修复"
fi

# 显示结果
echo ""
echo "🎉 构建完成！"
echo "=============="
echo ""
echo "📱 应用文件:"
echo "   - x64:   dist/mac/Mock System.app"
echo "   - ARM64: dist/mac-arm64/Mock System.app"
echo ""
echo "📦 DMG 安装包:"
echo "   - x64:   dist/Mock System-1.0.0.dmg"
echo "   - ARM64: dist/Mock System-1.0.0-arm64.dmg"
echo ""
echo "🚀 使用方法:"
echo "   1. 双击 .app 文件直接运行"
echo "   2. 或安装 .dmg 包到 Applications 目录"
echo "   3. 如果提示'已损坏'，运行: ./fix-app-permissions.sh"
echo ""
echo "🌐 应用启动后访问: http://localhost:3400"
echo ""
echo "✅ 打包完成！"
