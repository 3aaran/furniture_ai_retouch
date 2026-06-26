<template>
  <view class="page home-page">
    <app-topbar title="勋港家具 AI" subtitle="智能家具修图平台" :quota="quotaText" :avatar-text="topbarAvatar" @profile="goMine" />

    <view class="home-hero">
      <view class="hero-meta">勋港智能家具 AI 修图平台</view>
      <view class="hero-title">门店商品图处理工作台</view>
      <view class="hero-desc">上传家具原图，调用 Web 端一致的材质替换、场景融合、背景净化、摄影增强、线稿图、多角度视图等能力。</view>
      <view class="hero-actions">
        <button class="primary-btn hero-btn" @click="goWorkbench">进入工作台</button>
        <button class="secondary-btn hero-btn" @click="goTasks">查看历史</button>
      </view>
    </view>

    <view class="quota-card">
      <view>
        <view class="quota-label">当前可用算力</view>
        <view class="quota-value">{{ quotaText || '-' }}</view>
      </view>
      <view class="quota-side">
        <view>{{ merchantName || '账号信息' }}</view>
        <text>{{ roleLine }}</text>
      </view>
    </view>
    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="entry-grid">
      <view class="entry-card primary" @click="goWorkbench">
        <view class="entry-kicker">Workbench</view>
        <view class="entry-title">智能工作台</view>
        <text>上传图片、选择能力、提交生成</text>
      </view>
      <view class="entry-card" @click="goResources">
        <view class="entry-kicker">Assets</view>
        <view class="entry-title">资源库</view>
        <text>系统素材、门店素材、个人素材</text>
      </view>
    </view>

    <view class="section-title">
      <text>最近任务</text>
      <text class="link" @click="goTasks">查看全部</text>
    </view>
    <view class="task-list">
      <view v-for="task in recentTasks" :key="task.id" class="task-row">
        <view :class="['task-thumb', task.featureKey || 'task']"><text>{{ task.featureShort }}</text></view>
        <view class="task-main">
          <view class="task-title">{{ task.title }}</view>
          <view class="muted">{{ task.featureName }} · {{ task.createdAtText }}</view>
        </view>
        <view :class="['status-pill', task.statusClass]">{{ task.statusText }}</view>
      </view>
      <view v-if="!recentTasks.length && !loading" class="empty-card">暂无真实任务记录。</view>
      <view v-if="loading" class="empty-card">正在读取真实数据...</view>
    </view>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getCurrentUser } from '../../api/user.js';
