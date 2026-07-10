<template>
  <view class="page quota-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" show-back back-url="/pages/mine/index" @profile="goMine" />

    <view class="page-head">
      <view class="page-head-main">
        <view class="page-icon"><app-icon name="wallet" tone="dark" :size="34" /></view>
        <view class="page-title-text">
          <text class="ui-strong">额度明细</text>
          <text>算力余额与真实流水</text>
        </view>
      </view>
    </view>

    <view class="summary-grid">
      <view class="summary-card current"><text>当前余额</text><text class="ui-strong">{{ summary.currentBalance ?? quotaText ?? '-' }}</text></view>
      <view class="summary-card income"><text>总收入</text><text class="ui-strong">+{{ summary.totalIncome || 0 }}</text></view>
      <view class="summary-card expense"><text>总支出</text><text class="ui-strong">{{ summary.totalExpense || 0 }}</text></view>
    </view>

    <view class="filter-card">
      <view class="search-box">
        <app-icon name="search" :size="28" />
        <input v-model="query.keyword" placeholder="搜索任务、用户或操作人" confirm-type="search" @confirm="reload" />
      </view>
      <picker :range="typeNames" :value="typeIndex" @change="changeType">
        <view class="picker-box">{{ typeNames[typeIndex] }}<text>⌄</text></view>
      </picker>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="log-list">
      <view v-for="item in items" :key="item.id" class="log-card">
        <view class="log-main">
          <view :class="['type-badge', signedAmount(item) >= 0 ? 'plus' : 'minus']">{{ item.typeLabel || merchantTypeText(item.type) }}</view>
          <text class="ui-strong" :class="signedAmount(item) >= 0 ? 'num-plus' : 'num-minus'">{{ signedAmount(item) >= 0 ? '+' : '' }}{{ signedAmount(item) }}</text>
        </view>
        <view class="log-meta">
          <text>变动后余额：{{ item.balanceAfter ?? '-' }}</text>
          <text>关联任务：{{ shortTaskId(item.related_task_id) }}</text>
          <text class="ui-small">{{ fmtTime(item.created_at || item.createdAt) }}</text>
        </view>
      </view>
    </view>

    <view v-if="!items.length && !loading" class="empty-card">暂无额度流水</view>
    <view v-if="loading" class="empty-card">正在读取额度流水...</view>
    <button v-if="canLoadMore" class="secondary-btn more-btn" @click="loadMore">查看更多记录</button>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getCurrentUser, getQuotaLogs } from '../../api/user.js';
import { requireLogin } from '../../utils/auth.js';
import { displayName, fmtTime, unwrapUser, userQuota } from '../../utils/model.js';

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      items: [],
      summary: {},
      loading: false,
      errorText: '',
      query: { keyword: '', type: '', pageSize: 10 },
      typeOptions: [
        { key: '', name: '全部类型' },
        { key: 'AI_GENERATE', name: 'AI生成' },
        { key: 'AUTO_RECHARGE', name: '自动充值' },
        { key: 'MANUAL_RECHARGE', name: '人工充值' }
      ],
      total: 0
    };
  },
  computed: {
    quotaText() { return userQuota(this.user); },
    topbarAvatar() { return displayName(this.user).slice(0, 1) || '勋'; },
    typeNames() { return this.typeOptions.map(item => item.name); },
    typeIndex() { return Math.max(0, this.typeOptions.findIndex(item => item.key === this.query.type)); },
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
        const payload = await getQuotaLogs(this.query, { showLoading: false });
        this.items = Array.isArray(payload?.items) ? payload.items : [];
        this.summary = payload?.summary || {};
        this.total = Number(payload?.total || this.items.length || 0);
      } catch (error) {
        this.errorText = error.message || '额度明细读取失败';
        this.items = [];
      } finally {
        this.loading = false;
      }
    },
    loadMore() {
      this.query.pageSize += 10;
      this.reload();
    },
    changeType(e) {
      const index = Number(e.detail.value) || 0;
      this.query.type = this.typeOptions[index]?.key || '';
      this.query.pageSize = 10;
      this.reload();
    },
    signedAmount(item = {}) {
      return Number(item.signedAmount ?? item.amount ?? 0);
    },
    merchantTypeText(type) {
      const map = { AI_COST: 'AI生成', AI_REFUND: 'AI退款', RECHARGE: '人工充值', MANUAL_ADJUST: '人工充值', REDEEM: '自动充值', ACCOUNT_DELETE_RECYCLE: '自动充值' };
      return map[type] || type || '其他记录';
    },
    shortTaskId(value) {
      return value ? String(value).slice(0, 18) : '-';
    },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style>
.summary-grid { display: grid; grid-template-columns: 1fr; gap: 16rpx; margin-bottom: 20rpx; }
.summary-card { min-height: 116rpx; padding: 22rpx; border-radius: 28rpx; background: var(--xg-bg-card); border: 1rpx solid rgba(var(--xg-color-primary-rgb), .12); }
.summary-card text { color: var(--xg-text-muted); font-size: 24rpx; }
.summary-card .ui-strong { display: block; margin-top: 8rpx; color: var(--xg-text-main); font-size: 44rpx; font-weight: 900; }
.summary-card.income .ui-strong { color: #61dfa1; }
.summary-card.expense .ui-strong { color: #ff897e; }
.filter-card { display: grid; gap: 14rpx; margin-bottom: 20rpx; }
.search-box, .picker-box { height: 78rpx; box-sizing: border-box; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: var(--xg-text-muted); }
.search-box input { flex: 1; color: var(--xg-text-main); font-size: 28rpx; }
.picker-box { justify-content: space-between; color: var(--xg-text-main); font-size: 28rpx; }
.log-list { display: grid; gap: 18rpx; }
.log-card { padding: 20rpx; border-radius: 24rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.1); }
.log-main { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.type-badge { height: 44rpx; display: inline-flex; align-items: center; padding: 0 18rpx; border-radius: 999rpx; font-size: 24rpx; font-weight: 900; }
.type-badge.plus { color: #102017; background: #65e3a5; }
.type-badge.minus { color: #fff; background: #cf304b; }
.log-main .ui-strong { font-size: 40rpx; font-weight: 900; }
.num-plus { color: #61dfa1; }
.num-minus { color: #ff897e; }
.log-meta { display: grid; gap: 8rpx; margin-top: 16rpx; color: var(--xg-text-muted); font-size: 24rpx; }
.log-meta .ui-small { color: var(--xg-text-muted); font-size: 22rpx; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); color: var(--xg-text-muted); font-size: 26rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
.more-btn { margin-top: 24rpx; }
</style>
