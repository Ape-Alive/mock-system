# OTA升级总览组件

下面是一个基于Vue.js 2和Element UI的可复用OTA升级总览组件，包含数据展示、接口调用、错误处理等功能。

```vue
<template>
  <div class="ota-overview-container">
    <!-- 标题区域 -->
    <div class="header">
      <h2>OTA升级总览</h2>
      <el-button 
        type="primary" 
        size="small" 
        @click="downloadEncryptedFile"
        :loading="downloadLoading"
      >
        下载加密文件
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 数据展示区域 -->
    <div v-else class="data-display">
      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
        class="error-alert"
      />

      <!-- 数据卡片 -->
      <div class="data-cards">
        <el-card class="data-card total">
          <div class="card-content">
            <div class="card-title">总升级数</div>
            <div class="card-value">{{ formatNumber(data.totalNum) }}</div>
            <div class="card-icon">
              <i class="el-icon-s-data"></i>
            </div>
          </div>
        </el-card>

        <el-card class="data-card success">
          <div class="card-content">
            <div class="card-title">升级成功</div>
            <div class="card-value">{{ formatNumber(data.updateSuccess) }}</div>
            <div class="card-icon">
              <i class="el-icon-success"></i>
            </div>
          </div>
        </el-card>

        <el-card class="data-card updating">
          <div class="card-content">
            <div class="card-title">升级中</div>
            <div class="card-value">{{ formatNumber(data.updating) }}</div>
            <div class="card-icon">
              <i class="el-icon-loading"></i>
            </div>
          </div>
        </el-card>

        <el-card class="data-card error">
          <div class="card-content">
            <div class="card-title">升级失败</div>
            <div class="card-value">{{ formatNumber(data.updateError) }}</div>
            <div class="card-icon">
              <i class="el-icon-error"></i>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 进度条 -->
      <div class="progress-container">
        <div class="progress-info">
          <span>升级成功率</span>
          <span>{{ successRate }}%</span>
        </div>
        <el-progress 
          :percentage="successRate" 
          :color="progressColor" 
          :stroke-width="12"
          :show-text="false"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { getOtaOverview, downloadEncryptedFile } from '@/api/bigscreen';

export default {
  name: 'OtaOverview',
  props: {
    // 客户ID，由父组件传入
    customerId: {
      type: String,
      required: true,
      validator: (value) => {
        return value.trim().length > 0;
      }
    }
  },
  data() {
    return {
      loading: true,
      downloadLoading: false,
      error: null,
      data: {
        updateError: 0,
        updating: 0,
        totalNum: 0,
        updateSuccess: 0
      }
    };
  },
  computed: {
    // 计算升级成功率
    successRate() {
      if (this.data.totalNum === 0) return 0;
      return Math.round((this.data.updateSuccess / this.data.totalNum) * 100);
    },
    // 根据成功率返回进度条颜色
    progressColor() {
      if (this.successRate >= 80) {
        return '#67C23A'; // 成功率高，绿色
      } else if (this.successRate >= 50) {
        return '#E6A23C'; // 成功率中等，黄色
      } else {
        return '#F56C6C'; // 成功率低，红色
      }
    }
  },
  created() {
    this.fetchData();
  },
  methods: {
    // 获取OTA升级数据
    async fetchData() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await getOtaOverview({ customerId: this.customerId });
        
        if (response.code === 200 && response.data.success) {
          this.data = response.data.data;
        } else {
          this.error = response.message || '获取数据失败';
        }
      } catch (err) {
        console.error('获取OTA升级数据失败:', err);
        this.error = '网络错误，请稍后重试';
      } finally {
        this.loading = false;
      }
    },
    
    // 下载加密文件
    async downloadEncryptedFile() {
      this.downloadLoading = true;
      
      try {
        const params = {
          partitionUUID: '60088bba-9679-4d8e-b357-2a2808cbbe7a',
          relativeFilePath: '/test1.jpg',
          storageType: 2,
          userID: this.customerId
        };
        
        const response = await downloadEncryptedFile(params);
        
        if (response.code === 200) {
          this.$message.success('文件下载请求已发送');
        } else {
          this.$message.error(response.message || '文件下载失败');
        }
      } catch (err) {
        console.error('下载加密文件失败:', err);
        this.$message.error('文件下载失败，请稍后重试');
      } finally {
        this.downloadLoading = false;
      }
    },
    
    // 格式化数字显示
    formatNumber(num) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  },
  watch: {
    // 监听customerId变化，重新获取数据
    customerId: {
      immediate: false,
      handler() {
        this.fetchData();
      }
    }
  }
};
</script>

<style scoped>
.ota-overview-container {
  width: 100%;
  height: 100%;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
}

.loading-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.error-alert {
  margin-bottom: 20px;
}

.data-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.data-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.data-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
}

.card-content {
  position: relative;
  padding: 20px;
  height: 120px;
}

.card-title {
  font-size: 16px;
  color: #606266;
  margin-bottom: 10px;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.card-icon {
  position: absolute;
  right: 20px;
  top: 20px;
  font-size: 40px;
  opacity: 0.3;
}

/* 不同卡片的颜色样式 */
.total {
  border-top: 4px solid #409EFF;
}

.total .card-icon {
  color: #409EFF;
}

.success {
  border-top: 4px solid #67C23A;
}

.success .card-icon {
  color: #67C23A;
}

.updating {
  border-top: 4px solid #E6A23C;
}

.updating .card-icon {
  color: #E6A23C;
}

.error {
  border-top: 4px solid #F56C6C;
}

.error .card-icon {
  color: #F56C6C;
}

.progress-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: #606266;
}

@media (max-width: 1200px) {
  .data-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .data-cards {
    grid-template-columns: 1fr;
  }
}
</style>
```

