# Mock System 打包使用指南

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 生成 Prisma 客户端
```bash
npx prisma generate
```

### 3. 构建 macOS 应用
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
export ELECTRON_BUILDER_CACHE="/tmp/electron-builder-cache"
npm run build-mac
```

### 4. 修复应用权限（如果需要）
```bash
./fix-app-permissions.sh
```

## 📦 构建输出

构建完成后，你会在 `dist/` 目录下找到：

- **应用文件**：
  - `dist/mac/Mock System.app` (x64 版本)
  - `dist/mac-arm64/Mock System.app` (ARM64 版本)

- **DMG 安装包**：
  - `dist/Mock System-1.0.0.dmg` (x64 版本)
  - `dist/Mock System-1.0.0-arm64.dmg` (ARM64 版本)

## 🎯 使用说明

### 启动应用
1. 双击 `Mock System.app` 或安装 DMG 包
2. 如果提示"已损坏"，运行 `./fix-app-permissions.sh` 修复权限
3. 应用启动后会自动在 http://localhost:3400 启动服务器

### 主要功能
- **API Mock 服务** - 创建和管理 API 接口
- **代码生成** - 基于接口生成前端代码
- **AI 代理** - 智能代码助手
- **文件管理** - 项目文件浏览和管理
- **系统设置** - AI 提供者和模型配置

## 🔧 故障排除

### 应用无法启动
```bash
# 修复权限
./fix-app-permissions.sh

# 或手动修复
xattr -dr com.apple.quarantine "dist/mac/Mock System.app"
codesign --force --deep --sign - "dist/mac/Mock System.app"
```

### 服务器无法启动
- 检查端口 3400 是否被占用
- 查看应用控制台输出
- 确保数据库文件 `prisma/dev.db` 存在

### 数据库问题
```bash
# 重新生成数据库
npx prisma db push
npx prisma generate
```

## 📋 系统要求

- **操作系统**: macOS 10.12 或更高版本
- **架构**: x64 或 ARM64 (Apple Silicon)
- **内存**: 至少 4GB RAM
- **存储**: 至少 500MB 可用空间

## 🎊 完成！

Mock System 现在可以正常使用了！如有问题，请检查控制台输出或重新构建应用。
