# Mock System 安全警告解决教程

## 🚨 问题说明

当您首次运行 Mock System 时，macOS 会显示安全警告，提示"Apple 无法验证"Mock System"是否包含可能危害 Mac 安全或泄漏隐私的恶意软件"。这是正常现象，因为应用没有经过 Apple 官方认证。

## �� 为什么会出现这个警告？

1. **代码签名缺失** - Mock System 没有使用 Apple 开发者证书签名
2. **公证缺失** - 没有经过 Apple 公证 (Notarization) 流程
3. **Gatekeeper 机制** - macOS 的安全机制保护用户免受未验证应用侵害

## 🛠️ 解决方案

### 方法一：系统设置允许（推荐）

#### 步骤 1：右键打开应用
1. 在 `Applications` 文件夹中找到 `Mock System.app`
2. **右键点击** `Mock System.app`
3. 选择"打开"
4. 会弹出安全警告对话框

#### 步骤 2：处理安全警告
1. 在弹出的对话框中，**不要点击"移到废纸篓"**
2. 点击"完成"关闭对话框

#### 步骤 3：在系统设置中允许
1. 打开"系统偏好设置"（或"系统设置"）
2. 进入"通用"设置
3. 向下滚动查找"隐私与安全性"或"安全性与隐私"
4. 在底部找到关于 Mock System 的提示
5. 点击"仍要打开"按钮

### 方法二：终端命令修复（最简单）

如果系统设置方法不行，可以使用终端命令：

#### 步骤 1：打开终端
1. 按 `Command + 空格键` 打开 Spotlight
2. 输入"终端"并回车

#### 步骤 2：运行修复命令
```bash
# 移除隔离属性
xattr -dr com.apple.quarantine "/Applications/Mock System.app"

# 重新签名应用
codesign --force --deep --sign - "/Applications/Mock System.app"
```

#### 步骤 3：验证修复
运行命令后，就可以正常双击打开 Mock System 了！

## 📋 详细步骤截图说明

### 1. 右键打开应用
- 在 Applications 文件夹中找到 Mock System
- 右键点击应用图标
- 选择"打开"选项

### 2. 安全警告对话框
- 标题：未打开"Mock System"
- 内容：Apple 无法验证应用安全性
- 按钮：完成 | 移到废纸篓
- **重要：点击"完成"，不要点击"移到废纸篓"**

### 3. 系统设置允许
- 打开系统偏好设置
- 进入"通用"或"隐私与安全性"
- 找到 Mock System 相关提示
- 点击"仍要打开"

## ⚠️ 常见问题

### Q: 为什么会出现这个警告？
A: 这是 macOS 的安全机制，保护用户免受未验证应用侵害。

### Q: 应用安全吗？
A: 是的，Mock System 是开源项目，代码完全透明，不包含恶意软件。

### Q: 修复后还会出现警告吗？
A: 不会，修复后可以正常双击打开应用。

### Q: 可以信任这个应用吗？
A: 可以，Mock System 是合法的开发工具，用于 API Mock 和代码生成。

## 🔧 技术说明

Mock System 使用以下技术构建：
- **Electron** - 跨平台桌面应用框架
- **Node.js** - JavaScript 运行时
- **Express.js** - Web 服务器框架
- **SQLite** - 轻量级数据库
- **Prisma** - 数据库 ORM

所有组件都是开源和安全的。

## 📞 技术支持

如果按照教程操作后仍有问题，请提供：
1. macOS 版本信息
2. 具体的错误信息
3. 操作步骤截图

联系方式：
- 邮箱：your-email@example.com
- GitHub：https://github.com/your-repo

## 🎯 总结

Mock System 的安全警告是正常现象，通过上述方法可以轻松解决。修复后，应用将正常工作，提供完整的 API Mock 和代码生成功能。

---

**Mock System** - 安全、可靠的开发工具 🚀
