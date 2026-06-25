<template>
  <view class="page resources-page">
    <app-topbar
      title="勋港家具 AI"
      subtitle="资源库"
      :quota="topbarQuota"
      :avatar-text="topbarAvatar"
      @profile="goMine"
    />

    <view class="page-head">
      <view>
        <view class="title">资源库</view>
        <view class="muted">系统、门店、个人素材</view>
      </view>
      <view class="count">{{ filteredResources.length }}</view>
    </view>

    <view class="search-box">
      <input v-model="keyword" placeholder="搜索资源名称 / 分类" />
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

    <view class="resource-grid">
      <view class="resource-card" v-for="item in filteredResources" :key="item.id">
        <view :class="['resource-thumb', resourceClass(item)]" @click="openDetail(item)">
          <image v-if="item.thumbUrl || item.imageUrl || item.url" class="resource-real-img" :src="item.thumbUrl || item.imageUrl || item.url" mode="aspectFill" />
          <view v-else class="thumb-text">{{ item.thumbText }}</view>
          <view v-if="!(item.thumbUrl || item.imageUrl || item.url)" class="furniture-shape"></view>
        </view>
        <view class="resource-info">
          <view class="resource-name">{{ item.name }}</view>
          <view class="resource-meta">{{ item.typeText }} · {{ item.subCategoryName }}</view>
          <view class="resource-actions">
            <button class="secondary-btn mini-btn" @click="openDetail(item)">详情</button>
            <button class="secondary-btn mini-btn" @click="useInWorkbench(item)">使用</button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!filteredResources.length" class="empty-card">暂无素材</view>

    <view v-if="detailResource" class="modal-mask" @click="detailResource = null">
      <view class="detail-card" @click.stop>
        <view class="detail-head">
          <view>
            <view class="detail-title">{{ detailResource.name }}</view>
            <view class="muted">{{ detailResource.typeText }} · {{ detailResource.source }}</view>
          </view>
          <text @click="detailResource = null">关闭</text>
        </view>
        <view :class="['preview-box', resourceClass(detailResource)]">
          <image v-if="detailResource.imageUrl || detailResource.url || detailResource.thumbUrl" class="resource-real-img" :src="detailResource.imageUrl || detailResource.url || detailResource.thumbUrl" mode="aspectFill" />
          <view v-else class="thumb-text">{{ detailResource.thumbText }}</view>
          <view v-if="!(detailResource.imageUrl || detailResource.url || detailResource.thumbUrl)" class="furniture-shape"></view>
        </view>
        <view class="detail-grid">
          <view><text>来源</text><b>{{ detailResource.source }}</b></view>
          <view><text>分类</text><b>{{ detailResource.subCategoryName }}</b></view>
          <view><text>尺寸</text><b>{{ detailResource.resolution }}</b></view>
          <view><text>大小</text><b>{{ detailResource.sizeText }}</b></view>
          <view><text>关联任务</text><b>{{ detailResource.relatedTasks || 0 }}</b></view>
          <view><text>时间</text><b>{{ detailResource.createdAt }}</b></view>
        </view>
        <button class="primary-btn" @click="useInWorkbench(detailResource)">用于工作台</button>
      </view>
    </view>
  </view>
</template>

<script>
import { getMockResources, getMockUser, setWorkbenchResource } from '../../utils/mockStore.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { useMockApi } from '../../utils/request.js';
import { getResources } from '../../api/resource.js';

export default {
  components: {
    AppTopbar
  },
  data() {
    return {
      keyword: '',
      activeType: 'all',
      resources: [],
      user: getMockUser(),
      useMock: true,
      detailResource: null,
      filters: [
        { key: 'all', label: '全部' },
        { key: 'original', label: '原图' },
        { key: 'generated', label: '生成图' },
        { key: 'system', label: '系统素材' },
        { key: 'merchant', label: '门店素材' },
        { key: 'personal', label: '个人素材' }
      ]
    };
  },
  computed: {
    filteredResources() {
      const kw = this.keyword.trim().toLowerCase();
      const allowedTypes = ['original', 'generated', 'system', 'merchant', 'personal'];
      return this.resources.filter((item) => {
        if (allowedTypes.indexOf(item.type) < 0) return false;
        const matchType = this.activeType === 'all' || item.type === this.activeType;
        const matchKeyword = !kw || [item.name, item.typeText, item.source, item.mainCategoryName, item.subCategoryName].some((text) => String(text || '').toLowerCase().indexOf(kw) >= 0);
        return matchType && matchKeyword;
      });
    },
    topbarQuota() {
      return this.user && this.user.quota !== undefined ? this.user.quota : '';
    },
    topbarAvatar() {
      const name = this.user.displayName || this.user.username || this.user.phone || '用';
      return String(name).slice(0, 1);
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
      this.useMock = useMockApi();
      if (this.useMock) {
        this.resources = getMockResources();
        return;
      }
      this.loadRealResources();
    },
    async loadRealResources() {
      try {
        const data = await getResources({ pageSize: 999 }, { showLoading: false, showErrorToast: false });
        const items = Array.isArray(data?.items) ? data.items : [];
        this.resources = items.map(this.normalizeRealResource);
      } catch (error) {
        uni.showToast({ title: error.message || '资源库读取失败', icon: 'none' });
        this.resources = [];
      }
    },
    normalizeRealResource(item = {}) {
      const source = String(item.source || '').toUpperCase();
      const scope = String(item.scope || '').toUpperCase();
      const type = source === 'AI_GENERATED'
        ? 'generated'
        : source === 'UPLOAD'
          ? 'original'
          : scope === 'SYSTEM'
            ? 'system'
            : scope === 'MERCHANT'
              ? 'merchant'
              : 'personal';
      const typeText = {
        original: '原图',
        generated: '生成图',
        system: '系统素材',
        merchant: '门店素材',
        personal: '个人素材'
      }[type] || '素材';
      return {
        ...item,
        type,
        typeText,
        source: scope === 'SYSTEM' ? '系统空间' : scope === 'MERCHANT' ? '门店空间' : '个人空间',
        thumbText: item.name || typeText,
        imageId: item.id,
        sizeText: item.fileSize ? `${(Number(item.fileSize) / 1024 / 1024).toFixed(2)}MB` : '-',
        resolution: item.width && item.height ? `${item.width}x${item.height}` : '-',
        relatedTasks: item.relatedTasks || 0
      };
    },
    resourceClass(item) {
      return `type-${item.type || 'personal'}`;
    },
    openDetail(item) {
      this.detailResource = item;
    },
    useInWorkbench(item) {
      setWorkbenchResource(item);
      this.detailResource = null;
      uni.switchTab({ url: '/pages/workbench/index' });
    },
    goMine() {
      uni.switchTab({ url: '/pages/mine/index' });
    }
  }
};
</script>

