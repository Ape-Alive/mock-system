const axios = require('axios')

const BASE_URL = 'http://localhost:3200'

async function testFileOperations() {
    try {
        console.log('开始测试文件操作功能...')

        // 1. 设置本地目录
        console.log('\n1. 设置本地目录...')
        const testDir = '/tmp/mock-system-test'
        const setDirResponse = await axios.post(`${BASE_URL}/api/file/set-directory`, {
            directoryPath: testDir,
            projectName: 'test-project'
        })
        console.log('设置目录结果:', setDirResponse.data)

        // 2. 获取目录信息
        console.log('\n2. 获取目录信息...')
        const dirResponse = await axios.get(`${BASE_URL}/api/file/directory`)
        console.log('目录信息:', dirResponse.data)

        // 3. 创建文件
        console.log('\n3. 创建测试文件...')
        const createFileResponse = await axios.post(`${BASE_URL}/api/file/create`, {
            filePath: 'test.txt',
            content: 'Hello, World!'
        })
        console.log('创建文件结果:', createFileResponse.data)

        // 4. 读取文件
        console.log('\n4. 读取文件内容...')
        const readResponse = await axios.get(`${BASE_URL}/api/file/read?path=test.txt`)
        console.log('读取文件结果:', readResponse.data)

        // 5. 写入文件
        console.log('\n5. 写入文件内容...')
        const writeResponse = await axios.post(`${BASE_URL}/api/file/write`, {
            filePath: 'test.txt',
            content: 'Hello, Updated World!'
        })
        console.log('写入文件结果:', writeResponse.data)

        // 6. 获取目录树
        console.log('\n6. 获取目录树...')
        const treeResponse = await axios.get(`${BASE_URL}/api/file/tree`)
        console.log('目录树:', JSON.stringify(treeResponse.data, null, 2))

        // 7. 创建目录
        console.log('\n7. 创建测试目录...')
        const createDirResponse = await axios.post(`${BASE_URL}/api/file/mkdir`, {
            dirPath: 'test-folder'
        })
        console.log('创建目录结果:', createDirResponse.data)

        // 8. 在目录中创建文件
        console.log('\n8. 在目录中创建文件...')
        const createFileInDirResponse = await axios.post(`${BASE_URL}/api/file/create`, {
            filePath: 'test-folder/nested.txt',
            content: 'Nested file content'
        })
        console.log('在目录中创建文件结果:', createFileInDirResponse.data)

        // 9. 再次获取目录树
        console.log('\n9. 再次获取目录树...')
        const treeResponse2 = await axios.get(`${BASE_URL}/api/file/tree`)
        console.log('更新后的目录树:', JSON.stringify(treeResponse2.data, null, 2))

        console.log('\n✅ 所有测试完成！')

    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message)
    }
}

// 运行测试
testFileOperations()