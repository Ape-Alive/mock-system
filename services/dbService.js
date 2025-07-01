const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = {
    prisma,

    // 本地目录相关
    async getLocalDirectory() {
        return await prisma.localDirectory.findUnique({ where: { id: 1 } })
    },

    async setLocalDirectory(directory, projectName) {
        return await prisma.localDirectory.upsert({
            where: { id: 1 },
            update: { directory, projectName },
            create: { id: 1, directory, projectName }
        })
    },

    // 这里可以继续扩展其他表的操作
}