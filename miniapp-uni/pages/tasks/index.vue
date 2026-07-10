<template>
  <view class="page history-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" @profile="goMine" />
    <view class="page-head">
      <view class="page-head-main">
        <view class="page-icon"><app-icon name="image" tone="dark" :size="34" /></view>
        <view class="page-title-text"><text class="ui-strong">历史记录</text><text>生成记录与图片结果</text></view>
      </view>
      <view class="head-actions"><button @click="reload"><app-icon name="refresh" :size="28" /></button></view>
    </view>
    <view class="search-box"><app-icon name="search" :size="28" /><input v-model="keyword" placeholder="搜索任务编号..." confirm-type="search" @confirm="reload" /></view>
    <view v-if="errorText" class="error-card">{{ errorText }}</view>
    <view class="record-list">
      <view v-for="task in filteredTasks" :key="task.id" class="record-card" @click="previewTask(task)">
        <view class="record-thumb">
          <image v-if="task.thumbnail" :src="task.thumbnail" mode="aspectFit" lazy-load />
          <text v-else>{{ task.featureShort }}</text>
        </view>
        <view class="record-copy">
          <view v-if="task.statusClass === 'failed' || task.statusClass === 'error'" class="fail-badge">失败，已退回算力</view>
          <view class="feature-pill">{{ task.featureName }}</view>
          <text>{{ task.statusClass === 'failed' || task.statusClass === 'error' ? '失败，已退回算力' : task.createdAtText }}</text>
          <text class="ui-small">{{ task.id }}</text>
        </view>
        <view class="record-actions"><button @click.stop="previewTask(task)">详情</button><button @click.stop="copyImageUrl(task)">下载</button></view>
      </view>
    </view>
    <view v-if="!filteredTasks.length && !loading" class="empty-card">暂无记录</view>
    <view v-if="loading" class="empty-card">记录加载中...</view>
    <button v-if="hasMore" class="secondary-btn more-btn" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? '加载中...' : '加载更多记录' }}</button>
    <view v-else-if="tasks.length" class="list-end">已加载全部记录</view>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getCurrentUser } from '../../api/user.js';
import { getTaskImages } from '../../api/task.js';
import { requireLogin } from '../../utils/auth.js';
import { normalizeFileUrl } from '../../utils/fileUrl.js';
import { displayName, featureName, fmtTime, originalOf, thumbnailOf, unwrapList, unwrapUser } from '../../utils/model.js';

