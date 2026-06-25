<template>
  <view class="page home-page">
    <app-topbar
      title="勋港家具 AI"
      subtitle="智能家具修图平台"
      :quota="loggedIn ? user.quota : ''"
      :avatar-text="topbarAvatar"
      @profile="goMine"
    />

    <view class="hero">
      <view class="hero-kicker">勋港智能家具 AI 修图平台</view>
      <view class="hero-title">家具图一键修好</view>
      <view class="hero-desc">商品图、主图、门店素材</view>
      <button class="primary-btn hero-button" @click="goWorkbench">进入工作台</button>
    </view>

    <view class="quota-card">
      <view>
        <view class="quota-label">当前可用算力</view>
        <view class="quota-value">{{ loggedIn ? user.quota : '-' }}</view>
      </view>
      <view class="quota-side">
        <view>{{ loggedIn ? user.company : '未登录' }}</view>
        <view class="muted">{{ quotaLine }}</view>
      </view>
    </view>
    <view v-if="errorText" class="error-card">{{ errorText }}</view>
    <button v-if="!loggedIn" class="secondary-btn login-btn" @click="goLogin">去登录</button>

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
import { getCurrentUser, getQuotaLogs } from '../../api/user.js';
import { getFeatureTypes, getMockTasks, getMockUser } from '../../utils/mockStore.js';
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
  components: {
    AppTopbar
  },
  data() {
    return {
      user: {},
      features: [],
      recentTasks: [],
      loggedIn: false,
      errorText: ''
    };
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
    this.features = getFeatureTypes();
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
      if (!this.loggedIn) {
        this.user = {};
        return;
      }
      try {
        const [user, quotaData] = await Promise.all([
          getCurrentUser({ showLoading: false, showErrorToast: false }),
          getQuotaLogs({ page: 1, pageSize: 1 }, { showLoading: false, showErrorToast: false }).catch(() => null)
        ]);
        this.user = normalizeUser(user, quotaData?.summary || null);
      } catch (error) {
        this.errorText = error.message || '读取算力失败，请确认后端已启动';
      }
    },
    goWorkbench() {
      uni.switchTab({ url: '/pages/workbench/index' });
    },
    goWorkbenchWithFeature(key) {
      uni.setStorageSync('miniapp_pending_feature_key', key);
      uni.switchTab({ url: '/pages/workbench/index' });
    },
    goTasks() {
      uni.switchTab({ url: '/pages/tasks/index' });
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/index' });
    },
    goMine() {
      uni.switchTab({ url: '/pages/mine/index' });
    }
  }
};
</script>

<style>
.home-page {
  padding-bottom: 40rpx;
}

.hero {
  padding: 36rpx 32rpx;
  border: 1rpx solid rgba(216, 184, 106, 0.28);
  border-radius: 26rpx;
  background: linear-gradient(135deg, #171d25, #0f141b);
  color: #edf2f7;
  box-shadow: 0 22rpx 52rpx rgba(0, 0, 0, 0.28);
}

.hero-kicker {
  font-size: 24rpx;
  color: #d8b86a;
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
  color: #b9c2cf;
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
  border: 1rpx solid #2b3442;
  border-radius: 22rpx;
  background: #151a21;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.2);
}

.error-card {
  margin-top: 18rpx;
  padding: 18rpx 22rpx;
  border-radius: 18rpx;
  background: #3a2023;
  color: #ffb2b2;
  font-size: 25rpx;
  line-height: 1.5;
}

.login-btn {
  margin-top: 18rpx;
}

.quota-label {
  color: #96a1ad;
  font-size: 24rpx;
}

.quota-value {
  margin-top: 8rpx;
  color: #f0d99b;
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
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
}

.feature-card {
  width: calc(50% - 9rpx);
  box-sizing: border-box;
  min-height: 128rpx;
  padding: 22rpx;
  border: 1rpx solid #2b3442;
  border-radius: 20rpx;
  background: #151a21;
  box-shadow: 0 12rpx 34rpx rgba(0, 0, 0, 0.18);
}

.feature-name {
  color: #edf2f7;
  font-size: 30rpx;
  font-weight: 900;
}

.feature-scene {
  margin-top: 14rpx;
  color: #d8b86a;
  font-size: 22rpx;
}

.link {
  color: #d8b86a;
  font-size: 24rpx;
  font-weight: 700;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 16rpx;
  padding: 18rpx;
  border: 1rpx solid #2b3442;
  border-radius: 20rpx;
  background: #151a21;
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
  border: 1rpx solid rgba(216, 184, 106, 0.16);
  background: #1b222c;
}

.furniture-shape {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  bottom: 18rpx;
  height: 26rpx;
  border-radius: 999rpx 999rpx 10rpx 10rpx;
  background: rgba(216, 184, 106, 0.26);
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-title {
  color: #edf2f7;
  font-size: 28rpx;
  font-weight: 800;
}

.status-pill {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 800;
  background: #2a3341;
  color: #d8b86a;
}

.status-pill.succeeded {
  background: #173326;
  color: #9af0b5;
}

.status-pill.failed {
  background: #3a2023;
  color: #ffb2b2;
}

.status-pill.running {
  background: #3c321b;
  color: #ffe3a4;
}
</style>
