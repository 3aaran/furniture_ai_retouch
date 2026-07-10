<template>
  <view class="page promotion-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" show-back back-url="/pages/mine/index" @profile="goMine" />

    <view class="invite-panel">
      <view class="page-head invite-head">
        <view class="page-head-main">
          <view class="page-icon"><app-icon name="ticket" tone="dark" :size="34" /></view>
          <view class="page-title-text">
            <text class="ui-strong">推广邀请</text>
            <text>邀请门店入驻后的收益记录</text>
          </view>
        </view>
      </view>

      <view class="metrics">
        <view class="metric"><text>邀请码</text><text class="ui-strong">{{ inviteCode || '-' }}</text></view>
        <view class="metric"><text>已邀请</text><text class="ui-strong">{{ summary.invitedCount || 0 }}</text></view>
        <view class="metric"><text>已通过</text><text class="ui-strong">{{ summary.approvedCount || 0 }}</text></view>
        <view class="metric"><text>累计收益</text><text class="ui-strong">{{ quotaText(summary.benefitQuota) }}</text></view>
      </view>

      <view class="link-card">
        <text>邀请链接</text>
        <text class="ui-strong">{{ inviteLink || '-' }}</text>
      </view>

      <view class="copy-actions">
        <button class="secondary-btn" @click="copyText(inviteCode, '邀请码')">复制邀请码</button>
        <button class="primary-btn" @click="copyText(inviteLink, '邀请链接')">复制邀请链接</button>
      </view>
    </view>

    <view class="filter-card">
      <view class="search-box">
        <app-icon name="search" :size="28" />
        <input v-model="query.keyword" placeholder="搜索门店、联系人、手机号、编号" confirm-type="search" @confirm="reload" />
      </view>
      <picker :range="statusNames" :value="statusIndex" @change="changeStatus">
        <view class="picker-box">{{ statusNames[statusIndex] }}<text>⌄</text></view>
      </picker>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="income-list">
      <view v-for="item in items" :key="item.id" class="income-card">
        <view class="income-head">
          <text class="ui-strong">{{ item.invitedMerchantName || item.companyName || '-' }}</text>
          <text>{{ item.settlementStatus || '未结算' }}</text>
        </view>
        <view class="income-grid">
          <view><text>充值额度</text><text class="ui-strong">{{ quotaText(item.rechargeQuota) }}</text></view>
          <view><text>分成比例</text><text class="ui-strong">{{ ratioText(item.shareRatio) }}</text></view>
          <view><text>收益</text><text class="ui-strong benefit">{{ quotaText(item.benefitQuota) }}</text></view>
          <view><text>产生时间</text><text class="ui-strong">{{ fmtTime(item.generatedAt) }}</text></view>
        </view>
      </view>
    </view>

    <view v-if="!items.length && !loading" class="empty-card">暂无邀请收益记录</view>
    <view v-if="loading" class="empty-card">正在读取推荐收益...</view>
    <button v-if="canLoadMore" class="secondary-btn more-btn" @click="loadMore">查看更多记录</button>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getCurrentUser, getPromotion } from '../../api/user.js';