export default {
  components: { AppTopbar },
  data() {
    return { user: {}, tasks: [], loading: false, loadingMore: false, hasMore: true, errorText: '', keyword: '', page: 1, pageSize: 12 };
  },
  computed: {
    topbarAvatar() { return displayName(this.user).slice(0, 1) || '勋'; },
    filteredTasks() {
      const kw = String(this.keyword || '').trim().toLowerCase();
      return !kw ? this.tasks : this.tasks.filter((task) => String(task.id || '').toLowerCase().includes(kw) || String(task.featureName || '').toLowerCase().includes(kw));
    }
  },
  onShow() { if (!requireLogin()) return; this.loadUser(); this.reload(); },
  onReachBottom() { this.loadMore(); },
  methods: {
    async loadUser() { try { this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {}; } catch (e) {} },
    reload() { this.loadPage(1, true); },
    loadMore() { if (!this.loading && !this.loadingMore && this.hasMore) this.loadPage(this.page + 1, false); },
    async loadPage(nextPage, replace) {
      if (replace) this.loading = true; else this.loadingMore = true;
      this.errorText = '';
      try {
        const payload = await getTaskImages({ keyword: this.keyword, page: nextPage, pageSize: this.pageSize }, { showLoading: false });
        const items = unwrapList(payload).map(this.normalizeTask);
        const merged = replace ? items : this.tasks.concat(items.filter((item) => !this.tasks.some((current) => current.id === item.id)));
        const total = Number(payload?.total ?? payload?.data?.total);
        this.tasks = merged; this.page = nextPage;
        this.hasMore = items.length === this.pageSize && (!Number.isFinite(total) || merged.length < total);
      } catch (error) {
        this.errorText = error.message || '历史记录读取失败';
        if (replace) this.tasks = [];
      } finally { this.loading = false; this.loadingMore = false; }
    },
    normalizeTask(item = {}) {
      const name = featureName(item.featureKey || item.operation || item.kind || item.type || '', item.featureName || item.operationName || item.kindName);
      return { ...item, id: item.id || item.taskId, featureName: name, featureShort: name.slice(0, 2), statusClass: String(item.status || 'success').toLowerCase(), createdAtText: fmtTime(item.createdAt || item.created_at), thumbnail: normalizeFileUrl(thumbnailOf(item)), original: normalizeFileUrl(originalOf(item)) };
    },
    previewTask(task) { if (task.original) return uni.previewImage({ urls: [task.original], current: task.original }); uni.showToast({ title: '暂无图片可预览', icon: 'none' }); },
    copyImageUrl(task) { if (!task.original) return uni.showToast({ title: '暂无图片链接', icon: 'none' }); uni.setClipboardData({ data: task.original, success: () => uni.showToast({ title: '原图链接已复制', icon: 'success' }) }); },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style scoped>
.history-page { padding-bottom: 40rpx; }
.head-actions button { width: 72rpx; height: 72rpx; padding: 0; border-radius: 22rpx; color: var(--xg-color-primary); background: var(--xg-bg-card); border: 1rpx solid var(--xg-border-soft); }
.search-box { height: 78rpx; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; margin-bottom: 22rpx; border-radius: 22rpx; border: 1rpx solid var(--xg-border-soft); background: var(--xg-bg-card); color: var(--xg-text-muted); }
.search-box input { flex: 1; color: var(--xg-text-main); font-size: 28rpx; }
.record-list { display: flex; flex-direction: column; gap: 28rpx; }
.record-card { overflow: hidden; border-radius: 28rpx; border: 1rpx solid var(--xg-border-soft); background: var(--xg-bg-card); box-shadow: var(--xg-shadow-soft); }
.record-thumb { position: relative; width: 100%; height: 428rpx; display: flex; align-items: center; justify-content: center; color: var(--xg-color-primary); background: var(--xg-bg-card-soft); font-size: 42rpx; font-weight: 900; }
.record-thumb image { width: 100%; height: 100%; display: block; }
.fail-badge { display: inline-flex; margin-bottom: 12rpx; padding: 7rpx 14rpx; border-radius: 999rpx; color: #fff; background: #cf304b; font-size: 23rpx; font-weight: 900; }
.record-copy { min-width: 0; padding: 18rpx 20rpx 8rpx; }
.feature-pill { max-width: 100%; height: 42rpx; display: inline-flex; align-items: center; padding: 0 18rpx; border-radius: 999rpx; color: #fff; background: #32c7a3; font-size: 24rpx; font-weight: 900; }
.record-copy text, .record-copy .ui-small { display: block; margin-top: 13rpx; color: var(--xg-text-muted); font-size: 24rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 14rpx 20rpx 20rpx; }
.record-actions button { height: 72rpx; border-radius: 18rpx; border: 1rpx solid var(--xg-border-soft); background: var(--xg-bg-card-soft); color: var(--xg-color-primary); font-size: 26rpx; font-weight: 900; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: var(--xg-bg-card); color: var(--xg-text-muted); font-size: 26rpx; border: 1rpx solid var(--xg-border-soft); }
.error-card { color: #cf304b; border-color: rgba(255,112,112,.4); }
.more-btn { margin-top: 24rpx; }
.list-end { margin-top: 24rpx; text-align: center; color: var(--xg-text-dim); font-size: 24rpx; }
</style>
