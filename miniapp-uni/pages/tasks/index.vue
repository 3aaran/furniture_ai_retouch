<template>
  <view class="page history-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" @profile="goMine" />

    <view class="history-head">
      <b>最近图片</b>
      <view class="head-actions">
        <button @click="reload">↻</button>
      </view>
    </view>

    <view class="search-box">
      <text>⌕</text>
      <input v-model="keyword" placeholder="搜索任务编号..." confirm-type="search" @confirm="reload" />
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="record-list">
      <view v-for="task in filteredTasks" :key="task.id" class="record-card">
        <view class="record-thumb">
          <image v-if="task.image" :src="task.image" mode="aspectFill" />
          <text v-else>{{ task.featureShort }}</text>
          <view v-if="task.statusClass === 'failed' || task.statusClass === 'error'" class="fail-badge">失败</view>
        </view>
        <view class="record-copy">
          <view class="feature-pill">{{ task.featureName }}</view>
          <text>{{ task.statusClass === 'failed' || task.statusClass === 'error' ? '失败，已退回算力' : task.createdAtText }}</text>
          <small>{{ task.id }}</small>
        </view>
      </view>
    </view>

    <view v-if="!filteredTasks.length && !loading" class="empty-card">暂无真实任务记录</view>
    <view v-if="loading" class="empty-card">正在读取真实任务...</view>
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
        this.errorText = error.message || '历史任务读取失败';
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
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style>
.history-page { padding-bottom: 40rpx; }
.history-head { display: flex; align-items: center; justify-content: space-between; margin: 24rpx 0 18rpx; }
.history-head b { color: #fff6dc; font-size: 34rpx; font-weight: 900; }
.head-actions { display: flex; gap: 14rpx; }
.head-actions button { width: 72rpx; height: 72rpx; padding: 0; border-radius: 22rpx; color: #efd482; background: rgba(255,255,255,.055); border: 1rpx solid rgba(255,255,255,.13); }
.search-box { height: 78rpx; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; margin-bottom: 22rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: rgba(255,246,220,.7); }
.search-box input { flex: 1; color: #fff6dc; font-size: 28rpx; }
.record-list { display: flex; flex-direction: column; gap: 22rpx; }
.record-card { display: flex; gap: 18rpx; padding: 18rpx; border-radius: 24rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.045); }
.record-thumb { position: relative; width: 156rpx; height: 156rpx; flex: 0 0 156rpx; overflow: hidden; border-radius: 20rpx; background: rgba(226,199,115,.1); display: flex; align-items: center; justify-content: center; color: #efd482; font-weight: 900; }
.record-thumb image { width: 100%; height: 100%; }
.fail-badge { position: absolute; right: 8rpx; bottom: 8rpx; padding: 7rpx 14rpx; border-radius: 999rpx; color: #fff; background: #cf304b; font-size: 23rpx; font-weight: 900; }
.record-copy { flex: 1; min-width: 0; }
.feature-pill { height: 42rpx; display: flex; align-items: center; padding: 0 18rpx; border-radius: 999rpx; color: #fff; background: #06c968; font-size: 24rpx; font-weight: 900; }
.record-copy text, .record-copy small { display: block; margin-top: 13rpx; color: rgba(255,246,220,.58); font-size: 24rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); color: rgba(255,246,220,.62); font-size: 26rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
.more-btn { margin-top: 24rpx; }
</style>
