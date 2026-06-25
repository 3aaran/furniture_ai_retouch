<template>
  <view class="page tasks-page">
    <app-topbar
      title="勋港家具 AI"
      subtitle="历史"
      :quota="topbarQuota"
      :avatar-text="topbarAvatar"
      @profile="goMine"
    />

    <view class="header-card">
      <view>
        <view class="title">历史</view>
        <view class="muted">生成记录与结果</view>
      </view>
      <view class="count">{{ filteredTasks.length }}</view>
    </view>

    <view class="search-box">
      <input v-model="keyword" placeholder="任务编号 / 功能 / 用户" />
    </view>

    <scroll-view scroll-x class="filter-scroll">
      <view
        v-for="item in statusFilters"
        :key="item.key"
        :class="['filter-chip', activeStatus === item.key ? 'active' : '']"
        @click="activeStatus = item.key"
      >
        {{ item.label }}
      </view>
    </scroll-view>

    <scroll-view scroll-x class="filter-scroll tight">
      <view
        v-for="item in featureFilters"
        :key="item.key"
        :class="['filter-chip small', activeFeature === item.key ? 'active' : '']"
        @click="activeFeature = item.key"
      >
        {{ item.label }}
      </view>
    </scroll-view>

    <scroll-view scroll-x class="filter-scroll tight">
      <view
        v-for="item in timeFilters"
        :key="item.key"
        :class="['filter-chip small', activeTime === item.key ? 'active' : '']"
        @click="activeTime = item.key"
      >
        {{ item.label }}
      </view>
    </scroll-view>

    <view class="task-card" v-for="task in filteredTasks" :key="task.id">
      <view class="task-head">
        <view>
          <view class="task-title">{{ task.typeName }}</view>
          <view class="muted">{{ task.userName || '-' }} · {{ task.createdAt }}</view>
        </view>
        <view :class="['status-pill', task.status]">{{ task.statusText }}</view>
      </view>

      <view class="image-compare">
        <view class="image-box">
          <view :class="['image-thumb', featureClass(task)]">
            <image v-if="task.originImage && (task.originImage.thumbUrl || task.originImage.url)" class="task-real-img" :src="task.originImage.thumbUrl || task.originImage.url" mode="aspectFill" />
            <view v-else class="furniture-shape"></view>
          </view>
          <view class="image-label">原图</view>
        </view>
        <view class="image-box">
          <view :class="['image-thumb', task.resultImage ? 'result' : 'empty', featureClass(task)]">
            <image v-if="task.resultImage && (task.resultImage.thumbUrl || task.resultImage.url)" class="task-real-img" :src="task.resultImage.thumbUrl || task.resultImage.url" mode="aspectFill" />
            <view v-else-if="task.resultImage" class="furniture-shape"></view>
          </view>
          <view class="image-label">结果</view>
        </view>
      </view>

      <view class="task-meta">
        <text>{{ task.taskId }}</text>
        <text>{{ task.costQuota }} 算力</text>
      </view>
      <view v-if="task.status === 'running'" class="progress-wrap">
        <view class="progress-bar"><view :style="{ width: task.progress + '%' }"></view></view>
        <text>{{ task.progress }}%</text>
      </view>
      <view v-if="task.errorMessage" class="fail-reason">{{ task.errorMessage }}</view>

      <view class="task-actions">
        <button class="secondary-btn mini-btn" @click="openDetail(task)">详情</button>
        <button v-if="task.status === 'succeeded'" class="secondary-btn mini-btn" @click="viewResult(task)">查看结果</button>
        <button v-if="task.status === 'failed'" class="secondary-btn mini-btn" @click="retryTask(task)">重试</button>
      </view>
    </view>

    <view v-if="!filteredTasks.length" class="empty">暂无记录</view>

    <view v-if="detailTask" class="modal-mask" @click="detailTask = null">
      <view class="detail-card" @click.stop>
        <view class="detail-head">
          <view>
            <view class="detail-title">{{ detailTask.typeName }}</view>
            <view class="muted">{{ detailTask.taskId }}</view>
          </view>
          <text @click="detailTask = null">关闭</text>
        </view>
        <view class="detail-grid">
          <view><text>状态</text><b>{{ detailTask.statusText }}</b></view>
          <view><text>消耗</text><b>{{ detailTask.costQuota }}</b></view>
          <view><text>进度</text><b>{{ detailTask.progress }}%</b></view>
          <view><text>规格</text><b>{{ specText(detailTask) }}</b></view>
        </view>
        <view class="detail-section">
          <view class="section-label">要求</view>
          <view class="detail-text">{{ detailTask.userPrompt || '无' }}</view>
        </view>
        <view v-if="detailTask.resultImages && detailTask.resultImages.length" class="detail-section">
          <view class="section-label">结果</view>
          <view class="detail-text">{{ detailTask.resultImages[0].name }}，已同步到资源库</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { advanceMockTasks, getFeatureTypes, getMockTasks, getMockUser, retryMockTask } from '../../utils/mockStore.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { useMockApi } from '../../utils/request.js';
