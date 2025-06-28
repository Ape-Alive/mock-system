# Mock System - 模块化架构

这是一个基于 Node.js 的 Mock 系统，采用模块化架构设计，提供 API 接口的 Mock 服务。

## 项目结构

```
mock-system/
├── config/                 # 配置模块
│   └── index.js           # 统一配置管理
├── utils/                  # 工具模块
│   ├── fileUtils.js       # 文件操作工具
│   ├── mockUtils.js       # Mock数据生成工具
│   └── openApiUtils.js    # OpenAPI解析工具
├── services/              # 业务服务模块
│   ├── mockService.js     # Mock业务逻辑服务
│   ├── groupService.js    # 分组管理服务
│   └── openApiService.js  # OpenAPI导入服务
├── routes/                # 路由模块
│   ├── mockRoutes.js      # Mock相关路由
│   ├── openApiRoutes.js   # OpenAPI导入路由
│   └── groupRoutes.js     # 分组管理路由
├── middleware/            # 中间件模块
│   └── routeMiddleware.js # 动态路由中间件
├── app.js                 # 主应用文件
├── server.js              # 服务器启动文件
└── package.json           # 项目依赖
```

## 模块说明

### 1. 配置模块 (config/)

- **index.js**: 集中管理所有配置项，包括端口、目录路径等

### 2. 工具模块 (utils/)

- **fileUtils.js**: 文件操作相关工具函数
- **mockUtils.js**: Mock 数据生成和转换工具
- **openApiUtils.js**: OpenAPI/Swagger 文档解析工具

### 3. 服务模块 (services/)

- **mockService.js**: Mock 数据的 CRUD 操作和路由管理
- **groupService.js**: 分组树的管理和操作
- **openApiService.js**: OpenAPI 文档导入和解析

### 4. 路由模块 (routes/)

- **mockRoutes.js**: Mock 相关的 API 路由
- **openApiRoutes.js**: OpenAPI 导入相关的路由
- **groupRoutes.js**: 分组管理相关的路由

### 5. 中间件模块 (middleware/)

- **routeMiddleware.js**: 动态路由注册和移除的中间件

## 主要功能

1. **Mock 接口管理**: 创建、更新、删除、查询 Mock 接口
2. **OpenAPI 导入**: 支持导入 Swagger/OpenAPI 文档
3. **分组管理**: 支持接口分组和树形结构管理
4. **动态路由**: 支持动态注册和移除 Mock 路由
5. **Mock 数据生成**: 支持 Mock.js 模板生成随机数据

## 启动方式

```bash
# 安装依赖
npm install

# 启动服务器
npm run dev
# 或者
node server.js
```

## API 接口

### Mock 管理

- `POST /create-mock` - 创建 Mock 接口
- `PUT /update-mock/:filename` - 更新 Mock 接口
- `DELETE /delete-mock/:filename` - 删除 Mock 接口
- `GET /mock-list` - 获取 Mock 列表
- `GET /mock-item/:filename` - 获取单个 Mock 详情

### OpenAPI 导入

- `POST /import-openapi` - 导入 OpenAPI/Swagger 文档

### 分组管理

- `GET /api/group-info` - 获取分组树
- `GET /api/group-info/:id` - 获取单个分组
- `POST /api/group-info` - 创建分组
- `DELETE /api/group-info/:id` - 删除分组
- `POST /api/group-info/:id/files` - 更新分组下的接口

## 模块化优势

1. **职责分离**: 每个模块都有明确的职责
2. **可维护性**: 代码结构清晰，易于维护和扩展
3. **可测试性**: 模块独立，便于单元测试
4. **可复用性**: 工具函数和服务可以在不同地方复用
5. **可扩展性**: 新增功能只需添加相应模块

## 依赖说明

- `express`: Web 框架
- `mockjs`: Mock 数据生成
- `multer`: 文件上传处理
- `js-yaml`: YAML 文件解析
- `swagger-parser`: OpenAPI 文档解析
- `body-parser`: 请求体解析
