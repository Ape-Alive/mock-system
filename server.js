require('dotenv').config()
const { startServer } = require('./app')

// 启动服务器
startServer()

console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY)
