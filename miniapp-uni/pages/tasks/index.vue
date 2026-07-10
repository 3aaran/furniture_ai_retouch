<template>
  <view class="page history-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" @profile="goMine" />

    <view class="page-head">
      <view class="page-head-main">
        <view class="page-icon"><app-icon name="image" tone="dark" :size="34" /></view>
        <view class="page-title-text">
          <text class="ui-strong">历史记录</text>
          <text>生成记录与图片结果</text>
        </view>
      </view>
      <view class="head-actions">
        <button @click="reload"><app-icon name="refresh" :size="28" /></button>
      </view>
    </view>

    <view class="search-box">
      <app-icon name="search" :size="28" />
      <input v-model="keyword" placeholder="搜索任务编号..." confirm-type="search" @confirm="reload" />
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="record-list">
      <view v-for="task in filteredTasks" :key="task.id" class="record-card" @click="previewTask(task)">
        <view class="record-thumb">
          <image v-if="task.image" :src="task.image" mode="aspectFill" />
          <text v-else>{{ task.featureShort }}</text>
          <view v-if="task.statusClass === 'failed' || task.statusClass === 'error'" class="fail-badge">失败</view>
        </view>
        <view class="record-copy">
          <view class="feature-pill">{{ task.featureName }}</view>
          <text>{{ task.statusClass === 'failed' || task.statusClass === 'error' ? '失败，已退回算力' : task.createdAtText }}</text>
          <text class="ui-small">{{ task.id }}</text>
        </view>
        <view class="record-actions">
          <button @click.stop="previewTask(task)">详情</button>
          <button @click.stop="copyImageUrl(task)">下载</button>
        </view>
      </view>
    </view>

    <view v-if="!filteredTasks.length && !loading" class="empty-card">暂无记录</view>
    <view v-if="loading" class="empty-card">记录加载中...</view>
    <button v-if="tasks.length" class="secondary-btn more-btn" @click="loadMore">查看更多记录</button>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getCurrentUser } from '../../api/user.js';
import { getTaskImages } from '../../api/task.js';
import { requireLogin } from '../../utils/auth.js';
import { normalizeFileUrl } from '../../utils/fileUrl.js';
import { displayName, featureName, fmtTime, imageOf, statusText, unwrapList, unwrapUser, userQuota } from '../../utils/model.js';

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {}, tasks: [], loading: false, errorText: '', keyword: '', pageSize: 20
    };
  },
  computed: {
    quotaText() { return userQuota(this.user); },
    topbarAvatar() { return displayName(this.user).slice(0, 1) || '勋'; },
    filteredTasks() {
      const kw = String(this.keyword || '').trim().toLowerCase();
      if (!kw) return this.tasks;
      return this.tasks.filter((task) => String(task.id || '').toLowerCase().includes(kw) || String(task.featureName || '').toLowerCase().includes(kw));
    }
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
    loadMore() {
      this.pageSize += 20;
      this.reload();
    },
    async reload() {
      this.loading = true;
      this.errorText = '';
      try {
        const payload = await getTaskImages({ keyword: this.keyword, pageSize: this.pageSize }, { showLoading: false });
        this.tasks = unwrapList(payload).map(this.normalizeTask);
      } catch (error) {
        this.errorText = error.message || '历史记录读取失败';
        this.tasks = [];
      } finally {
        this.loading = false;
      }
    },
    normalizeTask(item = {}) {
      const key = item.featureKey || item.operation || item.kind || item.type || '';
      const name = featureName(key, item.featureName || item.operationName || item.kindName);
      const status = item.status || 'success';
      return {
        ...item,
        id: item.id || item.taskId,
        title: item.originalName || item.name || item.title || `任务 ${item.id || item.taskId || ''}`,
        featureName: name,
        featureShort: name.slice(0, 2),
        statusText: statusText(status),
        statusClass: String(status).toLowerCase(),
        createdAtText: fmtTime(item.createdAt || item.created_at),
        errorMessage: item.errorMessage || item.error || item.failReason || '',
        image: normalizeFileUrl(imageOf(item))
      };
    },
    previewTask(task) {
      if (task.image) {
        uni.previewImage({ urls: [task.image], current: task.image });
        return;
      }
      uni.showToast({ title: '暂无图片可预览', icon: 'none' });
    },
    copyImageUrl(task) {
      if (!task.image) return uni.showToast({ title: '暂无图片链接', icon: 'none' });
      uni.setClipboardData({ data: task.image, success: () => uni.showToast({ title: '图片链接已复制', icon: 'success' }) });
    },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style scoped>
.history-page { padding-bottom: 40rpx; }
.head-actions { display: flex; gap: 14rpx; }
.head-actions button { width: 72rpx; height: 72rpx; padding: 0; border-radius: 22rpx; color: var(--xg-color-primary); background: rgba(255,255,255,.055); border: 1rpx solid rgba(255,255,255,.13); }
.search-box { height: 78rpx; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; margin-bottom: 22rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: var(--xg-text-muted); }
.search-box input { flex: 1; color: var(--xg-text-main); font-size: 28rpx; }
.record-list { display: flex; flex-direction: column; gap: 28rpx; }
.record-card { overflow: hidden; border-radius: 28rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.045); }
.record-thumb { position: relative; width: 100%; height: 428rpx; overflow: hidden; border-radius: 28rpx 28rpx 0 0; background: rgba(var(--xg-color-primary-rgb), .1); display: flex; align-items: center; justify-content: center; color: var(--xg-color-primary); font-size: 42rpx; font-weight: 900; }
.record-thumb image { width: 100%; height: 100%; }
.fail-badge { position: absolute; right: 8rpx; bottom: 8rpx; padding: 7rpx 14rpx; border-radius: 999rpx; color: #fff; background: #cf304b; font-size: 23rpx; font-weight: 900; }
.record-copy { min-width: 0; padding: 18rpx 20rpx 8rpx; }
.feature-pill { max-width: 100%; height: 42rpx; display: inline-flex; align-items: center; padding: 0 18rpx; border-radius: 999rpx; color: #fff; background: #06c968; font-size: 24rpx; font-weight: 900; }
.record-copy text, .record-copy .ui-small { display: block; margin-top: 13rpx; color: var(--xg-text-muted); font-size: 24rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 14rpx 20rpx 20rpx; }
.record-actions button { height: 72rpx; border-radius: 18rpx; border: 1rpx solid rgba(255,255,255,.11); background: rgba(255,255,255,.045); color: var(--xg-text-main); font-size: 26rpx; font-weight: 900; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); color: var(--xg-text-muted); font-size: 26rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
.more-btn { margin-top: 24rpx; }
</style>