import { getRecentAiTasks } from '../../api/task.js';

export default {
  components: {
    AppTopbar
  },
  data() {
    return {
      keyword: '',
      activeStatus: 'all',
      activeFeature: 'all',
      activeTime: 'all',
      tasks: [],
      features: [],
      user: getMockUser(),
      useMock: true,
      detailTask: null,
      timer: null,
      statusFilters: [
        { key: 'all', label: '全部' },
        { key: 'queued', label: '等待中' },
        { key: 'running', label: '生成中' },
        { key: 'succeeded', label: '已完成' },
        { key: 'failed', label: '失败' }
      ],
      timeFilters: [
        { key: 'all', label: '全部时间' },
        { key: '1', label: '今天' },
        { key: '7', label: '近7天' },
        { key: '30', label: '近30天' }
      ]
    };
  },
  computed: {
    featureFilters() {
      return [{ key: 'all', label: '全部功能' }].concat(this.features.map((item) => ({ key: item.key, label: item.shortName || item.name })));
    },
    topbarQuota() {
      return this.user && this.user.quota !== undefined ? this.user.quota : '';
    },
    topbarAvatar() {
      const name = this.user.displayName || this.user.username || this.user.phone || '用';
      return String(name).slice(0, 1);
    },
    filteredTasks() {
      const kw = this.keyword.trim().toLowerCase();
      return this.tasks.filter((task) => {
        const matchStatus = this.activeStatus === 'all' || task.status === this.activeStatus;
        const matchFeature = this.activeFeature === 'all' || task.type === this.activeFeature || task.featureKey === this.activeFeature;
        const matchKeyword = !kw || [task.taskId, task.title, task.typeName, task.userName].some((text) => String(text || '').toLowerCase().indexOf(kw) >= 0);
        const matchTime = this.matchTime(task.createdAt);
        return matchStatus && matchFeature && matchKeyword && matchTime;
      });
    }
  },
  onShow() {
    this.features = getFeatureTypes();
    this.refreshTasks();
    this.startProgressTimer();
  },
  onHide() {
    this.stopProgressTimer();
  },
  onUnload() {
    this.stopProgressTimer();
  },
  methods: {
    async refreshTasks() {
      this.useMock = useMockApi();
      if (!this.useMock) {
        await this.refreshRealTasks();
        return;
      }
      this.tasks = getMockTasks();
      if (this.detailTask) {
        const found = this.tasks.find((item) => item.taskId === this.detailTask.taskId);
        if (found) this.detailTask = found;
      }
    },
    async refreshRealTasks() {
      try {
        const data = await getRecentAiTasks({ pageSize: 50, keyword: this.keyword }, { showLoading: false, showErrorToast: false });
        const items = Array.isArray(data?.items) ? data.items : [];
        this.tasks = items.map(this.normalizeRealTask);
        if (this.detailTask) {
          const found = this.tasks.find((item) => item.taskId === this.detailTask.taskId);
          if (found) this.detailTask = found;
        }
      } catch (error) {
        uni.showToast({ title: error.message || '历史读取失败', icon: 'none' });
        this.tasks = [];
      }
    },
    normalizeRealTask(item = {}) {
      const status = item.status || 'running';
      const miniFeatureKey = this.apiFeatureToMiniKey(item.featureKey || item.kind);
      const statusText = item.statusLabel || {
        queued: '等待中',
        running: '生成中',
        succeeded: '已完成',
        failed: '失败'
      }[status] || status;
      return {
        ...item,
        id: item.id,
        taskId: item.id,
        type: miniFeatureKey,
        featureKey: miniFeatureKey,
        apiFeatureKey: item.featureKey || item.kind,
        typeName: item.featureName || item.featureKey || 'AI任务',
        featureName: item.featureName || item.featureKey || 'AI任务',
        title: item.featureName || item.featureKey || '家具修图任务',
        status,
        statusText,
        progress: status === 'succeeded' ? 100 : status === 'running' ? 70 : status === 'queued' ? 10 : 0,
        costQuota: Number(item.cost || item.quotaUsed || 0),
        createdAt: item.createdAt || item.submittedAt || '',
        originImage: item.originImage || null,
        resultImage: item.resultImage || (item.resultUrl ? { id: item.imageId, url: item.resultUrl, thumbUrl: item.thumbUrl } : null),
        resultImages: item.resultImage ? [item.resultImage] : [],
        errorMessage: item.errorMessage || ''
      };
    },
    apiFeatureToMiniKey(apiKey) {
      const found = this.features.find((item) => item.apiFeatureKey === apiKey || item.key === apiKey);
      return found ? found.key : apiKey;
    },
    startProgressTimer() {
      this.stopProgressTimer();
      this.timer = setInterval(() => {
        if (!this.tasks.some((item) => item.status === 'running' || item.status === 'queued')) return;
        if (this.useMock) {
          this.tasks = advanceMockTasks();
          if (this.detailTask) {
            const found = this.tasks.find((item) => item.taskId === this.detailTask.taskId);
            if (found) this.detailTask = found;
          }
        } else {
          this.refreshRealTasks();
        }
      }, 1200);
    },
    stopProgressTimer() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    },
    featureClass(task) {
      return `feature-${task.type || task.featureKey || 'default'}`;
    },
    specText(task) {
      const params = task.params || {};
      return [params.resolution, params.ratio, params.duration, params.quality].filter(Boolean).join(' / ') || '-';
    },
    matchTime(createdAt) {
      if (this.activeTime === 'all') return true;
      const date = new Date(String(createdAt || '').replace(/-/g, '/'));
      if (Number.isNaN(date.getTime())) return true;
      const diff = Date.now() - date.getTime();
      const days = Number(this.activeTime || 0);
      return diff <= days * 24 * 60 * 60 * 1000;
    },
    openDetail(task) {
      this.detailTask = task;
    },
    viewResult(task) {
      this.detailTask = task;
      uni.showToast({ title: '结果已在资源库', icon: 'none' });
    },
    retryTask(task) {
      if (!this.useMock) {
        uni.showToast({ title: '真实重试接口后续接入', icon: 'none' });
        return;
      }
      const created = retryMockTask(task.taskId);
      if (!created) {
        uni.showToast({ title: '任务不存在', icon: 'none' });
        return;
      }
      this.tasks = getMockTasks();
      this.activeStatus = 'running';
      this.startProgressTimer();
      uni.showToast({ title: '已重新提交', icon: 'success' });
    },
    goMine() {
      uni.switchTab({ url: '/pages/mine/index' });
    }
  }
};
</script>

