<template>
  <view class="page home-page">
    <app-topbar
      title="勋港家具 AI"
      subtitle="智能家具修图平台"
      :quota="loggedIn ? user.quota : ''"
      :avatar-text="topbarAvatar"
      @profile="goMine"
    />

    <view class="home-hero">
      <view class="hero-meta">勋港智能家具 AI 修图平台</view>
      <view class="hero-title">门店商品图处理工作台</view>
      <view class="hero-desc">上传家具原图，调用材质替换、场景融合、背景净化、摄影增强等能力，生成可沉淀到资源库的门店素材。</view>
      <view class="hero-actions">
        <button class="primary-btn hero-btn" @click="goWorkbench">进入工作台</button>
        <button class="secondary-btn hero-btn" @click="goTasks">查看历史</button>
      </view>
    </view>

    <view class="quota-card">
      <view>
        <view class="quota-label">当前可用算力</view>
        <view class="quota-value">{{ loggedIn ? user.quota : '-' }}</view>
      </view>
      <view class="quota-side">
        <view>{{ loggedIn ? user.company : '未登录' }}</view>
        <text>{{ quotaLine }}</text>
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
        <text>门店素材、系统素材、生成结果</text>
      </view>
    </view>

    <view class="section-title">
      <text>最近任务</text>
      <text class="link" @click="goTasks">查看全部</text>
    </view>
    <view class="task-list">
      <view v-for="task in recentTasks" :key="task.id" class="task-row">
        <view :class="['task-thumb', task.featureKey]"><view class="furniture-shape"></view></view>
        <view class="task-main">
          <view class="task-title">{{ task.title }}</view>
          <view class="muted">{{ task.featureName }} · {{ task.createdAt }}</view>
        </view>
        <view :class="['status-pill', task.status]">{{ task.statusText }}</view>
      </view>
      <view v-if="!recentTasks.length" class="empty-card">暂无任务，进入工作台创建第一条生成任务。</view>
    </view>
  </view>
</template>

<script>
import { getCurrentUser, getQuotaLogs } from '../../api/user.js';
import { getMockTasks, getMockUser } from '../../utils/mockStore.js';
import { isMockLoggedIn } from '../../utils/mockSession.js';
import { getToken, useMockApi } from '../../utils/request.js';
import { requireLogin } from '../../utils/auth.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';

const roleNameMap = {
  MERCHANT_OWNER: '门店负责人',
  MERCHANT_ADMIN: '门店管理员',
  STAFF: '门店员工',
  STORE_STAFF: '门店员工',
  INTERNAL_STAFF: '内部人员',
  TRIAL: '体验人员',
  SYSTEM_ADMIN: '平台管理员'
};

function normalizeUser(user = {}, quotaSummary = null) {
  return {
    ...user,
    company: user.companyName || user.company || '个人中心',
    roleName: roleNameMap[user.role] || user.roleName || user.role || '用户',
    quota: Number(quotaSummary?.currentBalance ?? user.quota ?? 0),
    merchantQuota: Number(user.merchantQuota ?? user.quota ?? 0)
  };
}

export default {
  components: { AppTopbar },
  data() {
    return { user: {}, recentTasks: [], loggedIn: false, errorText: '' };
  },
  computed: {
    quotaLine() {
      return this.loggedIn ? `${this.user.roleName} · 门店额度 ${this.user.merchantQuota}` : '登录后查看真实算力';
    },
    topbarAvatar() {
      const name = this.user.displayName || this.user.username || this.user.phone || '用';
      return String(name).slice(0, 1);
    }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
    this.recentTasks = getMockTasks().slice(0, 3);
  },
  methods: {
    async loadUser() {
      this.errorText = '';
      if (useMockApi()) {
        this.loggedIn = isMockLoggedIn();
        this.user = this.loggedIn ? getMockUser() : {};
        return;
      }
      this.loggedIn = Boolean(getToken());
      if (!this.loggedIn) { this.user = {}; return; }
      try {
        const [user, quotaData] = await Promise.all([
          getCurrentUser({ showLoading: false, showErrorToast: false }),
          getQuotaLogs({ page: 1, pageSize: 1 }, { showLoading: false, showErrorToast: false }).catch(() => null)
        ]);
        this.user = normalizeUser(user, quotaData?.summary || null);
      } catch (error) {
        this.errorText = error.message || '读取算力失败，请确认后端接口可用';
      }
    },
    goWorkbench() { uni.switchTab({ url: '/pages/workbench/index' }); },
    goTasks() { uni.switchTab({ url: '/pages/tasks/index' }); },
    goResources() { uni.switchTab({ url: '/pages/resources/index' }); },
    goMine() { uni.switchTab({ url: '/pages/mine/index' }); }
  }
};
</script>

