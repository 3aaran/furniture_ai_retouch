<template>
  <view class="page resources-page">
    <view class="header-card">
      <view class="title">资源库</view>
      <view class="muted">素材复用</view>
    </view>

    <scroll-view scroll-x class="filter-scroll">
      <view
        v-for="item in filters"
        :key="item.key"
        :class="['filter-chip', activeType === item.key ? 'active' : '']"
        @click="activeType = item.key"
      >
        {{ item.label }}
      </view>
    </scroll-view>

    <view class="resource-card" v-for="item in filteredResources" :key="item.id">
      <view class="resource-thumb"><view class="furniture-shape"></view></view>
      <view class="resource-main">
        <view class="resource-name">{{ item.name }}</view>
        <view class="resource-tags">
          <text>{{ item.typeText }}</text>
          <text>{{ item.source }}</text>
        </view>
        <view class="muted">{{ item.subCategoryName }} · {{ item.createdAt }}</view>
        <button class="secondary-btn use-btn" @click="useInWorkbench(item)">用于工作台</button>
      </view>
    </view>

    <view v-if="!filteredResources.length" class="empty-card">暂无素材</view>
  </view>
</template>

<script>
import { getMockResources, setWorkbenchResource } from '../../utils/mockStore.js';
import { mockResources } from '../../mock/data.js';

export default {
  data() {
    return {
      activeType: 'all',
      resources: [],
      filters: [
        { key: 'all', label: '全部' },
        { key: 'original', label: '原图' },
        { key: 'generated', label: '生成图' },
        { key: 'system', label: '系统素材' },
        { key: 'merchant', label: '门店素材' },
        { key: 'personal', label: '个人素材' },
        { key: 'video', label: '视频' }
      ]
    };
  },
  computed: {
    filteredResources() {
      if (this.activeType === 'all') return this.resources;
      return this.resources.filter((item) => item.type === this.activeType);
    }
  },
  onLoad() {
    this.loadResources();
  },
  onShow() {
    this.loadResources();
  },
  methods: {
    loadResources() {
      try {
        const list = getMockResources();
        this.resources = Array.isArray(list) && list.length ? list : mockResources;
      } catch (error) {
        this.resources = mockResources;
      }
    },
    useInWorkbench(item) {
      setWorkbenchResource(item);
      uni.switchTab({ url: '/pages/workbench/index' });
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

.resource-card {
  display: flex;
  gap: 18rpx;
  margin-bottom: 18rpx;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #fff;
}

.resource-thumb {
  width: 164rpx;
  height: 164rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #e8eef8, #d8e5f7);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.furniture-shape {
  position: absolute;
  left: 28rpx;
  right: 28rpx;
  bottom: 32rpx;
  height: 42rpx;
  border-radius: 999rpx 999rpx 18rpx 18rpx;
  background: rgba(82, 97, 118, 0.2);
}

.resource-main {
  flex: 1;
  min-width: 0;
}

.resource-name {
  color: #172033;
  font-size: 30rpx;
  font-weight: 900;
}

.resource-tags {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin: 10rpx 0;
}

.resource-tags text {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: #edf3ff;
  color: #1f6feb;
  font-size: 21rpx;
  font-weight: 800;
}

.use-btn {
  width: 180rpx;
  height: 60rpx;
  margin: 14rpx 0 0;
  font-size: 24rpx;
}

.empty-card {
  margin-top: 40rpx;
  padding: 50rpx 0;
  border-radius: 20rpx;
  background: #fff;
  color: #748198;
  text-align: center;
  font-size: 26rpx;
}
</style>