<style>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 2rpx 10rpx;
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
  color: #f0d68a;
  font-size: 30rpx;
  font-weight: 900;
}

.search-box {
  margin-top: 16rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.04);
}

.search-box input {
  height: 80rpx;
  color: #f5f0e6;
  font-size: 26rpx;
}

.filter-scroll {
  width: 100%;
  margin: 18rpx 0;
  white-space: nowrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 116rpx;
  height: 60rpx;
  margin-right: 10rpx;
  padding: 0 18rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.04);
  color: #cfc8b8;
  font-size: 24rpx;
  font-weight: 800;
}

.filter-chip.active {
  border-color: transparent;
  background: linear-gradient(135deg, #f3da94, #c79b3b);
  color: #181207;
}

.resource-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
}

.resource-card {
  width: calc(50% - 9rpx);
  box-sizing: border-box;
  overflow: hidden;
  border: 1rpx solid rgba(242, 213, 140, 0.11);
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.04);
}

.resource-thumb,
.preview-box {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #202731, #11161d);
}

.resource-real-img {
  width: 100%;
  height: 100%;
  display: block;
}

.resource-thumb {
  height: 224rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.08);
}

.preview-box {
  height: 330rpx;
  margin: 22rpx 0;
  border: 1rpx solid rgba(242, 213, 140, 0.14);
  border-radius: 22rpx;
}

.type-merchant,
.type-system {
  background: linear-gradient(135deg, #3b2f22, #7c6338);
}

.type-generated {
  background: linear-gradient(135deg, #4a3c20, #233b54);
}

.type-original,
.type-personal {
  background: linear-gradient(135deg, #202731, #11161d);
}

.thumb-text {
  position: absolute;
  left: 16rpx;
  top: 14rpx;
  z-index: 2;
  color: rgba(255, 245, 220, 0.72);
  font-size: 22rpx;
  font-weight: 900;
}

.furniture-shape {
  position: absolute;
  left: 30rpx;
  right: 30rpx;
  bottom: 34rpx;
  height: 42rpx;
  border-radius: 999rpx 999rpx 16rpx 16rpx;
  background: rgba(242, 213, 140, 0.25);
}

.resource-info {
  padding: 16rpx;
}

.resource-name {
  color: #fff5dc;
  font-size: 26rpx;
  line-height: 1.25;
  font-weight: 900;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.resource-meta {
  margin-top: 8rpx;
  color: rgba(255, 244, 223, 0.58);
  font-size: 22rpx;
  line-height: 1.3;
}

.resource-actions {
  display: flex;
  gap: 8rpx;
  margin-top: 14rpx;
}

.mini-btn {
  flex: 1;
  height: 58rpx;
  min-width: 0;
  font-size: 23rpx;
}

.empty-card {
  margin-top: 40rpx;
  padding: 50rpx 0;
  border: 1rpx solid rgba(242, 213, 140, 0.11);
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.04);
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
  background: rgba(0, 0, 0, 0.58);
}

.detail-card {
  width: 100%;
  box-sizing: border-box;
  padding: 28rpx;
  border: 1rpx solid rgba(242, 213, 140, 0.16);
  border-bottom: 0;
  border-radius: 30rpx 30rpx 0 0;
  background: #0c0e11;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.detail-head > text {
  color: #f0d68a;
  font-size: 25rpx;
  font-weight: 900;
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
  margin-bottom: 22rpx;
}

.detail-grid view {
  width: calc(50% - 7rpx);
  box-sizing: border-box;
  padding: 18rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.045);
}

.detail-grid text {
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
</style>
