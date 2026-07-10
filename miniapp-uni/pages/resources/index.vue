<template>
  <view class="page resources-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" @profile="goMine" />

    <view class="page-head">
      <view class="page-head-main">
        <view class="page-icon"><app-icon name="layers" tone="dark" :size="34" /></view>
        <view class="page-title-text">
          <text class="ui-strong">资产库</text>
          <text>系统空间、门店空间、我的空间</text>
        </view>
      </view>
    </view>

    <view class="space-tabs">
      <button v-for="item in spaceTabs" :key="item.key" :class="query.space === item.key ? 'active' : ''" @click="setSpace(item.key)">{{ item.name }}</button>
    </view>

    <view class="search-box">
      <app-icon name="search" :size="28" />
      <input v-model="keyword" placeholder="搜索资源名称 / 分类" confirm-type="search" @confirm="reload" />
    </view>

    <scroll-view class="purpose-scroll" scroll-x>
      <view class="purpose-row">
        <text v-for="item in purposeTabs" :key="item.key" :class="['purpose-pill', query.purpose === item.key ? 'active' : '']" @click="setPurpose(item.key)">{{ item.name }}</text>
      </view>
    </scroll-view>

    <view class="category-block">
      <view class="category-head">
        <text class="ui-strong">{{ activePurposeName }}</text>
        <text>{{ activeSpaceName }}</text>
      </view>
      <view class="category-main-row">
        <text v-for="item in mainCategoryTabs" :key="item.key" :class="['category-chip', query.mainCategory === item.key ? 'active' : '']" @click="setMainCategory(item.key)">{{ item.name }}</text>
      </view>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="resource-grid">
      <view v-for="item in displayResources" :key="item.id" class="resource-card" @click="useInWorkbench(item)">
        <view class="resource-thumb">
          <image v-if="item.thumbnail" :src="item.thumbnail" mode="aspectFit" lazy-load />
          <app-icon v-else name="image" :size="42" />
        </view>
        <view class="scope-badge">{{ item.scopeText }}</view>
        <text class="ui-strong">{{ item.name }}</text>
        <text>{{ item.categoryText }}</text>
      </view>
    </view>

    <view v-if="!displayResources.length && !loading" class="empty-card">暂无资源</view>
    <view v-if="loading" class="empty-card">资源加载中...</view>
    <button v-if="hasMore" class="secondary-btn more-btn" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? '加载中...' : '加载更多资源' }}</button>
    <view v-else-if="displayResources.length" class="list-end">已加载全部资源</view>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getResources, getMerchantResources } from '../../api/resource.js';
import { getCurrentUser } from '../../api/user.js';
import { requireLogin } from '../../utils/auth.js';
import { normalizeFileUrl } from '../../utils/fileUrl.js';
import { displayName, originalOf, thumbnailOf, unwrapList, unwrapUser, userQuota } from '../../utils/model.js';

