# Terminal iframe API 文档

## 概述

终端网页支持在 iframe 中运行，并通过 postMessage 与父窗口进行通信。

## 基本用法

### 1. 嵌入 iframe

```html
<iframe
  src="http://localhost:8080/index.html"
  width="100%"
  height="600px"
  frameborder="0"
>
</iframe>
```

### 2. 监听终端事件

```javascript
window.addEventListener("message", (event) => {
  // 确保消息来自终端 iframe
  if (event.data.source !== "terminal-iframe") return;

  const { type, data } = event.data;

  switch (type) {
    case "ready":
      console.log("终端已就绪:", data);
      break;
    case "tab-created":
      console.log("标签页已创建:", data);
      break;
    case "tab-closed":
      console.log("标签页已关闭:", data);
      break;
    case "tab-activated":
      console.log("标签页已激活:", data);
      break;
    case "status":
      console.log("终端状态:", data);
      break;
  }
});
```

## API 接口

### 发送命令到终端

#### 创建新标签页

```javascript
iframe.contentWindow.postMessage(
  {
    type: "create-tab",
  },
  "*"
);
```

#### 关闭指定标签页

```javascript
iframe.contentWindow.postMessage(
  {
    type: "close-tab",
    data: { tabId: "term_1234567890_1" },
  },
  "*"
);
```

#### 关闭所有标签页

```javascript
iframe.contentWindow.postMessage(
  {
    type: "close-all-tabs",
  },
  "*"
);
```

#### 发送命令到当前活动终端

```javascript
iframe.contentWindow.postMessage(
  {
    type: "send-command",
    data: { command: "ls -la" },
  },
  "*"
);
```

#### 获取终端状态

```javascript
iframe.contentWindow.postMessage(
  {
    type: "get-status",
  },
  "*"
);
```

#### 调整终端尺寸

```javascript
iframe.contentWindow.postMessage(
  {
    type: "resize",
    data: { width: 800, height: 600 },
  },
  "*"
);
```

## 事件类型

### 终端发送的事件

| 事件类型        | 描述           | 数据格式                          |
| --------------- | -------------- | --------------------------------- |
| `ready`         | 终端初始化完成 | `{ version, features }`           |
| `tab-created`   | 标签页创建完成 | `{ tabId, title }`                |
| `tab-closed`    | 标签页关闭完成 | `{ tabId }`                       |
| `tab-activated` | 标签页激活完成 | `{ tabId, title }`                |
| `status`        | 终端状态信息   | `{ activeTabId, tabCount, tabs }` |

### 父窗口发送的命令

| 命令类型         | 描述           | 参数                |
| ---------------- | -------------- | ------------------- |
| `create-tab`     | 创建新标签页   | 无                  |
| `close-tab`      | 关闭指定标签页 | `{ tabId }`         |
| `close-all-tabs` | 关闭所有标签页 | 无                  |
| `send-command`   | 发送命令到终端 | `{ command }`       |
| `get-status`     | 获取终端状态   | 无                  |
| `resize`         | 调整终端尺寸   | `{ width, height }` |

## 完整示例

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Terminal Demo</title>
  </head>
  <body>
    <div>
      <button onclick="createTab()">创建标签页</button>
      <button onclick="sendCommand()">发送命令</button>
      <button onclick="getStatus()">获取状态</button>
    </div>

    <iframe
      id="terminal-iframe"
      src="http://localhost:8080/index.html"
      width="100%"
      height="600px"
      frameborder="0"
    >
    </iframe>

    <script>
      const iframe = document.getElementById("terminal-iframe");

      // 监听终端事件
      window.addEventListener("message", (event) => {
        if (event.data.source !== "terminal-iframe") return;

        const { type, data } = event.data;
        console.log(`终端事件: ${type}`, data);
      });

      // 创建标签页
      function createTab() {
        iframe.contentWindow.postMessage(
          {
            type: "create-tab",
          },
          "*"
        );
      }

      // 发送命令
      function sendCommand() {
        iframe.contentWindow.postMessage(
          {
            type: "send-command",
            data: { command: 'echo "Hello from parent!"' },
          },
          "*"
        );
      }

      // 获取状态
      function getStatus() {
        iframe.contentWindow.postMessage(
          {
            type: "get-status",
          },
          "*"
        );
      }
    </script>
  </body>
</html>
```

## 注意事项

1. **跨域限制**: 如果父页面和终端页面不在同一域名下，需要设置适当的 CORS 策略
2. **安全性**: 建议在生产环境中指定具体的 origin 而不是使用 `'*'`
3. **错误处理**: 建议添加错误处理机制，处理 iframe 加载失败等情况
4. **响应式**: 终端会自动适应 iframe 的尺寸变化

## 版本信息

- 当前版本: 1.0.0
- 支持的功能: create-tab, close-tab, send-command, resize
- 兼容性: 现代浏览器 (Chrome, Firefox, Safari, Edge)
