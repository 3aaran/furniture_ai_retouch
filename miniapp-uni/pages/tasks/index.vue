<template>
  <view class="page tasks-page">
    <view class="header-card">
      <view class="title">生成任务</view>
      <view class="muted">查看进度和结果</view>
    </view>

    <scroll-view scroll-x class="filter-scroll">
      <view
        v-for="item in filters"
        :key="item.key"
        :class="['filter-chip', activeStatus === item.key ? 'active' : '']"
        @click="activeStatus = item.key"
      >
        {{ item.label }}
      </view>
    </scroll-view>

    <view class="task-card" v-for="task in filteredTasks" :key="task.id">
      <view class="task-head">
        <view>
          <view class="task-title">{{ task.title }}</view>
          <view class="muted">{{ task.featureName }} · {{ task.createdAt }}</view>
        </view>
        <view :class="['status-pill', task.status]">{{ task.statusText }}</view>
      </view>

      <view class="image-compare">
        <view class="image-box">
          <view :class="['image-thumb', featureClass(task)]">
            <view class="furniture-shape"></view>
          </view>
          <view class="image-label">原图</view>
        </view>
        <view class="image-box">
          <view :class="['image-thumb', task.resultImage ? 'result' : 'empty', featureClass(task)]">
            <view v-if="task.resultImage" class="furniture-shape"></view>
          </view>
          <view class="image-label">结果图</view>
        </view>
      </view>

      <view class="task-meta">
        <view>{{ task.cost }} 算力</view>
        <view>{{ task.createdAt }}</view>
      </view>
      <view v-if="task.failReason" class="fail-reason">失败原因：{{ task.failReason }}</view>

      <view class="task-actions">
        <button v-if="task.status === 'succeeded'" class="secondary-btn mini-btn" @click="viewResult(task)">查看结果</button>
        <button v-if="task.status === 'failed'" class="secondary-btn mini-btn" @click="retryTask(task)">重新生成</button>
      </view>
    </view>

    <view v-if="!filteredTasks.length" class="empty">暂无匹配任务</view>
  </view>
</template>

<script>
import { getMockTasks, retryMockTask } from '../../utils/mockStore.js';

export default {
  data() {
    return {
      activeStatus: 'all',
      tasks: [],
      filters: [
        { key: 'all', label: '全部' },
        { key: 'queued', label: '等待中' },
        { key: 'running', label: '生成中' },
        { key: 'succeeded', label: '已完成' },
        { key: 'failed', label: '失败' }
      ]
    };
  },
  computed: {
    filteredTasks() {
      if (this.activeStatus === 'all') return this.tasks;
      return this.tasks.filter((task) => task.status === this.activeStatus);
    }
  },
  onShow() {
    this.tasks = getMockTasks();
  },
  methods: {
    featureClass(task) {
      return `feature-${task.featureKey || 'default'}`;
    },
    viewResult(task) {
      const resultName = task.resultImage ? task.resultImage.name : '暂无结果图';
      uni.showModal({
        title: task.featureName,
        content: resultName,
        showCancel: false
      });
    },
    retryTask(task) {
      const created = retryMockTask(task.id);
      if (!created) {
        uni.showToast({ title: '任务不存在', icon: 'none' });
        return;
      }
      this.tasks = getMockTasks();
      this.activeStatus = 'queued';
      uni.showToast({ title: '已重新提交', icon: 'success' });
    }
  }
};
</script>

<style>
.header-card {
  padding: 28rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 10rpx 28rpx rgba(23, 32, 51, 0.05);
}

.title {
  margin-bottom: 10rpx;
  color: #172033;
  font-size: 38rpx;
  font-weight: 900;
}

.filter-scroll {
  width: 100%;
  margin: 24rpx 0;
  white-space: nowrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 126rpx;
  height: 64rpx;
  margin-right: 12rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #526176;
  font-size: 25rpx;
  font-weight: 800;
}

.filter-chip.active {
  background: #1f6feb;
  color: #fff;
}

.task-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #fff;
}

.task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.task-title {
  color: #172033;
  font-size: 30rpx;
  font-weight: 900;
}

.status-pill {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #edf3ff;
  color: #1f6feb;
  font-size: 22rpx;
  font-weight: 900;
  flex-shrink: 0;
}

.status-pill.succeeded {
  background: #e8f8ef;
  color: #16834a;
}

.status-pill.failed {
  background: #fff0ef;
  color: #d4382f;
}

.status-pill.running {
  background: #fff8e6;
  color: #a46a00;
}

.image-compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin: 22rpx 0;
}

.image-thumb {
  height: 180rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #e8eef8, #d8e5f7);
  position: relative;
  overflow: hidden;
}

.furniture-shape {
  position: absolute;
  left: 28rpx;
  right: 28rpx;
  bottom: 32rpx;
  height: 48rpx;
  border-radius: 999rpx 999rpx 18rpx 18rpx;
  background: rgba(82, 97, 118, 0.2);
}

.image-thumb.result {
  background: linear-gradient(135deg, #e8f8ef, #cfeeda);
}

.image-thumb.empty {
  background: repeating-linear-gradient(135deg, #f4f6fa 0, #f4f6fa 14rpx, #e8edf5 14rpx, #e8edf5 28rpx);
}

.feature-material_replace {
  background: linear-gradient(135deg, #f5eadc, #d7b98c);
}

.feature-scene_fusion {
  background: linear-gradient(135deg, #dcebf7, #c8e2d2);
}

.feature-photo_enhance {
  background: linear-gradient(135deg, #fff2c8, #d9e8ff);
}

.feature-line_drawing {
  background: linear-gradient(135deg, #f7f8fb, #d9dee8);
}

.feature-multi_view {
  background: linear-gradient(135deg, #e5e1ff, #d7ecff);
}

.feature-promo_main_image {
  background: linear-gradient(135deg, #f7ead7, #d8e9ff);
}

.feature-promo_poster_image {
  background: linear-gradient(135deg, #ffe5e0, #fff0c4);
}

.feature-promo_detail_image {
  background: linear-gradient(135deg, #e7f4ec, #f7ead7);
}

.feature-video_generate {
  background: linear-gradient(135deg, #dde7ff, #eadcff);
}

.image-label {
  margin-top: 8rpx;
  text-align: center;
  color: #748198;
  font-size: 22rpx;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  color: #526176;
  font-size: 24rpx;
}

.fail-reason {
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 14rpx;
  background: #fff7f6;
  color: #b02a22;
  font-size: 24rpx;
  line-height: 1.5;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18rpx;
}

.mini-btn {
  min-width: 180rpx;
  height: 64rpx;
  font-size: 24rpx;
}

.empty {
  padding: 80rpx 0;
  color: #748198;
  text-align: center;
  font-size: 26rpx;
}
</style>
