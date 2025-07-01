# OTA升级总览大屏展示页面

下面是一个完整的Vue.js 2大屏展示页面，包含OTA升级总览数据展示和下载加密文件功能：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTA升级总览大屏</title>
    <script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.3.2/dist/echarts.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: "Microsoft YaHei", sans-serif;
            background-color: #0f1c3c;
            color: #fff;
            overflow: hidden;
        }
        .container {
            width: 100vw;
            height: 100vh;
            padding: 20px;
            display: flex;
            flex-direction: column;
        }
        .header {
            height: 80px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 36px;
            background: linear-gradient(to right, #30cfd0, #c43ad6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 10px rgba(48, 207, 208, 0.3);
        }
        .content {
            flex: 1;
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
        }
        .card {
            background: rgba(16, 31, 63, 0.8);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(65, 120, 255, 0.2);
            flex: 1;
            min-width: 300px;
            display: flex;
            flex-direction: column;
        }
        .card-header {
            font-size: 20px;
            margin-bottom: 15px;
            color: #6bd4ff;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .card-body {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .stats-container {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-item {
            flex: 1;
            min-width: 120px;
            background: rgba(27, 52, 107, 0.5);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: all 0.3s;
        }
        .stat-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            margin: 10px 0;
            color: #fff;
        }
        .stat-label {
            font-size: 14px;
            color: #8ba0c7;
        }
        .chart-container {
            flex: 1;
            min-height: 300px;
        }
        .download-section {
            margin-top: 20px;
        }
        .download-form {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
        }
        .form-group {
            flex: 1;
            min-width: 200px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #8ba0c7;
        }
        input, select {
            width: 100%;
            padding: 8px 12px;
            background: rgba(27, 52, 107, 0.5);
            border: 1px solid #2a4b8c;
            border-radius: 4px;
            color: #fff;
        }
        button {
            background: linear-gradient(to right, #30cfd0, #c43ad6);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }
        button:disabled {
            background: #666;
            cursor: not-allowed;
        }
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: #30cfd0;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .error-message {
            color: #ff6b6b;
            margin-top: 10px;
        }
        .success-message {
            color: #6bff6b;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="container">
            <div class="header">
                <h1>OTA升级总览大屏</h1>
            </div>
            <div class="content">
                <div class="card">
                    <div class="card-header">
                        <span>OTA升级统计</span>
                        <button @click="refreshData" :disabled="loading">
                            {{ loading ? '加载中...' : '刷新数据' }}
                        </button>
                    </div>
                    <div class="card-body">
                        <div v-if="loading" class="loading">
                            <div class="spinner"></div>
                        </div>
                        <template v-else>
                            <div class="stats-container">
                                <div class="stat-item">
                                    <div class="stat-label">总设备数</div>
                                    <div class="stat-value">{{ otaData.totalNum || 0 }}</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">升级成功</div>
                                    <div class="stat-value">{{ otaData.updateSuccess || 0 }}</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">升级中</div>
                                    <div class="stat-value">{{ otaData.updating || 0 }}</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">升级失败</div>
                                    <div class="stat-value">{{ otaData.updateError || 0 }}</div>
                                </div>
                            </div>
                            <div class="chart-container" ref="chart"></div>
                        </template>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span>文件下载</span>
                    </div>
                    <div class="card-body">
                        <div class="download-section">
                            <div class="download-form">
                                <div class="form-group">
                                    <label for="userID">用户名</label>
                                    <input id="userID" v-model="downloadForm.userID" placeholder="请输入用户名">
                                </div>
                                <div class="form-group">
                                    <label for="partitionUUID">盘序号</label>
                                    <input id="partitionUUID" v-model="downloadForm.partitionUUID" placeholder="请输入盘序号">
                                </div>
                                <div class="form-group">
                                    <label for="relativeFilePath">文件路径</label>
                                    <input id="relativeFilePath" v-model="downloadForm.relativeFilePath" placeholder="请输入文件相对路径">
                                </div>
                                <div class="form-group">
                                    <label for="storageType">空间类型</label>
                                    <select id="storageType" v-model="downloadForm.storageType">
                                        <option value="0">公共空间</option>
                                        <option value="1">用户空间</option>
                                        <option value="2">加密空间</option>
                                        <option value="3">外部空间</option>
                                    </select>
                                </div>
                            </div>
                            <button @click="downloadFile" :disabled="downloading">
                                {{ downloading ? '下载中...' : '下载文件' }}
                            </button>
                            <div v-if="downloadError" class="error-message">{{ downloadError }}</div>
                            <div v-if="downloadSuccess" class="success-message">文件下载成功！</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        new Vue({
            el: '#app',
            data() {
                return {
                    loading: false,
                    otaData: {
                        totalNum: 0,
                        updateSuccess: 0,
                        updating: 0,
                        updateError: 0
                    },
                    chart: null,
                    // 兜底静态数据
                    fallbackData: {
                        totalNum: 12543,
                        updateSuccess: 9876,
                        updating: 1234,
                        updateError: 1433
                    },
                    downloadForm: {
                        partitionLabel: '',
                        partitionUUID: '',
                        relativeFilePath: '',
                        storageType: '1',
                        userID: ''
                    },
                    downloading: false,
                    downloadError: '',
                    downloadSuccess: false
                };
            },
            mounted() {
                this.initChart();
                this.fetchOtaData();
            },
            methods: {
                async fetchOtaData() {
                    this.loading = true;
                    try {
                        // 模拟API请求
                        // 实际项目中替换为真实的API调用
                        const response = await this.mockApiCall('/bigscreen/countOtaNum', {
                            customerId: '12345' // 示例客户ID
                        });
                        
                        if (response.code === 200 && response.data && response.data.success) {
                            this.otaData = response.data.data;
                        } else {
                            // 如果API返回数据为空或失败，使用兜底数据
                            console.warn('API返回数据为空，使用兜底数据');
                            this.otaData = this.fallbackData;
                        }
                        this.updateChart();
                    } catch (error) {
                        console.error('获取OTA数据失败:', error);
                        // 请求失败时使用兜底数据
                        this.otaData = this.fallbackData;
                        this.updateChart();
                    } finally {
                        this.loading = false;
                    }
                },
                async downloadFile() {
                    // 简单的表单验证
                    if (!this.downloadForm.userID) {
                        this.downloadError = '请输入用户名';
                        return;
                    }
                    if (!this.downloadForm.partitionUUID) {
                        this.downloadError = '请输入盘序号';
                        return;
                    }
                    if (!this.downloadForm.relativeFilePath) {
                        this.downloadError = '请输入文件路径';
                        return;
                    }
                    
                    this.downloading = true;
                    this.downloadError = '';
                    this.downloadSuccess = false;
                    
                    try {
                        // 模拟API请求
                        // 实际项目中替换为真实的API调用
                        const response = await this.mockApiCall('/encrypted/dynamic/storageFile', this.downloadForm);
                        
                        if (response.code === 200) {
                            this.downloadSuccess = true;
                            // 在实际项目中，这里可能需要处理文件下载逻辑
                            console.log('文件下载成功', response.data);
                        } else {
                            this.downloadError = '文件下载失败: ' + (response.message || '未知错误');
                        }
                    } catch (error) {
                        console.error('文件下载失败:', error);
                        this.downloadError = '文件下载失败: ' + (error.message || '网络错误');
                    } finally {
                        this.downloading = false;
                    }
                },
                refreshData() {
                    this.fetchOtaData();
                },
                initChart() {
                    this.chart = echarts.init(this.$refs.chart);
                    window.addEventListener('resize', this.resizeChart);
                },
                updateChart() {
                    const option = {
                        tooltip: {
                            trigger: 'item'
                        },
                        legend: {
                            top: '5%',
                            left: 'center',
                            textStyle: {
                                color: '#8ba0c7'
                            }
                        },
                        series: [
                            {
                                name: 'OTA升级状态',
                                type: 'pie',
                                radius: ['40%', '70%'],
                                avoidLabelOverlap: false,
                                itemStyle: {
                                    borderRadius: 10,
                                    borderColor: '#0f1c3c',
                                    borderWidth: 2
                                },
                                label: {
                                    show: false,
                                    position: 'center'
                                },
                                emphasis: {
                                    label: {
                                        show: true,
                                        fontSize: '18',
                                        fontWeight: 'bold',
                                        color: '#fff'
                                    }
                                },
                                labelLine: {
                                    show: false
                                },
                                data: [
                                    { value: this.otaData.updateSuccess, name: '升级成功', itemStyle: { color: '#30cfd0' } },
                                    { value: this.otaData.updating, name: '升级中', itemStyle: { color: '#c43ad6' } },
                                    { value: this.otaData.updateError, name: '升级失败', itemStyle: { color: '#ff6b6b' } }
                                ]
                            }
                        ]
                    };
                    this.chart.setOption(option);
                },
                resizeChart() {
                    if (this.chart) {
                        this.chart.resize();
                    }
                },
                // 模拟API调用函数 - 实际项目中替换为axios调用
                mockApiCall(url, params) {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            if (url === '/bigscreen/countOtaNum') {
                                // 模拟80%的成功率
                                if (Math.random() > 0.2) {
                                    resolve({
                                        code: 200,
                                        message: "success",
                                        data: {
                                            success: true,
                                            data: {
                                                updateError: Math.floor(Math.random() * 10000) + 1,
                                                updating: Math.floor(Math.random() * 10000) + 1,
                                                totalNum: Math.floor(Math.random() * 100000) + 1,
                                                updateSuccess: Math.floor(Math.random() * 100000) + 1
                                            }
                                        }
                                    });
                                } else {
                                    // 模拟失败情况
                                    resolve({
                                        code: 500,
                                        message: "Internal Server Error",
                                        data: null
                                    });
                                }
                            } else if (url === '/encrypted/dynamic/storageFile') {
                                // 模拟下载接口
                                if (Math.random() > 0.3) {
                                    resolve({
                                        code: 200,
                                        message: "success",
                                        data: {}
                                    });
                                } else {
                                    resolve({
                                        code: 400,
                                        message: "File not found",
                                        data: null
                                    });
                                }
                            } else {
                                reject(new Error('Unknown API endpoint'));
                            }
                        }, 800); // 模拟网络延迟
                    });
                }
            },
            beforeDestroy() {
                window.removeEventListener('resize', this.resizeChart);
                if (this.chart) {
                    this.chart.dispose();
                }
            }
        });
    </script>
</body>
</html>
```

## 功能说明

1. **页面结构**：
   - 大屏展示布局，包含OTA升级统计和文件下载两个主要区域
   - 响应式设计，适应不同屏幕尺寸

2. **数据展示**：
   - 使用卡片式布局展示OTA升级统计数据
   - 使用ECharts饼图可视化展示升级状态分布
   - 包含刷新数据功能

3. **接口集成**：
   - 实现了`/bigscreen/countOtaNum`接口的模拟调用
   - 实现了`/encrypted/dynamic/storageFile`接口的模拟调用

4. **错误处理**：
   - API请求失败时使用兜底静态数据
   - 显示错误消息给用户
   - 表单验证确保必要参数已填写

5. **加载状态**：
   - 数据加载时显示旋转加载指示器
   - 按钮禁用状态防止重复提交

6. **数据验证**：
   - 检查API返回数据有效性
   - 下载文件前验证表单输入

## 实际项目中使用说明

在实际项目中，您需要：
1. 将`mockApiCall`方法替换为真实的axios调用
2. 根据实际API响应结构调整数据处理逻辑
3. 可能需要添加用户认证token等安全措施
4. 根据实际需求调整文件下载处理逻辑