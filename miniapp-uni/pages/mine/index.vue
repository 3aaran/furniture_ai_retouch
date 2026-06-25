<template>
  <view class="page mine-page">
    <app-topbar
      title="勋港家具 AI"
      subtitle="我的"
      :quota="topbarQuota"
      :avatar-text="topbarAvatar"
      @profile="togglePanel('profile')"
    />

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view v-if="!loggedIn" class="login-empty">
      <view class="empty-title">未登录</view>
      <view class="muted">登录后查看账号和算力</view>
      <button class="primary-btn login-btn" @click="goLogin">去登录</button>
    </view>

    <block v-else>
    <view class="profile-card">
      <view class="avatar">{{ user.name ? user.name.slice(0, 1) : '用' }}</view>
      <view class="profile-main">
        <view class="name">{{ user.displayName }}</view>
        <view class="muted">{{ user.companyName || user.company }}</view>
        <view class="role-row">
          <text>{{ user.roleName }}</text>
          <text>{{ user.status === 'ACTIVE' ? '正常' : '停用' }}</text>
        </view>
      </view>
    </view>

    <view class="metric-grid">
      <view>
        <text>算力</text>
        <b>{{ user.quota }}</b>
      </view>
      <view>
        <text>门店</text>
        <b>{{ user.merchantQuota }}</b>
      </view>
      <view>
        <text>存储</text>
        <b>{{ user.storageUsedText }}</b>
      </view>
    </view>

    <view class="storage-card">
      <view class="storage-head">
        <text>图片存储</text>
        <text>{{ user.storageUsedText }}/{{ user.storageLimitText }}</text>
      </view>
      <view class="storage-bar"><view :style="{ width: (user.storagePercent || 0) + '%' }"></view></view>
      <view class="muted">剩余 {{ user.storageRemainingText }}</view>
    </view>

    <view class="menu-list">
      <view class="menu-item" @click="togglePanel('profile')">
        <text>个人中心</text>
        <text>{{ user.phone }}</text>
      </view>
      <view class="menu-item" @click="togglePanel('quota')">
        <text>额度明细</text>
        <text>查看</text>
      </view>
      <view class="menu-item" @click="togglePanel('redeem')">
        <text>礼品卡兑换</text>
        <text>兑换</text>
      </view>
      <view class="menu-item" @click="togglePanel('feedback')">
        <text>问题反馈</text>
        <text>填写</text>
      </view>
      <view class="menu-item" @click="togglePanel('announcements')">
        <text>公告邮箱</text>
        <text>{{ unreadCount }} 未读</text>
      </view>
      <view v-if="user.role === 'MERCHANT_ADMIN' || user.role === 'MERCHANT_OWNER'" class="menu-item" @click="togglePanel('promotion')">
        <text>推荐收益</text>
        <text>{{ promotion.summary.benefitQuota }} 算力</text>
      </view>
      <view class="menu-item" @click="contactService">
        <text>联系客服</text>
        <text>联系</text>
      </view>
      <view class="menu-item danger" @click="logout">
        <text>退出登录</text>
        <text>退出</text>
      </view>
    </view>

    <view v-if="activePanel === 'profile'" class="panel">
      <view class="panel-title">个人中心</view>
      <view class="info-row"><text>账号</text><b>{{ user.phone || user.username }}</b></view>
      <view class="info-row"><text>角色</text><b>{{ user.roleName }}</b></view>
      <view class="info-row"><text>门店</text><b>{{ user.companyName || user.company }}</b></view>
      <input class="input" v-model="profileForm.displayName" placeholder="显示名称" />
      <button class="primary-btn" @click="saveProfile">保存资料</button>
      <button class="secondary-btn panel-btn" @click="mockPassword">修改密码</button>
    </view>

    <view v-if="activePanel === 'quota'" class="panel">
      <view class="panel-title">额度明细</view>
      <view class="quota-summary">
        <view><text>余额</text><b>{{ quotaSummary.currentBalance }}</b></view>
        <view><text>收入</text><b>+{{ quotaSummary.totalIncome }}</b></view>
        <view><text>支出</text><b>{{ quotaSummary.totalExpense }}</b></view>
      </view>
      <scroll-view scroll-x class="filter-scroll">
        <view
          v-for="item in quotaFilters"
          :key="item.key"
          :class="['filter-chip', quotaType === item.key ? 'active' : '']"
          @click="quotaType = item.key"
        >
          {{ item.label }}
        </view>
      </scroll-view>
      <view v-for="item in filteredQuotaLogs" :key="item.id" class="quota-log">
        <view>
          <view class="log-type">{{ item.typeText }}</view>
          <view class="muted">{{ item.createdAt }}</view>
          <view v-if="item.relatedTaskId" class="related">任务 {{ item.relatedTaskId }}</view>
        </view>
        <view :class="['amount', item.amount > 0 ? 'plus' : 'minus']">{{ item.amount > 0 ? '+' : '' }}{{ item.amount }}</view>
      </view>
    </view>

    <view v-if="activePanel === 'redeem'" class="panel">
      <view class="panel-title">礼品卡兑换</view>
      <input class="input" v-model="redeemCode" placeholder="输入兑换码" />
      <button class="primary-btn" @click="submitRedeem">确认兑换</button>
    </view>

    <view v-if="activePanel === 'feedback'" class="panel">
      <view class="panel-title">问题反馈</view>
      <input class="input" v-model="feedback.title" placeholder="反馈标题" />
      <input class="input" v-model="feedback.contact" placeholder="联系方式" />
      <textarea class="textarea" v-model="feedback.content" placeholder="反馈内容" />
      <button class="primary-btn" @click="submitFeedback">提交反馈</button>
    </view>

    <view v-if="activePanel === 'announcements'" class="panel">
      <view class="panel-title">公告邮箱</view>
      <view v-for="item in announcements" :key="item.id" class="announcement">
        <view class="announcement-head">
          <view class="log-type">{{ item.title }}</view>
          <text v-if="item.unread">未读</text>
        </view>
        <view class="muted">{{ item.createdAt }}</view>
        <view class="announcement-content">{{ item.content }}</view>
      </view>
    </view>

    <view v-if="activePanel === 'promotion'" class="panel">
      <view class="panel-title">推荐收益</view>
      <view class="invite-card">
        <view><text>邀请码</text><b>{{ promotion.inviteCode }}</b></view>
        <button class="secondary-btn copy-btn" @click="copyInvite">复制</button>
      </view>
      <view class="quota-summary">
        <view><text>邀请</text><b>{{ promotion.summary.invitedCount }}</b></view>
        <view><text>通过</text><b>{{ promotion.summary.approvedCount }}</b></view>
        <view><text>收益</text><b>{{ promotion.summary.benefitQuota }}</b></view>
      </view>
      <view v-for="item in promotionRecords" :key="item.id" class="quota-log">
        <view>
          <view class="log-type">{{ item.invitedMerchantName }}</view>
          <view class="muted">{{ item.generatedAt }} · {{ item.settlementStatus }}</view>
        </view>
        <view class="amount plus">+{{ item.benefitQuota }}</view>
      </view>
    </view>
    </block>
  </view>
