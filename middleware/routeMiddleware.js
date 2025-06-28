const mockService = require('../services/mockService')

// 动态路由中间件
function setupDynamicRoutes(app) {
    // 在所有路由之后添加一个通用的错误处理中间件
    app.use((req, res, next) => {
        const routeKey = `${req.method}:${req.path}`
        const handler = mockService.getRouteHandler(routeKey)

        if (handler) {
            handler(req, res)
        } else {
            // 如果没有找到匹配的mock路由，继续到下一个中间件
            next()
        }
    })
}

// 移除路由中间件（保留但不使用）
function removeRoute(app, routePath, method) {
    // 这个方法现在不需要了，因为我们使用的是Map来管理路由
    console.log(`路由移除已通过Map管理: ${method} ${routePath}`)
}

module.exports = {
    setupDynamicRoutes,
    removeRoute,
}