<style>
.header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 2rpx 12rpx;
}

.title {
  color: #fff5dc;
  font-size: 42rpx;
  line-height: 1.15;
  font-weight: 900;
}

.count {
  min-width: 62rpx;
  height: 62rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(242, 213, 140, 0.18);
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.04);
  color: #f3dc9a;
  font-size: 30rpx;
  font-weight: 900;
}

.search-box {
  margin-top: 14rpx;
  padding: 0 20rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.search-box input {
  height: 80rpx;
  color: #f5f0e6;
  font-size: 26rpx;
}

.filter-scroll {
  width: 100%;
  margin: 20rpx 0 0;
  white-space: nowrap;
}

.filter-scroll.tight {
  margin-top: 12rpx;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 118rpx;
  height: 62rpx;
  margin-right: 10rpx;
  padding: 0 18rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.04);
  color: #cfc8b8;
  font-size: 24rpx;
  font-weight: 800;
}

.filter-chip.small {
  min-width: 104rpx;
  height: 56rpx;
  font-size: 23rpx;
}

.filter-chip.active {
  border-color: transparent;
  background: linear-gradient(135deg, #f3da94, #c79b3b);
  color: #181207;
}

.task-card {
  margin-top: 18rpx;
  padding: 18rpx;
  border: 1rpx solid rgba(242, 213, 140, 0.11);
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 18rpx 52rpx rgba(0, 0, 0, 0.24);
}

.task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.task-title {
  color: #fff5dc;
  font-size: 29rpx;
  font-weight: 900;
}

.status-pill {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(242, 213, 140, 0.12);
  color: #f3dc9a;
  font-size: 22rpx;
  font-weight: 900;
  flex-shrink: 0;
}

.status-pill.succeeded {
  background: rgba(30, 125, 75, 0.32);
  color: #9af0b5;
}

.status-pill.failed {
  background: rgba(150, 55, 55, 0.36);
  color: #ffb2b2;
}

.status-pill.running {
  background: rgba(242, 213, 140, 0.15);
  color: #ffe3a4;
}

.image-compare {
  display: flex;
  gap: 14rpx;
  margin: 20rpx 0;
}

.image-box {
  flex: 1;
  min-width: 0;
}

.image-thumb {
  position: relative;
  height: 168rpx;
  overflow: hidden;
  border-radius: 16rpx;
  border: 1rpx solid rgba(242, 213, 140, 0.14);
  background: linear-gradient(135deg, #232b35, #161c24);
}

.task-real-img {
  width: 100%;
  height: 100%;
  display: block;
}

.furniture-shape {
  position: absolute;
  left: 26rpx;
  right: 26rpx;
  bottom: 30rpx;
  height: 46rpx;
  border-radius: 999rpx 999rpx 16rpx 16rpx;
  background: rgba(242, 213, 140, 0.25);
}

.image-thumb.result {
  background: linear-gradient(135deg, #1d3327, #23351f);
}

.image-thumb.empty {
  background: repeating-linear-gradient(135deg, #101318 0, #101318 14rpx, #1a2029 14rpx, #1a2029 28rpx);
}

.feature-material_replace {
  background: linear-gradient(135deg, #3b2f22, #7c6338);
}

.feature-scene_fusion {
  background: linear-gradient(135deg, #1e3340, #244235);
}

.feature-photo_enhance,
.feature-promo_poster_image {
  background: linear-gradient(135deg, #4a3c20, #233b54);
}

.feature-line_drawing,
.feature-multi_view {
  background: linear-gradient(135deg, #1f2630, #343b48);
}

.feature-video_generate {
  background: linear-gradient(135deg, #263653, #3b2f50);
}

.image-label {
  margin-top: 8rpx;
  text-align: center;
  color: rgba(255, 244, 223, 0.56);
  font-size: 22rpx;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  color: rgba(255, 244, 223, 0.62);
  font-size: 24rpx;
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 14rpx;
  color: #f3dc9a;
  font-size: 23rpx;
  font-weight: 900;
}

.progress-bar {
  flex: 1;
  height: 12rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.08);
}

.progress-bar view {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #f3da94, #c79b3b);
}

.fail-reason {
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 14rpx;
  background: rgba(150, 55, 55, 0.22);
  color: #ffb2b2;
  font-size: 24rpx;
  line-height: 1.5;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  margin-top: 18rpx;
}

.mini-btn {
  min-width: 132rpx;
  height: 60rpx;
  font-size: 24rpx;
}

.empty {
  padding: 80rpx 0;
  color: rgba(255, 244, 223, 0.58);
  text-align: center;
  font-size: 26rpx;
}

.modal-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.35);
}

.detail-card {
  width: 100%;
  box-sizing: border-box;
  padding: 28rpx;
  border-radius: 28rpx 28rpx 0 0;
  border: 1rpx solid rgba(242, 213, 140, 0.16);
  border-bottom: 0;
  background: #0c0e11;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.detail-title {
  color: #fff5dc;
  font-size: 32rpx;
  font-weight: 900;
}

.detail-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin: 22rpx 0;
}

.detail-grid view {
  width: calc(50% - 7rpx);
  box-sizing: border-box;
  padding: 18rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.045);
}

.detail-grid text,
.section-label {
  display: block;
  color: rgba(255, 244, 223, 0.58);
  font-size: 22rpx;
}

.detail-grid b {
  display: block;
  margin-top: 6rpx;
  color: #fff5dc;
  font-size: 25rpx;
}

.detail-section {
  margin-top: 16rpx;
}

.detail-text {
  margin-top: 8rpx;
  color: rgba(255, 244, 223, 0.68);
  font-size: 25rpx;
  line-height: 1.6;
}
</style>