<style>
.home-page { padding-bottom: 40rpx; }
.home-hero { padding: 36rpx 32rpx; border: 1rpx solid rgba(242, 213, 140, .18); border-radius: 28rpx; background: radial-gradient(circle at 86% -20%, rgba(242,213,140,.18), transparent 42%), linear-gradient(135deg, #171d25, #0b0d10); box-shadow: 0 26rpx 70rpx rgba(0,0,0,.34); }
.hero-meta { color: rgba(242,213,140,.78); font-size: 23rpx; font-weight: 900; }
.hero-title { margin-top: 16rpx; color: #fff4df; font-size: 42rpx; line-height: 1.2; font-weight: 1000; }
.hero-desc { margin-top: 18rpx; color: rgba(255,244,223,.62); font-size: 25rpx; line-height: 1.65; }
.hero-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 28rpx; }
.hero-btn { height: 78rpx; font-size: 27rpx; }
.quota-card { display: flex; justify-content: space-between; gap: 24rpx; margin-top: 22rpx; padding: 26rpx; border: 1rpx solid rgba(242,213,140,.12); border-radius: 24rpx; background: rgba(255,255,255,.04); }
.error-card { margin-top: 18rpx; padding: 18rpx 22rpx; border-radius: 18rpx; background: #3a2023; color: #ffb2b2; font-size: 25rpx; line-height: 1.5; }
.quota-label { color: rgba(255,244,223,.55); font-size: 23rpx; }
.quota-value { margin-top: 8rpx; color: #f0d68a; font-size: 52rpx; font-weight: 1000; }
.quota-side { flex: 1; text-align: right; color: #fff4df; font-size: 26rpx; font-weight: 900; }
.quota-side text { display: block; margin-top: 8rpx; color: rgba(255,244,223,.55); font-size: 22rpx; }
.entry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 22rpx; }
.entry-card { min-height: 154rpx; padding: 22rpx; border: 1rpx solid rgba(255,255,255,.1); border-radius: 22rpx; background: rgba(255,255,255,.04); }
.entry-card.primary { border-color: rgba(242,213,140,.34); background: rgba(242,213,140,.08); }
.entry-kicker { color: rgba(242,213,140,.72); font-size: 20rpx; font-weight: 900; }
.entry-title { margin-top: 10rpx; color: #fff4df; font-size: 30rpx; font-weight: 1000; }
.entry-card text { display: block; margin-top: 10rpx; color: rgba(255,244,223,.56); font-size: 22rpx; line-height: 1.35; }
.link { color: #f0d68a; font-size: 24rpx; }
.task-list { display: grid; gap: 14rpx; }
.task-row { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; border: 1rpx solid rgba(255,255,255,.09); border-radius: 20rpx; background: rgba(255,255,255,.035); }
.task-thumb { position: relative; width: 92rpx; height: 76rpx; flex: 0 0 92rpx; overflow: hidden; border-radius: 16rpx; border: 1rpx solid rgba(242,213,140,.14); background: linear-gradient(135deg,#222a33,#11161d); }
.furniture-shape { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; height: 17rpx; border-radius: 999rpx 999rpx 8rpx 8rpx; background: rgba(242,213,140,.26); }
.task-main { flex: 1; min-width: 0; }
.task-title { color: #fff4df; font-size: 27rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-pill { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 999rpx; color: #f0d68a; background: rgba(242,213,140,.12); font-size: 22rpx; font-weight: 900; }
.status-pill.failed { color: #ffb2b2; background: rgba(255,79,79,.13); }
.empty-card { padding: 26rpx; border: 1rpx dashed rgba(242,213,140,.18); border-radius: 20rpx; color: rgba(255,244,223,.55); font-size: 24rpx; text-align: center; }
</style>