</template>

<script>
import {
  getAnnouncements as getMockAnnouncements,
  getMockUser,
  getPromotionInfo as getMockPromotionInfo,
  getPromotionRecords as getMockPromotionRecords,
  getQuotaLogs as getMockQuotaLogs,
  getQuotaSummary as getMockQuotaSummary
} from '../../utils/mockStore.js';
import { getCurrentUser, getQuotaLogs, getStorageSummary } from '../../api/user.js';
import { isMockLoggedIn, mockLogout } from '../../utils/mockSession.js';
import { clearToken, getToken, setUseMockApi, useMockApi } from '../../utils/request.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';

const roleNameMap = {
  SYSTEM_ADMIN: '平台管理员',
  MERCHANT_OWNER: '门店负责人',
  MERCHANT_ADMIN: '门店管理员',
  STAFF: '门店员工',
  STORE_STAFF: '门店员工',
  INTERNAL_STAFF: '内部人员',
  TRIAL: '体验人员'
};

function bytesText(value) {
  const n = Number(value || 0);
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(1)}GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}

function normalizeUser(user = {}, storage = null) {
  const limit = Number(storage?.limitBytes ?? user.storageLimitBytes ?? 0);
  const used = Number(storage?.usedBytes ?? user.storageUsedBytes ?? 0);
  const remaining = Number(storage?.remainingBytes ?? user.storageRemainingBytes ?? Math.max(0, limit - used));
  const percent = storage?.percent ?? (limit ? Math.round((used / limit) * 100) : 0);
  return {
    ...user,
    name: user.displayName || user.username || user.phone || '用户',
    displayName: user.displayName || user.username || user.phone || '用户',
    roleName: roleNameMap[user.role] || user.roleName || user.role || '用户',
    company: user.companyName || user.company || '个人中心',
    companyName: user.companyName || user.company || '个人中心',
    quota: Number(user.quota || 0),
    merchantQuota: Number(user.merchantQuota || user.quota || 0),
    storageUsedText: storage?.usedText || bytesText(used),
    storageLimitText: storage?.limitText || bytesText(limit),
    storageRemainingText: storage?.remainingText || bytesText(remaining),
    storagePercent: Math.max(0, Math.min(100, Number(percent || 0)))
  };
}

