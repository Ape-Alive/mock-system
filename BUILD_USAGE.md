# 构建脚本使用说明

## 🚀 快速开始

### 基本用法

```bash
# 默认构建 (Mac 生产版本)
npm run build-production

# 直接使用脚本
./build-production.sh
```

### 指定平台构建

```bash
# 构建 Mac 版本
npm run build-production -- -p mac

# 构建 Windows 版本
npm run build-production -- -p win

# 构建 Linux 版本
npm run build-production -- -p linux

# 构建所有平台
npm run build-production -- -p all
```

### 高级选项

```bash
# 跳过数据库初始化
npm run build-production -- --skip-db-init

# 跳过备份
npm run build-production -- --skip-backup

# 显示详细输出
npm run build-production -- -v

# 组合使用
npm run build-production -- -p win --skip-db-init --skip-backup -v
```

## 📋 参数说明

### 平台选择 (`-p, --platform`)

- `mac` - 构建 macOS 版本
- `win` - 构建 Windows 版本
- `linux` - 构建 Linux 版本
- `all` - 构建所有平台

### 构建类型 (`-t, --type`)

- `production` - 生产版本 (默认)
- `development` - 开发版本

### 跳过选项

- `--skip-db-init` - 跳过数据库初始化
- `--skip-backup` - 跳过 prisma 备份

### 输出控制

- `-v, --verbose` - 显示详细输出
- `-h, --help` - 显示帮助信息

## 🎯 使用场景

### 开发环境快速构建

```bash
npm run build-production -- --skip-db-init --skip-backup -v
```

### 生产环境完整构建

```bash
npm run build-production -- -p mac
```

### 跨平台发布构建

```bash
npm run build-production -- -p all
```

### 调试构建问题

```bash
npm run build-production -- -v --skip-db-init
```

## ⚠️ 注意事项

1. **参数传递**: 使用 `npm run` 时必须用 `--` 分隔参数
2. **平台兼容性**: 在 macOS 上构建 Windows 版本可能遇到原生依赖问题
3. **权限要求**: 确保脚本有执行权限
4. **依赖检查**: 构建前会自动检查必要的命令

## 🌍 跨平台构建说明

### 问题原因

在 macOS 上构建 Windows/Linux 版本时，会遇到原生依赖编译问题：

- 原生模块无法跨平台编译
- 缺少预编译的二进制文件
- 架构不匹配 (ARM64 vs x64)

### 解决方案

#### 1. GitHub Actions (推荐)

```yaml
# .github/workflows/build.yml
# 使用 GitHub Actions 在对应平台上构建
```

#### 2. Docker 构建

```bash
# 使用 Docker 进行跨平台构建
docker build -f Dockerfile.build -t mock-system-build .
```

#### 3. 本地构建限制

- ✅ macOS 上构建 macOS 版本
- ❌ macOS 上构建 Windows 版本 (原生依赖问题)
- ❌ macOS 上构建 Linux 版本 (原生依赖问题)

### 推荐工作流

1. **开发阶段**: 在对应平台上构建
2. **发布阶段**: 使用 GitHub Actions 构建所有平台
3. **测试阶段**: 在目标平台上测试

## 🔧 故障排除

### 参数未传递

```bash
# ❌ 错误用法
npm run build-production -p win

# ✅ 正确用法
npm run build-production -- -p win
```

### 权限问题

```bash
chmod +x build-production.sh
```

### 查看帮助

```bash
npm run build-production -- --help
```

## 📊 构建流程

1. **参数解析** - 解析命令行参数
2. **环境检查** - 检查必要的命令
3. **清理构建** - 清理旧的构建文件
4. **生成客户端** - 生成 Prisma 客户端
5. **备份数据** - 备份 prisma 目录 (可选)
6. **初始化数据库** - 初始化生产数据库 (可选)
7. **构建应用** - 构建 Electron 应用
8. **恢复数据** - 恢复 prisma 目录 (可选)
9. **验证结果** - 验证构建结果

## 🎉 成功示例

```bash
# 快速构建 Mac 版本
npm run build-production -- -p mac --skip-db-init

# 完整构建所有平台
npm run build-production -- -p all -v

# 调试构建
npm run build-production -- -v --skip-db-init --skip-backup
```
