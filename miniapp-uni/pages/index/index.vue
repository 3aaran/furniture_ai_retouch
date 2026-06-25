<template>
  <view class="page home-page">
    <view class="hero">
      <view class="hero-kicker">勋港智能家具 AI 修图平台</view>
      <view class="hero-title">家具图一键修好</view>
      <view class="hero-desc">商品图、主图、门店素材</view>
      <button class="primary-btn hero-button" @click="goWorkbench">进入工作台</button>
    </view>

    <view class="quota-card">
      <view>
        <view class="quota-label">当前可用算力</view>
        <view class="quota-value">{{ user.quota }}</view>
      </view>
      <view class="quota-side">
        <view>{{ user.company }}</view>
        <view class="muted">{{ user.roleName }} · 门店额度 {{ user.merchantQuota }}</view>
      </view>
    </view>

    <view class="section-title">核心能力</view>
    <view class="feature-grid">
      <view v-for="item in features" :key="item.key" class="feature-card" @click="goWorkbenchWithFeature(item.key)">
        <view class="feature-name">{{ item.name }}</view>
        <view class="feature-scene">{{ item.scene }}</view>
      </view>
    </view>

    <view class="section-title">
      <text>最近任务</text>
      <text class="link" @click="goTasks">查看全部</text>
    </view>
    <view class="task-list">
      <view v-for="task in recentTasks" :key="task.id" class="task-row">
        <view :class="['task-thumb', task.featureKey]">
          <view class="furniture-shape"></view>
        </view>
        <view class="task-main">
          <view class="task-title">{{ task.title }}</view>
          <view class="muted">{{ task.featureName }} · {{ task.createdAt }}</view>
        </view>
        <view :class="['status-pill', task.status]">{{ task.statusText }}</view>
      </view>
    </view>
  </view>
</template>

<script>
import { getFeatureTypes, getMockTasks, getMockUser } from '../../utils/mockStore.js';

export default {
  data() {
    return {
      user: {},
      features: [],
      recentTasks: []
    };
  },
  onShow() {
    this.user = getMockUser();
    this.features = getFeatureTypes();
    this.recentTasks = getMockTasks().slice(0, 3);
  },
  methods: {
    goWorkbench() {
      uni.switchTab({ url: '/pages/workbench/index' });
    },
    goWorkbenchWithFeature(key) {
      uni.setStorageSync('miniapp_pending_feature_key', key);
      uni.switchTab({ url: '/pages/workbench/index' });
    },
    goTasks() {
      uni.switchTab({ url: '/pages/tasks/index' });
    }
  }
};
</script>

<style>
.home-page {
  padding-bottom: 40rpx;
}

.hero {
  padding: 34rpx;
  border-radius: 24rpx;
  background: #172033;
  color: #fff;
}

.hero-kicker {
  font-size: 24rpx;
  color: #9fc0ff;
  font-weight: 700;
}

.hero-title {
  margin-top: 18rpx;
  font-size: 42rpx;
  line-height: 1.28;
  font-weight: 900;
}

.hero-desc {
  margin-top: 18rpx;
  color: #dbe6f8;
  font-size: 26rpx;
  line-height: 1.7;
}

.hero-button {
  margin-top: 28rpx;
}

.quota-card {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  margin-top: 24rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 12rpx 32rpx rgba(23, 32, 51, 0.06);
}

.quota-label {
  color: #748198;
  font-size: 24rpx;
}

.quota-value {
  margin-top: 8rpx;
  color: #1f6feb;
  font-size: 52rpx;
  font-weight: 900;
}

.quota-side {
  flex: 1;
  text-align: right;
  font-size: 26rpx;
  font-weight: 700;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.feature-card {
  min-height: 128rpx;
  padding: 22rpx;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 10rpx 28rpx rgba(23, 32, 51, 0.05);
}

.feature-name {
  color: #172033;
  font-size: 30rpx;
  font-weight: 900;
}

.feature-scene {
  margin-top: 14rpx;
  color: #1f6feb;
  font-size: 22rpx;
}

.link {
  color: #1f6feb;
  font-size: 24rpx;
  font-weight: 700;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 16rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: #fff;
}

.task-thumb {
  width: 92rpx;
  height: 92rpx;
  border-radius: 16rpx;
  background: #e8eef8;
  background: linear-gradient(135deg, #e8eef8, #d8e5f7);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.furniture-shape {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  bottom: 18rpx;
  height: 26rpx;
  border-radius: 999rpx 999rpx 10rpx 10rpx;
  background: rgba(82, 97, 118, 0.2);
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-title {
  color: #172033;
  font-size: 28rpx;
  font-weight: 800;
}

.status-pill {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 800;
  background: #edf3ff;
  color: #1f6feb;
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
</style>