## 配套的API文件

在`src/api/bigscreen.js`中创建以下API调用方法：

```javascript
import axios from 'axios';

// OTA升级总览接口
export function getOtaOverview(params) {
  return axios.get('/bigscreen/countOtaNum', {
    params: {
      customerId: params.customerId
    }
  }).then(response => response.data);
}

// 下载加密文件接口
export function downloadEncryptedFile(params) {
  return axios.get('/encrypted/dynamic/storageFile', {
    params: {
      partitionUUID: params.partitionUUID,
      relativeFilePath: params.relativeFilePath,
      storageType: params.storageType,
      userID: params.userID
    }
  }).then(response => response.data);
}
```

## 使用示例

在父组件中使用该组件：

```vue
<template>
  <div>
    <ota-overview :customer-id="currentCustomerId" />
  </div>
</template>

<script>
import OtaOverview from '@/components/OtaOverview';

export default {
  components: {
    OtaOverview
  },
  data() {
    return {
      currentCustomerId: '123456' // 实际项目中可以从Vuex或路由参数中获取
    };
  }
};
</script>
```

## 功能说明

1. **数据展示**：
   - 展示OTA升级的总数、成功数、失败数和进行中的数量
   - 计算并显示升级成功率
   - 使用不同颜色的卡片区分不同类型的数据

2. **接口集成**：
   - 集成了OTA升级总览接口
   - 集成了下载加密文件接口

3. **错误处理**：
   - 网络错误处理
   - API返回错误处理
   - 使用Element UI的Alert组件显示错误信息

4. **加载状态**：
   - 数据加载时显示骨架屏
   - 按钮操作时显示加载状态

5. **数据验证**：
   - 验证customerId是否为空
   - 验证API返回数据的结构

6. **响应式设计**：
   - 适配不同屏幕尺寸
   - 卡片在移动端会堆叠显示

7. **交互效果**：
   - 卡片悬停效果
   - 进度条颜色根据成功率变化

这个组件可以直接集成到项目中，只需要提供customerId属性即可使用。