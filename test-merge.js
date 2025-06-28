const http = require('http')

// 简单的HTTP请求函数
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = ''
            res.on('data', (chunk) => {
                body += chunk
            })
            res.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body)
                    resolve({ status: res.statusCode, data: jsonBody })
                } catch (e) {
                    resolve({ status: res.statusCode, data: body })
                }
            })
        })

        req.on('error', (err) => {
            reject(err)
        })

        if (data) {
            req.write(JSON.stringify(data))
        }
        req.end()
    })
}

// 测试批量分组合并功能
async function testBatchGroupMerge() {
    const baseUrl = 'localhost'
    const port = 3200

    try {
        console.log('开始测试批量分组合并功能...')

        // 1. 创建一个测试分组
        console.log('1. 创建测试分组...')
        const createGroupResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/api/group-info',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { name: '测试分组', parentId: 0 })

        if (createGroupResponse.status !== 200) {
            throw new Error('创建分组失败')
        }

        const newGroup = createGroupResponse.data
        console.log('创建分组成功:', newGroup.name, 'ID:', newGroup.id)

        // 2. 获取一些mock文件用于测试
        console.log('2. 获取mock文件列表...')
        const mockListResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/mock-list',
            method: 'GET'
        })

        const mockItems = mockListResponse.data
        if (mockItems.length < 4) {
            throw new Error('mock文件数量不足，无法测试')
        }

        const testFiles = mockItems.slice(0, 4).map(item => item.fileName)
        console.log('选择测试文件:', testFiles)

        // 3. 第一次批量分组（添加文件1,2,3）
        console.log('3. 第一次批量分组（添加文件1,2,3）...')
        const firstBatchResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/batch-group',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fileNames: testFiles.slice(0, 3),
            group: newGroup.name
        })

        if (firstBatchResponse.status !== 200) {
            throw new Error('第一次批量分组失败')
        }

        // 4. 更新分组树的files字段（合并模式）
        console.log('4. 更新分组树的files字段（合并模式）...')
        const updateFilesResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: `/api/group-info/${newGroup.id}/files`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            files: testFiles.slice(0, 3),
            mergeMode: true
        })

        if (updateFilesResponse.status !== 200) {
            throw new Error('更新分组files失败')
        }

        const updateResult = updateFilesResponse.data
        console.log('第一次分组结果:', updateResult.files)

        // 5. 第二次批量分组（添加文件2,3,4，其中2,3重复）
        console.log('5. 第二次批量分组（添加文件2,3,4，其中2,3重复）...')
        const secondBatchResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: '/batch-group',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fileNames: testFiles.slice(1, 4), // 文件2,3,4
            group: newGroup.name
        })

        if (secondBatchResponse.status !== 200) {
            throw new Error('第二次批量分组失败')
        }

        // 6. 再次更新分组树的files字段（合并模式）
        console.log('6. 再次更新分组树的files字段（合并模式）...')
        const secondUpdateResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: `/api/group-info/${newGroup.id}/files`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            files: testFiles.slice(1, 4), // 文件2,3,4
            mergeMode: true
        })

        if (secondUpdateResponse.status !== 200) {
            throw new Error('第二次更新分组files失败')
        }

        const secondUpdateResult = secondUpdateResponse.data
        console.log('第二次分组结果:', secondUpdateResult.files)

        // 7. 验证结果
        console.log('7. 验证合并结果...')
        const expectedFiles = [...new Set([...testFiles.slice(0, 3), ...testFiles.slice(1, 4)])]
        const actualFiles = secondUpdateResult.files

        console.log('期望的文件列表:', expectedFiles)
        console.log('实际的文件列表:', actualFiles)

        if (actualFiles.length === expectedFiles.length &&
            expectedFiles.every(file => actualFiles.includes(file))) {
            console.log('✅ 测试通过！合并功能正常工作')
            console.log(`原有3个文件，新增3个文件（其中2个重复），最终合并后${actualFiles.length}个文件`)
        } else {
            console.log('❌ 测试失败！合并结果不符合预期')
        }

        // 8. 清理测试数据
        console.log('8. 清理测试数据...')
        const deleteGroupResponse = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: `/api/group-info/${newGroup.id}`,
            method: 'DELETE'
        })

        if (deleteGroupResponse.status === 200) {
            console.log('测试分组已删除')
        }

    } catch (error) {
        console.error('测试失败:', error.message)
    }
}

// 运行测试
testBatchGroupMerge()