import { requireLogin } from '../../utils/auth.js';
import { displayName, fmtTime, unwrapUser } from '../../utils/model.js';

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      items: [],
      summary: {},
      inviteCode: '',
      inviteLink: '',
      total: 0,
      loading: false,
      errorText: '',
      query: { keyword: '', status: '', pageSize: 10 },
      statusOptions: [
        { key: '', name: '全部状态' },
        { key: 'PENDING', name: '待审核' },
        { key: 'APPROVED', name: '已通过' },
        { key: 'REJECTED', name: '已驳回' }
      ]
    };
  },
  computed: {
    topbarAvatar() { return displayName(this.user).slice(0, 1) || '勋'; },
    statusNames() { return this.statusOptions.map(item => item.name); },
    statusIndex() { return Math.max(0, this.statusOptions.findIndex(item => item.key === this.query.status)); },
    canLoadMore() { return this.items.length > 0 && this.items.length < this.total; }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
    this.reload();
  },
  methods: {
    fmtTime,
    async loadUser() {
      try { this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {}; } catch (e) {}
    },
    async reload() {
      this.loading = true;
      this.errorText = '';
      try {
        const payload = await getPromotion(this.query, { showLoading: false });
        this.items = Array.isArray(payload?.items) ? payload.items : [];
        this.summary = payload?.summary || {};
        this.inviteCode = payload?.inviteCode || '';
        this.inviteLink = payload?.inviteLink || (this.inviteCode ? `https://www.xungang.xin/#/apply?invite=${encodeURIComponent(this.inviteCode)}` : '');
        this.total = Number(payload?.total || this.items.length || 0);
      } catch (error) {
        this.errorText = error.message || '推荐收益读取失败';
        this.items = [];
      } finally {
        this.loading = false;
      }
    },
    changeStatus(e) {
      const index = Number(e.detail.value) || 0;
      this.query.status = this.statusOptions[index]?.key || '';
      this.query.pageSize = 10;
      this.reload();
    },
    loadMore() {
      this.query.pageSize += 10;
      this.reload();
    },
    quotaText(value) {
      return `${Number(value || 0)} 算力`;
    },
    ratioText(value) {
      return `${Math.round(Number(value || 0) * 100)}%`;
    },
    copyText(text, label) {
      if (!text) return uni.showToast({ title: `${label}为空`, icon: 'none' });
      uni.setClipboardData({ data: text, success: () => uni.showToast({ title: `${label}已复制`, icon: 'success' }) });
    },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style>
.invite-panel { margin-top: 24rpx; padding: 24rpx; border-radius: 30rpx; background: linear-gradient(180deg, rgba(var(--xg-color-primary-rgb), .1), rgba(255,255,255,.035)); border: 1rpx solid rgba(var(--xg-color-primary-rgb), .18); }
.invite-head { margin-top: 0; }
.metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.metric, .link-card { padding: 18rpx; border-radius: 22rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.08); }
.metric text, .link-card text { color: var(--xg-text-muted); font-size: 22rpx; }
.metric .ui-strong { display: block; margin-top: 8rpx; color: var(--xg-text-main); font-size: 32rpx; font-weight: 900; }
.link-card { margin-top: 14rpx; }
.link-card .ui-strong { display: block; margin-top: 8rpx; color: var(--xg-color-primary); font-size: 22rpx; line-height: 1.45; word-break: break-all; }
.copy-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 18rpx; }
.filter-card { display: grid; gap: 14rpx; margin: 22rpx 0; }
.search-box, .picker-box { height: 78rpx; box-sizing: border-box; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: var(--xg-text-muted); }
.search-box input { flex: 1; color: var(--xg-text-main); font-size: 28rpx; }
.picker-box { justify-content: space-between; color: var(--xg-text-main); font-size: 28rpx; }
.income-list { display: grid; gap: 18rpx; }
.income-card { padding: 20rpx; border-radius: 24rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.1); }
.income-head { display: flex; justify-content: space-between; gap: 18rpx; align-items: center; margin-bottom: 16rpx; }
.income-head .ui-strong { min-width: 0; color: var(--xg-text-main); font-size: 30rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.income-head text { height: 42rpx; display: flex; align-items: center; padding: 0 16rpx; border-radius: 999rpx; background: rgba(var(--xg-color-primary-rgb), .16); color: var(--xg-color-primary); font-size: 22rpx; font-weight: 900; }
.income-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.income-grid view { padding: 14rpx; border-radius: 18rpx; background: rgba(255,255,255,.035); }
.income-grid text { color: var(--xg-text-muted); font-size: 22rpx; }
.income-grid .ui-strong { display: block; margin-top: 6rpx; color: var(--xg-text-main); font-size: 24rpx; }
.income-grid .ui-strong.benefit { color: #61dfa1; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); color: var(--xg-text-muted); font-size: 26rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
.more-btn { margin-top: 24rpx; }
</style>