function normalizeQuotaLog(item = {}) {
  const label = item.typeLabel || item.typeText || item.type || '额度记录';
  const mappedType = label === 'AI生成'
    ? 'AI_GENERATE'
    : label === '自动充值'
      ? 'AUTO_RECHARGE'
      : label === '人工充值'
        ? 'MANUAL_RECHARGE'
        : item.type;
  return {
    id: item.id,
    type: mappedType,
    typeText: label,
    amount: Number(item.signedAmount ?? item.amount ?? 0),
    balanceAfter: Number(item.balanceAfter ?? item.balance_after ?? 0),
    relatedTaskId: item.relatedTaskId || item.related_task_id || '',
    createdAt: item.createdAt || item.created_at || ''
  };
}

export default {
  components: {
    AppTopbar
  },
  data() {
    return {
      user: {},
      quotaSummary: {},
      quotaLogs: [],
      announcements: [],
      promotion: { summary: {} },
      promotionRecords: [],
      activePanel: '',
      loggedIn: false,
      useMock: false,
      errorText: '',
      loadingUser: false,
      quotaType: 'all',
      redeemCode: '',
      profileForm: {
        displayName: ''
      },
      feedback: {
        title: '',
        content: '',
        contact: ''
      },
      quotaFilters: [
        { key: 'all', label: '全部' },
        { key: 'AI_GENERATE', label: 'AI生成' },
        { key: 'AUTO_RECHARGE', label: '自动充值' },
        { key: 'MANUAL_RECHARGE', label: '人工充值' }
      ]
    };
  },
  computed: {
    topbarQuota() {
      return this.loggedIn && this.user && this.user.quota !== undefined ? this.user.quota : '';
    },
    topbarAvatar() {
      const name = this.user.displayName || this.user.username || this.user.phone || '用';
      return String(name).slice(0, 1);
    },
    unreadCount() {
      return this.announcements.filter((item) => item.unread).length;
    },
    filteredQuotaLogs() {
      if (this.quotaType === 'all') return this.quotaLogs;
      return this.quotaLogs.filter((item) => item.type === this.quotaType);
    }
  },
  onShow() {
    this.loadAccount();
  },
  methods: {
    async loadAccount() {
      this.useMock = useMockApi();
      this.errorText = '';
      this.announcements = getMockAnnouncements();
      this.promotion = getMockPromotionInfo();
      this.promotionRecords = getMockPromotionRecords();

      if (this.useMock) {
        this.loggedIn = isMockLoggedIn();
        if (!this.loggedIn) return;
        this.user = getMockUser();
        this.profileForm.displayName = this.user.displayName;
        this.quotaSummary = getMockQuotaSummary();
        this.quotaLogs = getMockQuotaLogs();
        return;
      }

      this.loggedIn = Boolean(getToken());
      if (!this.loggedIn) return;
      this.loadingUser = true;
      try {
        const [user, storage, quotaData] = await Promise.all([
          getCurrentUser({ showErrorToast: false }),
          getStorageSummary({ showErrorToast: false }).catch(() => null),
          getQuotaLogs({ page: 1, pageSize: 10 }, { showErrorToast: false }).catch(() => null)
        ]);
        this.user = normalizeUser(user, storage);
        this.profileForm.displayName = this.user.displayName;
        this.quotaSummary = quotaData?.summary || {
          currentBalance: this.user.quota,
          totalIncome: 0,
          totalExpense: 0
        };
        this.quotaLogs = Array.isArray(quotaData?.items) ? quotaData.items.map(normalizeQuotaLog) : [];
      } catch (error) {
        this.errorText = error.message || '读取用户信息失败，请确认后端已启动';
        if (error.statusCode === 401) this.loggedIn = false;
      } finally {
        this.loadingUser = false;
      }
    },
    toggleMock(event) {
      this.useMock = Boolean(event.detail.value);
      setUseMockApi(this.useMock);
      clearToken();
      mockLogout();
      this.activePanel = '';
      this.loadAccount();
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    togglePanel(key) {
      this.activePanel = this.activePanel === key ? '' : key;
    },
    saveProfile() {
      this.user.displayName = this.profileForm.displayName || this.user.displayName;
      uni.showToast({ title: '已保存', icon: 'success' });
    },
    mockPassword() {
      uni.showModal({
        title: '修改密码',
        content: '验证码修改密码将在接入真实接口后启用。',
        showCancel: false
      });
    },
    submitRedeem() {
      if (!this.redeemCode) {
        uni.showToast({ title: '请输入兑换码', icon: 'none' });
        return;
      }
      this.redeemCode = '';
      uni.showToast({ title: '已兑换', icon: 'success' });
    },
    submitFeedback() {
      if (!this.feedback.title || !this.feedback.content) {
        uni.showToast({ title: '请填写反馈', icon: 'none' });
        return;
      }
      this.feedback = { title: '', content: '', contact: '' };
      uni.showToast({ title: '已提交', icon: 'success' });
    },
    copyInvite() {
      uni.setClipboardData({
        data: this.promotion.inviteLink || this.promotion.inviteCode,
        success: () => uni.showToast({ title: '已复制', icon: 'success' })
      });
    },
    contactService() {
      uni.showModal({
        title: '联系客服',
        content: '服务顾问：400-000-2026',
        showCancel: false
      });
    },
    logout() {
      clearToken();
      mockLogout();
      this.loggedIn = false;
      this.activePanel = '';
      uni.showToast({ title: '已退出', icon: 'success' });
    }
  }
};
</script>

<style>
.profile-card,
.metric-grid,
.storage-card,
.menu-list,
.panel,
.mode-row,
.login-empty,
.error-card {
  border: 1rpx solid rgba(242, 213, 140, 0.11);
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 18rpx 52rpx rgba(0, 0, 0, 0.24);
}

.mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 22rpx 26rpx;
  color: #fff5dc;
  font-size: 27rpx;
  font-weight: 800;
}

