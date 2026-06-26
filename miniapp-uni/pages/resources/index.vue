<template>
  <view class="page resources-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" @profile="goMine" />

    <view class="resource-head">
      <b>资源库</b>
      <text>真实素材资产</text>
    </view>

    <view class="search-box">
      <text>⌕</text>
      <input v-model="keyword" placeholder="搜索资源名称 / 分类" confirm-type="search" @confirm="reload" />
    </view>

    <scroll-view class="filter-scroll" scroll-x>
      <view class="filter-row">
        <text v-for="item in tabs" :key="item.key" :class="['filter-pill', query.scope === item.key ? 'active' : '']" @click="setScope(item.key)">{{ item.name }}</text>
      </view>
    </scroll-view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="resource-grid">
      <view v-for="item in resources" :key="item.id" class="resource-card" @click="useInWorkbench(item)">
        <view class="resource-thumb">
          <image v-if="item.image" :src="item.image" mode="aspectFill" />
          <text v-else>无图</text>
        </view>
        <b>{{ item.name }}</b>
        <text>{{ item.categoryText }}</text>
      </view>
    </view>

    <view v-if="!resources.length && !loading" class="empty-card">暂无真实资源数据</view>
    <view v-if="loading" class="empty-card">正在读取真实资源...</view>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getResources, getMerchantResources } from '../../api/resource.js';
import { getCurrentUser } from '../../api/user.js';
import { requireLogin } from '../../utils/auth.js';
import { normalizeFileUrl } from '../../utils/fileUrl.js';
import { displayName, imageOf, roleText, unwrapList, unwrapUser, userQuota } from '../../utils/model.js';

const RESOURCE_KEY = 'miniapp_workbench_resource';

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      resources: [],
      loading: false,
      errorText: '',
      keyword: '',
      query: { scope: 'ALL', pageSize: 50 },
      tabs: [
        { key: 'ALL', name: '全部' },
        { key: 'SYSTEM', name: '系统素材' },
        { key: 'MERCHANT', name: '门店素材' },
        { key: 'USER', name: '个人素材' }
      ]
    };
  },
  computed: {
    quotaText() { return userQuota(this.user); },
    topbarAvatar() { return displayName(this.user).slice(0, 1); }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
    this.reload();
  },
  methods: {
    async loadUser() {
      try { this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {}; } catch (e) {}
    },
    setScope(scope) {
      this.query.scope = scope;
      this.reload();
    },
    async reload() {
      this.loading = true;
      this.errorText = '';
      try {
        const params = { pageSize: 50, keyword: this.keyword };
        let payload;
        if (this.query.scope === 'MERCHANT' || this.query.scope === 'USER') {
          payload = await getMerchantResources({ ...params, scope: this.query.scope }, { showLoading: false });
        } else if (this.query.scope === 'SYSTEM') {
          payload = await getResources({ ...params, scope: 'SYSTEM' }, { showLoading: false });
        } else {
          payload = await getResources(params, { showLoading: false });
        }
        this.resources = unwrapList(payload).map(this.normalizeResource);
      } catch (error) {
        this.errorText = error.message || '资源库读取失败';
        this.resources = [];
      } finally {
        this.loading = false;
      }
    },
    normalizeResource(item = {}) {
      const scope = item.scope || item.space || '';
      const type = item.resourceType || item.type || '';
      return {
        ...item,
        id: item.id,
        name: item.name || item.title || '未命名资源',
        image: normalizeFileUrl(imageOf(item)),
        typeText: this.resourceTypeText(type),
        scopeText: this.scopeText(scope),
        categoryText: [item.mainCategoryName || item.objectName, item.subCategoryName || item.colorName].filter(Boolean).join(' / ') || '未分类'
      };
    },
    resourceTypeText(type) {
      const map = { material: '材质', scene: '场景', reference: '参考图', background: '背景', image: '图片', system: '系统素材' };
      return map[type] || type || '素材';
    },
    scopeText(scope) {
      const map = { SYSTEM: '系统', MERCHANT: '门店', USER: '个人' };
      return map[scope] || scope || '资源';
    },
    useInWorkbench(item) {
      uni.setStorageSync(RESOURCE_KEY, item);
      uni.reLaunch({ url: '/pages/workbench/index' });
    },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style>
.resource-head { margin: 24rpx 0 18rpx; }
.resource-head b { display: block; color: #fff6dc; font-size: 36rpx; font-weight: 900; }
.resource-head text { display: block; margin-top: 6rpx; color: rgba(255,246,220,.58); font-size: 24rpx; }
.search-box { height: 78rpx; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; margin-bottom: 18rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: rgba(255,246,220,.7); }
.search-box input { flex: 1; color: #fff6dc; font-size: 28rpx; }
.filter-scroll { margin: 0 -24rpx 22rpx; padding-left: 24rpx; white-space: nowrap; }
.filter-row { display: flex; gap: 12rpx; padding-right: 24rpx; }
.filter-pill { display: inline-flex; padding: 14rpx 22rpx; border-radius: 999rpx; color: rgba(255,246,220,.7); background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.09); font-size: 24rpx; }
.filter-pill.active { color: #171208; background: linear-gradient(135deg,#fff1b8,#d6a942); }
.resource-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; }
.resource-card { overflow: hidden; border-radius: 20rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.1); }
.resource-thumb { width: 100%; height: 210rpx; display: flex; align-items: center; justify-content: center; color: #efd482; background: rgba(226,199,115,.1); font-size: 26rpx; }
.resource-thumb image { width: 100%; height: 100%; display: block; }
.resource-card b { display: block; padding: 14rpx 14rpx 0; color: #fff6dc; font-size: 24rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resource-card text { display: block; padding: 6rpx 14rpx 16rpx; color: rgba(255,246,220,.55); font-size: 20rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); color: rgba(255,246,220,.62); font-size: 26rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
</style>