import { getRecentAiTasks, getRecentImages } from '../../api/task.js';
import { getToken } from '../../utils/request.js';
import { requireLogin } from '../../utils/auth.js';
import { displayName, featureName, fmtTime, roleText, statusText, unwrapList, unwrapUser, userQuota } from '../../utils/model.js';

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      recentTasks: [],
      loading: false,
      errorText: ''
    };
  },
  computed: {
    quotaText() { return userQuota(this.user); },
    merchantName() { return this.user.companyName || this.user.company || this.user.merchantName || ''; },
    roleLine() { return `${roleText(this.user.role)} · ${displayName(this.user)}`; },
    topbarAvatar() { return displayName(this.user).slice(0, 1); }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadData();
  },
  methods: {
    async loadData() {
      if (!getToken()) return;
      this.loading = true;
      this.errorText = '';
      try {
        const me = await getCurrentUser({ showLoading: false, showErrorToast: false });
        this.user = unwrapUser(me) || {};
        const [tasksPayload, imagesPayload] = await Promise.all([
          getRecentAiTasks({ pageSize: 6 }, { showLoading: false, showErrorToast: false }).catch(() => null),
          getRecentImages({ pageSize: 6 }, { showLoading: false, showErrorToast: false }).catch(() => null)
        ]);
        const tasks = unwrapList(tasksPayload).map(this.normalizeTask);
        const images = unwrapList(imagesPayload).map(this.normalizeImageTask);
        this.recentTasks = [...tasks, ...images].sort((a, b) => new Date(b.rawTime || 0) - new Date(a.rawTime || 0)).slice(0, 6);
      } catch (error) {
        this.errorText = error.message || '首页数据读取失败';
      } finally {
        this.loading = false;
      }
    },
    normalizeTask(item = {}) {
      const key = item.featureKey || item.operation || item.type || '';
      return {
        id: item.id || item.taskId,
        title: item.title || item.name || `任务 ${item.id || item.taskId || ''}`,
        featureName: featureName(key, item.featureName || item.operationName),
        featureShort: featureName(key, item.featureName || item.operationName).slice(0, 2),
        featureKey: key,
        statusText: statusText(item.status),
        statusClass: String(item.status || '').toLowerCase(),
        createdAtText: fmtTime(item.createdAt || item.created_at),
        rawTime: item.createdAt || item.created_at
      };
    },
    normalizeImageTask(item = {}) {
      const key = item.featureKey || item.operation || item.kind || '';
      return {
        id: item.id,
        title: item.originalName || item.name || `图片 ${item.id || ''}`,
        featureName: featureName(key, item.operationName || item.kindName || '生成图片'),
        featureShort: featureName(key, item.operationName || '图片').slice(0, 2),
        featureKey: key,
        statusText: statusText(item.status || 'success'),
        statusClass: String(item.status || 'success').toLowerCase(),
        createdAtText: fmtTime(item.createdAt || item.created_at),
        rawTime: item.createdAt || item.created_at
      };
    },
    goWorkbench() { uni.reLaunch({ url: '/pages/workbench/index' }); },
    goTasks() { uni.reLaunch({ url: '/pages/tasks/index' }); },
    goResources() { uni.reLaunch({ url: '/pages/resources/index' }); },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style>
.home-hero { padding: 30rpx 24rpx; border-radius: 32rpx; background: linear-gradient(135deg, rgba(242,213,140,.16), rgba(255,255,255,.035)); border: 1rpx solid rgba(242,213,140,.16); }
.hero-meta { color: #d9bb6a; font-size: 23rpx; font-weight: 800; }
.hero-title { margin-top: 12rpx; color: #fff4df; font-size: 44rpx; font-weight: 900; }
.hero-desc { margin-top: 12rpx; color: rgba(255,244,223,.62); font-size: 25rpx; line-height: 1.65; }
.hero-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 26rpx; }
.quota-card { display: flex; justify-content: space-between; align-items: center; margin-top: 24rpx; padding: 24rpx; border-radius: 26rpx; background: #111317; border: 1rpx solid rgba(255,255,255,.1); }
.quota-label { color: rgba(255,244,223,.56); font-size: 23rpx; }
.quota-value { color: #f3dc9a; font-size: 52rpx; font-weight: 900; }
.quota-side { max-width: 360rpx; text-align: right; color: #fff4df; font-size: 25rpx; }
.quota-side text { display: block; margin-top: 6rpx; color: rgba(255,244,223,.55); font-size: 22rpx; }
.entry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 24rpx; }
.entry-card { padding: 22rpx; border-radius: 24rpx; background: #111317; border: 1rpx solid rgba(255,255,255,.1); }
.entry-card.primary { border-color: rgba(242,213,140,.28); background: rgba(242,213,140,.08); }
.entry-kicker { color: #d9bb6a; font-size: 22rpx; font-weight: 900; }
.entry-title { margin: 8rpx 0; color: #fff4df; font-size: 30rpx; font-weight: 900; }
.entry-card text { color: rgba(255,244,223,.56); font-size: 23rpx; }
.task-row { display: flex; align-items: center; gap: 16rpx; padding: 18rpx; border-radius: 22rpx; margin-bottom: 14rpx; background: #111317; border: 1rpx solid rgba(255,255,255,.08); }
.task-thumb { width: 80rpx; height: 80rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; background: rgba(242,213,140,.12); color: #f3dc9a; font-size: 22rpx; font-weight: 900; }
.task-main { flex: 1; min-width: 0; }
.task-title { color: #fff4df; font-size: 27rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-pill { padding: 8rpx 14rpx; border-radius: 999rpx; background: rgba(255,255,255,.08); color: #e8dcc2; font-size: 22rpx; }
.status-pill.success, .status-pill.completed { color: #99e0b4; background: rgba(82,204,127,.12); }
.status-pill.running, .status-pill.processing { color: #f3dc9a; background: rgba(242,213,140,.12); }
.status-pill.failed, .status-pill.error { color: #ffaaa0; background: rgba(255,112,112,.12); }
.empty-card, .error-card { padding: 22rpx; border-radius: 20rpx; background: rgba(255,255,255,.04); color: rgba(255,244,223,.6); font-size: 24rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { margin-top: 18rpx; color: #ffb4a8; border-color: rgba(255,112,112,.22); }
.link { color: #f3dc9a; font-size: 24rpx; }
</style>
