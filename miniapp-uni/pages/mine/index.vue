<template>
  <view class="page mine-page">
    <app-topbar title="" subtitle="" :quota="quotaText" :avatar-text="topbarAvatar" />

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="profile-card">
      <view class="avatar">{{ topbarAvatar }}</view>
      <view class="profile-main">
        <view class="profile-name">{{ displayNameText }}</view>
        <view class="muted">{{ roleLine }}</view>
        <view class="muted">{{ merchantName || '暂无门店' }}</view>
      </view>
    </view>

    <view class="stat-grid">
      <view class="stat-card"><text>当前算力</text><b>{{ quotaText || '-' }}</b></view>
      <view class="stat-card"><text>账号状态</text><b>{{ statusText }}</b></view>
    </view>

    <view class="panel-card">
      <view class="panel-title">账号信息</view>
      <view class="info-row"><text>账号</text><b>{{ user.username || user.phone || '-' }}</b></view>
      <view class="info-row"><text>手机号</text><b>{{ user.phone || '-' }}</b></view>
      <view class="info-row"><text>角色</text><b>{{ roleLine }}</b></view>
      <view class="info-row"><text>门店</text><b>{{ merchantName || '-' }}</b></view>
    </view>

    <view class="panel-card">
      <view class="panel-title">服务</view>
      <view class="service-grid">
        <view class="service-item" @click="goUsers"><app-icon name="users" :size="34" /><b>用户</b></view>
        <view class="service-item" @click="goQuota"><app-icon name="wallet" :size="34" /><b>额度</b></view>
        <view class="service-item" @click="goFeedback"><app-icon name="message" :size="34" /><b>反馈</b></view>
        <view class="service-item" @click="goAnnouncements"><app-icon name="mail" :size="34" /><b>公告</b></view>
      </view>
    </view>

    <button class="secondary-btn logout-btn" @click="logout">退出登录</button>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getCurrentUser } from '../../api/user.js';
import { clearLoginState, requireLogin } from '../../utils/auth.js';
import { displayName, roleText, unwrapUser, userQuota } from '../../utils/model.js';

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      errorText: ''
    };
  },
  computed: {
    displayNameText() { return displayName(this.user); },
    quotaText() { return userQuota(this.user); },
    topbarAvatar() { return this.displayNameText.slice(0, 1); },
    roleLine() { return roleText(this.user.role); },
    merchantName() { return this.user.companyName || this.user.company || this.user.merchantName || this.user.merchant?.name || ''; },
    statusText() {
      const map = { ACTIVE: '启用', DISABLED: '禁用', enabled: '启用', disabled: '禁用' };
      return map[this.user.status] || this.user.status || '-';
    }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
  },
  methods: {
    async loadUser() {
      this.errorText = '';
      try {
        this.user = unwrapUser(await getCurrentUser({ showLoading: false })) || {};
      } catch (error) {
        this.errorText = error.message || '账号信息读取失败';
      }
    },
    goUsers() { uni.navigateTo({ url: '/pages/users/index' }); },
    goQuota() { uni.navigateTo({ url: '/pages/quota/index' }); },
    goFeedback() { uni.navigateTo({ url: '/pages/feedback/index' }); },
    goAnnouncements() { uni.navigateTo({ url: '/pages/announcements/index' }); },
    logout() {
      clearLoginState();
      uni.reLaunch({ url: '/pages/login/index' });
    }
  }
};
</script>

<style>
.profile-card { display: flex; gap: 20rpx; align-items: center; padding: 24rpx; border-radius: 28rpx; background: #111317; border: 1rpx solid rgba(242,213,140,.14); }
.avatar { width: 104rpx; height: 104rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#f3da94,#c79b3b); color: #181207; font-size: 40rpx; font-weight: 900; }
.profile-main { flex: 1; min-width: 0; }
.profile-name { color: #fff4df; font-size: 34rpx; font-weight: 900; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin: 20rpx 0; }
.stat-card, .panel-card { padding: 22rpx; border-radius: 24rpx; background: #111317; border: 1rpx solid rgba(255,255,255,.08); }
.stat-card text { color: rgba(255,244,223,.55); font-size: 23rpx; }
.stat-card b { display: block; margin-top: 8rpx; color: #f3dc9a; font-size: 34rpx; }
.panel-card { margin-bottom: 18rpx; }
.panel-title { color: #fff4df; font-size: 30rpx; font-weight: 900; margin-bottom: 14rpx; }
.info-row { display: flex; justify-content: space-between; gap: 20rpx; padding: 16rpx 0; border-bottom: 1rpx solid rgba(255,255,255,.06); color: rgba(255,244,223,.62); font-size: 24rpx; }
.info-row:last-child { border-bottom: 0; }
.info-row b { color: #fff4df; text-align: right; font-weight: 700; }
.service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.service-item { min-height: 118rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; border-radius: 22rpx; color: #fff4df; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.08); }
.service-item .app-icon { color: #f3dc9a; }
.service-item b { font-size: 24rpx; }
.logout-btn { margin-top: 20rpx; }
.error-card { margin-bottom: 18rpx; padding: 18rpx; border-radius: 18rpx; background: rgba(255,112,112,.08); color: #ffb4a8; border: 1rpx solid rgba(255,112,112,.22); font-size: 24rpx; }
</style>
