# Mock System 打包脚本使用指南

## 📦 打包脚本说明

### 脚本文件
- `build.sh` - 主打包脚本
- `test-build.sh` - 打包脚本测试工具
- `fix-app-permissions.sh` - 应用权限修复工具

## 🚀 使用方法

### 1. 快速打包
```bash
./build.sh
```

### 2. 测试环境
```bash
./test-build.sh
```

### 3. 修复权限（如果需要）
```bash
./fix-app-permissions.sh
```

## 📋 打包流程

脚本会自动执行以下步骤：

1. **环境检查** - 验证 Node.js 和 npm 是否安装
2. **清理环境** - 停止现有进程，清理构建目录
3. **安装依赖** - 运行 `npm install`
4. **生成 Prisma 客户端** - 运行 `npx prisma generate`
5. **检查数据库** - 验证数据库文件存在
6. **构建应用** - 运行 `npm run build-mac`
7. **修复权限** - 移除隔离属性并重新签名
8. **显示结果** - 展示构建输出文件

## 📱 构建输出

打包完成后会生成：

### 应用文件
- `dist/mac/Mock System.app` (x64 版本)
- `dist/mac-arm64/Mock System.app` (ARM64 版本)

### DMG 安装包
- `dist/Mock System-1.0.0.dmg` (x64 版本)
- `dist/Mock System-1.0.0-arm64.dmg` (ARM64 版本)

## 🔧 环境要求

- **操作系统**: macOS 10.12+
- **Node.js**: 16+ 版本
- **npm**: 最新版本
- **架构**: x64 或 ARM64

## ⚠️ 注意事项

1. **权限问题**: 如果应用提示"已损坏"，运行 `./fix-app-permissions.sh`
2. **端口占用**: 确保端口 3400 未被占用
3. **磁盘空间**: 确保有足够的磁盘空间（至少 2GB）
4. **网络连接**: 构建过程需要下载依赖包

## 🐛 故障排除

### 构建失败
```bash
# 清理并重新构建
rm -rf dist/ node_modules/
npm install
./build.sh
```

### 权限问题
```bash
# 修复应用权限
./fix-app-permissions.sh
```

### 数据库问题
```bash
# 重新生成数据库
npx prisma db push
npx prisma generate
```

## �� 支持

如有问题，请检查：
1. 控制台输出日志
2. 确保所有依赖已安装
3. 检查磁盘空间是否充足
4. 验证网络连接是否正常

---

**Mock System 打包脚本** - 一键构建，轻松分发！ 🚀
