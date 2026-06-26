<template>
  <view class="page promotion-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" show-back back-url="/pages/mine/index" @profile="goMine" />

    <view class="invite-panel">
      <view class="panel-head">
        <view>
          <b>推广邀请</b>
          <text>邀请门店入驻后的收益记录</text>
        </view>
      </view>

      <view class="metrics">
        <view class="metric"><text>邀请码</text><b>{{ inviteCode || '-' }}</b></view>
        <view class="metric"><text>已邀请门店</text><b>{{ summary.invitedCount || 0 }}</b></view>
        <view class="metric"><text>已通过门店</text><b>{{ summary.approvedCount || 0 }}</b></view>
        <view class="metric"><text>累计邀请收益</text><b>{{ quotaText(summary.benefitQuota) }}</b></view>
      </view>

      <view class="link-card">
        <text>邀请链接</text>
        <b>{{ inviteLink || '-' }}</b>
      </view>

      <view class="copy-actions">
        <button class="secondary-btn" @click="copyText(inviteCode, '邀请码')">复制邀请码</button>
        <button class="primary-btn" @click="copyText(inviteLink, '邀请链接')">复制邀请链接</button>
      </view>
    </view>

    <view class="filter-card">
      <view class="search-box">
        <text>⌕</text>
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
          <b>{{ item.invitedMerchantName || item.companyName || '-' }}</b>
          <text>{{ item.settlementStatus || '未结算' }}</text>
        </view>
        <view class="income-grid">
          <view><text>充值额度</text><b>{{ quotaText(item.rechargeQuota) }}</b></view>
          <view><text>分成比例</text><b>{{ ratioText(item.shareRatio) }}</b></view>
          <view><text>收益</text><b class="benefit">{{ quotaText(item.benefitQuota) }}</b></view>
          <view><text>产生时间</text><b>{{ fmtTime(item.generatedAt) }}</b></view>
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
.invite-panel { margin-top: 24rpx; padding: 24rpx; border-radius: 30rpx; background: linear-gradient(180deg, rgba(242,213,140,.1), rgba(255,255,255,.035)); border: 1rpx solid rgba(242,213,140,.18); }
.panel-head { margin-bottom: 18rpx; }
.panel-head b { display: block; color: #fff6dc; font-size: 38rpx; font-weight: 900; }
.panel-head text { display: block; margin-top: 6rpx; color: rgba(255,246,220,.58); font-size: 24rpx; }
.metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.metric, .link-card { padding: 18rpx; border-radius: 22rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.08); }
.metric text, .link-card text { color: rgba(255,246,220,.55); font-size: 22rpx; }
.metric b { display: block; margin-top: 8rpx; color: #fff6dc; font-size: 32rpx; font-weight: 900; }
.link-card { margin-top: 14rpx; }
.link-card b { display: block; margin-top: 8rpx; color: #efd482; font-size: 22rpx; line-height: 1.45; word-break: break-all; }
.copy-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 18rpx; }
.filter-card { display: grid; gap: 14rpx; margin: 22rpx 0; }
.search-box, .picker-box { height: 78rpx; box-sizing: border-box; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: rgba(255,246,220,.7); }
.search-box input { flex: 1; color: #fff6dc; font-size: 28rpx; }
.picker-box { justify-content: space-between; color: #fff6dc; font-size: 28rpx; }
.income-list { display: grid; gap: 18rpx; }
.income-card { padding: 20rpx; border-radius: 24rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.1); }
.income-head { display: flex; justify-content: space-between; gap: 18rpx; align-items: center; margin-bottom: 16rpx; }
.income-head b { min-width: 0; color: #fff6dc; font-size: 30rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.income-head text { height: 42rpx; display: flex; align-items: center; padding: 0 16rpx; border-radius: 999rpx; background: rgba(242,213,140,.16); color: #efd482; font-size: 22rpx; font-weight: 900; }
.income-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.income-grid view { padding: 14rpx; border-radius: 18rpx; background: rgba(255,255,255,.035); }
.income-grid text { color: rgba(255,246,220,.5); font-size: 22rpx; }
.income-grid b { display: block; margin-top: 6rpx; color: #fff6dc; font-size: 24rpx; }
.income-grid b.benefit { color: #61dfa1; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); color: rgba(255,246,220,.62); font-size: 26rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
.more-btn { margin-top: 24rpx; }
</style>
