<template>
  <div class="ota-overview-container">
    <el-card shadow="hover" class="overview-card">
      <div slot="header" class="card-header">
        <span class="card-title">OTA升级总览</span>
        <el-button
          type="text"
          icon="el-icon-refresh"
          @click="fetchData"
          :loading="loading"
        ></el-button>
      </div>      <div v-loading="loading" class="data-content">
        <div v-if="error" class="error-message">
          <el-alert
            title="数据加载失败"
            :description="error"
            type="error"
            show-icon
            :closable="false"
          ></el-alert>
          <el-button type="primary" @click="fetchData">重试</el-button>
        </div>        <div v-else class="stats-container">
          <div class="stat-item">
            <div class="stat-value">{{ formatNumber(data.totalNum) }}</div>
            <div class="stat-label">设备总数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatNumber(data.updateSuccess) }}</div>
            <div class="stat-label">升级成功</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatNumber(data.updating) }}</div>
            <div class="stat-label">升级中</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatNumber(data.updateError) }}</div>
            <div class="stat-label">升级失败</div>
          </div>
        </div>        <div class="progress-container">
          <el-progress
            :percentage="successPercentage"
            :color="customColors"
            :show-text="false"
          ></el-progress>
          <div class="progress-labels">
            <span>成功率: {{ successPercentage }}%</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template><script>
import { getOtaOverview } from '@/api/bigscreen';export default {
  name: 'OtaOverview',
  props: {
    customerId: {
      type: [String, Number],
      required: true,
      validator: function(value) {
        return value !== null && value !== undefined && value !== '';
      }
    }
  },
  data() {
    return {
      loading: false,
      error: null,
      data: {
        updateError: 0,
        updating: 0,
        totalNum: 0,
        updateSuccess: 0
      },
      customColors: [
        { color: '#f56c6c', percentage: 20 },
        { color: '#e6a23c', percentage: 40 },
        { color: '#5cb87a', percentage: 60 },
        { color: '#1989fa', percentage: 80 },
        { color: '#6f7ad3', percentage: 100 }
      ]
    };
  },
  computed: {
    successPercentage() {
      if (this.data.totalNum === 0) return 0;
      return Math.round((this.data.updateSuccess / this.data.totalNum) * 100);
    }
  },
  watch: {
    customerId: {
      immediate: true,
      handler() {
        this.fetchData();
      }
    }
  },
  methods: {
    async fetchData() {
      this.loading = true;
      this.error = null;      try {
        const response = await getOtaOverview({ customerId: this.customerId });
        
        if (response.code !== 200) {
          throw new Error(response.message || '获取数据失败');
        }        if (!response.data || !response.data.success) {
          throw new Error(response.data?.message || '数据返回格式不正确');
        }        this.data = {
          updateError: response.data.data.updateError || 0,
          updating: response.data.data.updating || 0,
          totalNum: response.data.data.totalNum || 0,
          updateSuccess: response.data.data.updateSuccess || 0
        };
      } catch (err) {
        console.error('获取OTA升级总览数据失败:', err);
        this.error = err.message || '未知错误';
      } finally {
        this.loading = false;
      }
    },
    formatNumber(num) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }
};
</script><style scoped>
.ota-overview-container {
  width: 100%;
  height: 100%;
}.overview-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}.card-title {
  font-size: 18px;
  font-weight: bold;
}.data-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
}.error-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}.stats-container {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  flex-wrap: wrap;
  gap: 15px;
}.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}.stat-label {
  font-size: 14px;
  color: #909399;
}.progress-container {
  margin-top: auto;
  padding: 10px 0;
}.progress-labels {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
  font-size: 14px;
  color: #606266;
}@media (max-width: 768px) {
  .stats-container {
    flex-direction: column;
    align-items: center;
  }
  
  .stat-item {
    width: 100%;
    margin-bottom: 15px;
  }
}
</style>