.error-card {
  margin-bottom: 20rpx;
  padding: 18rpx 22rpx;
  background: rgba(150, 55, 55, 0.22);
  color: #ffb2b2;
  font-size: 25rpx;
  line-height: 1.5;
}

.login-empty {
  padding: 44rpx 28rpx;
}

.empty-title {
  color: #fff5dc;
  font-size: 36rpx;
  font-weight: 900;
}

.login-btn {
  margin-top: 24rpx;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 28rpx;
}

.avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3da94, #c79b3b);
  color: #181207;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  font-weight: 900;
}

.profile-main {
  flex: 1;
  min-width: 0;
}

.name {
  color: #fff5dc;
  font-size: 34rpx;
  font-weight: 900;
}

.role-row {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin-top: 10rpx;
}

.role-row text {
  padding: 7rpx 13rpx;
  border-radius: 999rpx;
  background: rgba(242, 213, 140, 0.12);
  color: #f3dc9a;
  font-size: 22rpx;
  font-weight: 800;
}

.metric-grid,
.quota-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.metric-grid view,
.quota-summary view {
  flex: 1;
  min-width: 180rpx;
}

.metric-grid {
  margin-top: 20rpx;
  padding: 22rpx;
}

.metric-grid text,
.quota-summary text,
.invite-card text {
  display: block;
  color: rgba(255, 244, 223, 0.58);
  font-size: 22rpx;
}