const RESOURCE_KEY = 'miniapp_workbench_resource';
const purposeTabs = [
  { key: 'ALL', name: '全部' },
  { key: 'PRODUCT', name: '产品图' },
  { key: 'material', name: '材质替换' },
  { key: 'scene', name: '场景融合' }
];
const purposeMainMap = {
  PRODUCT: ['产品'],
  material: ['材质', '软体'],
  scene: ['场景模板']
};
const fixedMainCategories = ['材质', '软体', '产品', '场景模板'];

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      rawResources: [],
      loading: false,
      loadingMore: false,
      hasMore: true,
      errorText: '',
      keyword: '',
      query: { space: 'SYSTEM', purpose: 'ALL', mainCategory: '', page: 1, pageSize: 20 },
      spaceTabs: [
        { key: 'SYSTEM', name: '系统空间' },
        { key: 'STORE', name: '门店空间' },
        { key: 'PERSONAL', name: '我的空间' }
      ],
      purposeTabs
    };
  },
  computed: {
    quotaText() { return userQuota(this.user); },
    topbarAvatar() { return displayName(this.user).slice(0, 1); },
    activeSpaceName() {
      const item = this.spaceTabs.find((tab) => tab.key === this.query.space);
      return item ? item.name : '系统空间';
    },
    activePurposeName() {
      const item = this.purposeTabs.find((tab) => tab.key === this.query.purpose);
      return item ? item.name : '全部';
    },
    resources() {
      return this.rawResources.map(this.normalizeResource);
    },
    displayResources() {
      return this.filterResourcesBySpaceAndPurpose(this.resources);
    },
    mainCategoryTabs() {
      const purpose = this.query.purpose;
      const allowed = purpose === 'ALL' ? fixedMainCategories : (purposeMainMap[purpose] || []);
      const existing = new Set(this.resources.map((item) => this.normalizeMainCategory(item)).filter(Boolean));
      const items = allowed.length ? allowed : Array.from(existing);
      return [{ key: '', name: '全部分类' }, ...items.map((name) => ({ key: name, name }))];
    }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
    this.reload();
  },
  onReachBottom() {
    this.loadMore();
  },
  methods: {
    async loadUser() {
      try { this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {}; } catch (e) {}
    },
    setSpace(space) {
      this.query.space = space;
      this.query.mainCategory = '';
      this.reload();
    },
    setPurpose(purpose) {
      this.query.purpose = purpose;
      this.query.mainCategory = '';
    },
    setMainCategory(mainCategory) {
      this.query.mainCategory = mainCategory;
    },
    reload() {
      this.loadPage(1, true);
    },
    loadMore() {
      if (!this.loading && !this.loadingMore && this.hasMore) this.loadPage(this.query.page + 1, false);
    },
    async loadPage(page, replace) {
      if (replace) this.loading = true;
      else this.loadingMore = true;
      this.errorText = '';
      try {
        const params = { page, pageSize: this.query.pageSize, keyword: this.keyword };
        const apiScope = this.normalizeSpaceKey(this.query.space);
        let payload;
        if (apiScope === 'MERCHANT' || apiScope === 'USER') {
          payload = await getMerchantResources({ ...params, scope: apiScope }, { showLoading: false });
        } else {
          payload = await getResources(params, { showLoading: false });
        }
        const items = unwrapList(payload);
        const merged = replace ? items : this.rawResources.concat(items.filter((item) => !this.rawResources.some((current) => current.id === item.id)));
        const total = Number(payload?.total ?? payload?.data?.total);
        this.rawResources = merged;
        this.query.page = page;
        this.hasMore = items.length === this.query.pageSize && (!Number.isFinite(total) || merged.length < total);
      } catch (error) {
        this.errorText = error.message || '资产库读取失败';
        if (replace) this.rawResources = [];
      } finally {
        this.loading = false;
        this.loadingMore = false;
      }
    },
    normalizeSpaceKey(space) {
      if (space === 'STORE') return 'MERCHANT';
      if (space === 'PERSONAL') return 'USER';
      return 'SYSTEM';
    },
    normalizeResource(item = {}) {
      const scope = this.normalizeResourceScope(item.scope || item.space || item.resource_scope || '');
      const mainCategoryName = item.mainCategoryName || item.objectName || '';
      const subCategoryName = item.subCategoryName || item.colorName || '';
      const resourceType = this.normalizeResourceType(item.resourceType || item.resource_type || item.type || '', mainCategoryName);
      return {
        ...item,
        id: item.id,
        name: item.name || item.title || '未命名资源',
        thumbnail: normalizeFileUrl(thumbnailOf(item)),
        original: normalizeFileUrl(originalOf(item)),
        scope,
        resourceType,
        mainCategoryName,
        subCategoryName,
        typeText: this.resourceTypeText(resourceType),
        scopeText: this.scopeText(scope),
        categoryText: [this.resourceUseLabel(resourceType, mainCategoryName), mainCategoryName, subCategoryName].filter(Boolean).join(' / ') || '未分类'
      };
    },
    normalizeResourceScope(scope) {
      const value = String(scope || '').toUpperCase();
      if (value === 'STORE') return 'MERCHANT';
      if (value === 'PERSONAL') return 'USER';
      return value || 'USER';
    },
    normalizeResourceType(type, mainCategoryName = '') {
      const value = String(type || '').toLowerCase();
      if (value === 'material' || value === 'scene') return value;
      if (mainCategoryName === '材质' || mainCategoryName === '软体') return 'material';
      if (mainCategoryName === '场景模板') return 'scene';
      return 'user_reference';
    },
    normalizeMainCategory(item = {}) {
      const raw = String(item.mainCategoryName || item.objectName || '').trim();
      return fixedMainCategories.includes(raw) ? raw : '未分类';
    },
    resourceUseLabel(type, mainCategoryName = '') {
      if (type === 'material' || mainCategoryName === '材质' || mainCategoryName === '软体') return '材质替换';
      if (type === 'scene' || mainCategoryName === '场景模板') return '场景融合';
      return '产品图';
    },
    resourceTypeText(type) {
      const map = { material: '材质替换', scene: '场景融合', user_reference: '产品图' };
      return map[type] || '产品图';
    },
    scopeText(scope) {
      const map = { SYSTEM: '系统', MERCHANT: '门店', USER: '我的' };
      return map[scope] || '资源';
    },
    filterResourcesBySpaceAndPurpose(list = []) {
      const apiScope = this.normalizeSpaceKey(this.query.space);
      const kw = String(this.keyword || '').trim().toLowerCase();
      return list.filter((item) => {
        if (item.scope !== apiScope) return false;
        if (this.query.purpose !== 'ALL') {
          if (this.query.purpose === 'PRODUCT' && item.resourceType !== 'user_reference') return false;
          if (this.query.purpose === 'material' && item.resourceType !== 'material') return false;
          if (this.query.purpose === 'scene' && item.resourceType !== 'scene') return false;
        }
        if (this.query.mainCategory && this.normalizeMainCategory(item) !== this.query.mainCategory) return false;
        if (!kw) return true;
        return [item.name, item.mainCategoryName, item.subCategoryName, item.typeText, item.categoryText, item.description].filter(Boolean).join(' ').toLowerCase().includes(kw);
      });
    },
    useInWorkbench(item) {
      uni.setStorageSync(RESOURCE_KEY, item);
      uni.reLaunch({ url: '/pages/workbench/index' });
    },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style scoped>
.space-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; margin: 4rpx 0 18rpx; }
.space-tabs button { height: 70rpx; border-radius: 20rpx; color: var(--xg-text-muted); background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.1); font-size: 25rpx; font-weight: 900; }
.space-tabs button.active { color: var(--xg-text-inverse); background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); border-color: transparent; }
.search-box { height: 78rpx; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; margin-bottom: 18rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: var(--xg-text-muted); }
.search-box input { flex: 1; color: var(--xg-text-main); font-size: 28rpx; }
.purpose-scroll { margin: 0 -24rpx 18rpx; padding-left: 24rpx; white-space: nowrap; }
.purpose-row { display: flex; gap: 12rpx; padding-right: 24rpx; }
.purpose-pill { display: inline-flex; padding: 14rpx 22rpx; border-radius: 999rpx; color: var(--xg-text-muted); background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.09); font-size: 24rpx; font-weight: 800; }
.purpose-pill.active { color: var(--xg-text-inverse); background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); }
.category-block { margin-bottom: 20rpx; padding: 20rpx; border-radius: 22rpx; background: rgba(255,255,255,.035); border: 1rpx solid rgba(255,255,255,.08); }
.category-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 16rpx; }
.category-head .ui-strong { color: var(--xg-text-main); font-size: 29rpx; font-weight: 900; }
.category-head text { color: var(--xg-text-muted); font-size: 23rpx; }
.category-main-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.category-chip { display: inline-flex; padding: 10rpx 16rpx; border-radius: 999rpx; color: var(--xg-text-muted); background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); font-size: 22rpx; }
.category-chip.active { color: var(--xg-text-inverse); background: var(--xg-color-primary); border-color: transparent; font-weight: 900; }
.resource-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; }
.resource-card { overflow: hidden; border-radius: 20rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.1); }
.resource-thumb { position: relative; width: 100%; height: 210rpx; display: flex; align-items: center; justify-content: center; color: var(--xg-color-primary); background: rgba(var(--xg-color-primary-rgb), .1); font-size: 40rpx; }
.resource-thumb image { width: 100%; height: 100%; display: block; }
.scope-badge { display: inline-flex; margin: 12rpx 14rpx 0; padding: 4rpx 12rpx; border-radius: 999rpx; color: var(--xg-color-primary); background: rgba(var(--xg-color-primary-rgb), .08); font-size: 18rpx; font-weight: 900; }
.resource-card .ui-strong { display: block; padding: 14rpx 14rpx 0; color: var(--xg-text-main); font-size: 24rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resource-card text { display: block; padding: 6rpx 14rpx 16rpx; color: var(--xg-text-muted); font-size: 20rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); color: var(--xg-text-muted); font-size: 26rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
.more-btn { width: 100%; margin-top: 24rpx; }
.list-end { margin-top: 24rpx; text-align: center; color: var(--xg-text-dim); font-size: 24rpx; }
</style>