.metric-grid b,
.quota-summary b,
.invite-card b {
  display: block;
  margin-top: 6rpx;
  color: #f3dc9a;
  font-size: 30rpx;
  font-weight: 900;
}

.storage-card {
  margin-top: 20rpx;
  padding: 22rpx;
}

.storage-head {
  display: flex;
  justify-content: space-between;
  color: #fff5dc;
  font-size: 26rpx;
  font-weight: 900;
}

.storage-bar {
  height: 12rpx;
  margin: 16rpx 0 10rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.08);
}

.storage-bar view {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #f3da94, #c79b3b);
}

.menu-list {
  margin-top: 20rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 25rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.08);
  color: #fff5dc;
  font-size: 27rpx;
  font-weight: 800;
}

.menu-item text:last-child {
  color: rgba(255, 244, 223, 0.56);
  font-size: 24rpx;
  font-weight: 700;
}

.menu-item:last-child {
  border-bottom: 0;
}

.menu-item.danger,
.menu-item.danger text:last-child {
  color: #ff9f9f;
}

.panel {
  margin-top: 20rpx;
  padding: 24rpx;
}

.panel-title {
  margin-bottom: 18rpx;
  color: #fff5dc;
  font-size: 30rpx;
  font-weight: 900;
}

.info-row,
.quota-log,
.announcement {
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.08);
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.info-row text {
  color: rgba(255, 244, 223, 0.58);
  font-size: 24rpx;
}

.info-row b {
  color: #fff5dc;
  font-size: 25rpx;
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 16rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.22);
  color: #f5f0e6;
  font-size: 26rpx;
}

.textarea {
  min-height: 140rpx;
}

.panel-btn {
  margin-top: 14rpx;
}

.filter-scroll {
  width: 100%;
  margin: 18rpx 0 4rpx;
  white-space: nowrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120rpx;
  height: 56rpx;
  margin-right: 10rpx;
  padding: 0 18rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.04);
  color: #cfc8b8;
  font-size: 23rpx;
  font-weight: 800;
}

.filter-chip.active {
  border-color: transparent;
  background: linear-gradient(135deg, #f3da94, #c79b3b);
  color: #181207;
}

.quota-log {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.log-type {
  color: #fff5dc;
  font-size: 26rpx;
  font-weight: 800;
}

.related {
  margin-top: 6rpx;
  color: #f3dc9a;
  font-size: 22rpx;
}

.amount {
  font-size: 28rpx;
  font-weight: 900;
}

.amount.plus {
  color: #9af0b5;
}

.amount.minus {
  color: #ffb2b2;
}

.announcement-head {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.announcement-head text {
  color: #ffb2b2;
  font-size: 22rpx;
}

.announcement-content {
  margin-top: 10rpx;
  color: rgba(255, 244, 223, 0.66);
  font-size: 25rpx;
  line-height: 1.6;
}

.invite-card {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 18rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.045);
}

.copy-btn {
  width: 120rpx;
  height: 58rpx;
  font-size: 24rpx;
}
</style>
