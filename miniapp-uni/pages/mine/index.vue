<template>
  <view class="page mine-page">
    <view class="profile-card">
      <view class="avatar">{{ user.name ? user.name.slice(0, 1) : '用' }}</view>
      <view class="profile-main">
        <view class="name">{{ user.displayName }}</view>
        <view class="muted">{{ user.company }}</view>
        <view class="role">{{ user.roleName }}</view>
      </view>
    </view>

    <view class="quota-panel">
      <view>
        <view class="muted">算力</view>
        <view class="quota-number">{{ user.quota }}</view>
      </view>
      <view>
        <view class="muted">门店</view>
        <view class="quota-number small">{{ user.merchantQuota }}</view>
      </view>
      <view>
        <view class="muted">存储</view>
        <view class="quota-number small">{{ user.storageUsedText }}/{{ user.storageLimitText }}</view>
      </view>
    </view>

    <view class="menu-list">
      <view class="menu-item" @click="activePanel = activePanel === 'quota' ? '' : 'quota'">
        <text>额度明细</text>
        <text class="menu-arrow">查看</text>
      </view>
      <view class="menu-item" @click="activePanel = activePanel === 'feedback' ? '' : 'feedback'">
        <text>问题反馈</text>
        <text class="menu-arrow">填写</text>
      </view>
      <view class="menu-item" @click="activePanel = activePanel === 'announcements' ? '' : 'announcements'">
        <text>公告</text>
        <text class="menu-arrow">查看</text>
      </view>
      <view class="menu-item" @click="contactService">
        <text>联系客服</text>
        <text class="menu-arrow">联系</text>
      </view>
      <view class="menu-item danger" @click="logout">
        <text>退出登录</text>
        <text class="menu-arrow">退出</text>
      </view>
    </view>

    <view v-if="activePanel === 'quota'" class="panel">
      <view class="panel-title">额度明细</view>
      <view v-for="item in quotaLogs" :key="item.id" class="quota-log">
        <view>
          <view class="log-type">{{ item.typeText }}</view>
          <view class="muted">{{ item.createdAt }}</view>
        </view>
        <view :class="['amount', item.amount > 0 ? 'plus' : 'minus']">{{ item.amount > 0 ? '+' : '' }}{{ item.amount }}</view>
      </view>
    </view>

    <view v-if="activePanel === 'feedback'" class="panel">
      <view class="panel-title">问题反馈</view>
      <input class="input" v-model="feedback.title" placeholder="反馈标题" />
      <textarea class="textarea" v-model="feedback.content" placeholder="问题描述" />
      <input class="input" v-model="feedback.contact" placeholder="联系方式" />
      <button class="primary-btn" @click="submitFeedback">提交反馈</button>
    </view>

    <view v-if="activePanel === 'announcements'" class="panel">
      <view class="panel-title">公告</view>
      <view v-for="item in announcements" :key="item.id" class="announcement">
        <view class="log-type">{{ item.title }}</view>
        <view class="muted">{{ item.createdAt }}</view>
        <view class="announcement-content">{{ item.content }}</view>
      </view>
    </view>
  </view>
</template>

<script>
import { getAnnouncements, getMockUser, getQuotaLogs } from '../../utils/mockStore.js';
import { mockLogout } from '../../utils/mockSession.js';

export default {
  data() {
    return {
      user: {},
      quotaLogs: [],
      announcements: [],
      activePanel: '',
      feedback: {
        title: '',
        content: '',
        contact: ''
      }
    };
  },
  onShow() {
    this.user = getMockUser();
    this.quotaLogs = getQuotaLogs();
    this.announcements = getAnnouncements();
  },
  methods: {
    submitFeedback() {
      if (!this.feedback.title || !this.feedback.content) {
        uni.showToast({ title: '请填写反馈内容', icon: 'none' });
        return;
      }
      this.feedback = { title: '', content: '', contact: '' };
      uni.showToast({ title: '已提交反馈', icon: 'success' });
    },
    contactService() {
      uni.showModal({
        title: '联系客服',
        content: '请联系勋港家具 AI 服务顾问：400-000-2026',
        showCancel: false
      });
    },
    logout() {
      mockLogout();
      uni.showToast({ title: '已退出', icon: 'success' });
    }
  }
};
</script>

<style>
.profile-card,
.quota-panel,
.menu-list,
.panel {
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 10rpx 28rpx rgba(23, 32, 51, 0.05);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 30rpx;
}

.avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: #1f6feb;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  font-weight: 900;
}

.profile-main {
  flex: 1;
}

.name {
  color: #172033;
  font-size: 34rpx;
  font-weight: 900;
}

.role {
  display: inline-flex;
  margin-top: 10rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #edf3ff;
  color: #1f6feb;
  font-size: 22rpx;
  font-weight: 800;
}

.quota-panel {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12rpx;
  margin-top: 22rpx;
  padding: 24rpx;
}

.quota-number {
  margin-top: 8rpx;
  color: #1f6feb;
  font-size: 40rpx;
  font-weight: 900;
}

.quota-number.small {
  font-size: 28rpx;
}

.menu-list {
  margin-top: 22rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  padding: 26rpx;
  border-bottom: 1rpx solid #edf1f7;
  color: #172033;
  font-size: 28rpx;
  font-weight: 800;
}

.menu-item:last-child {
  border-bottom: 0;
}

.menu-item.danger {
  color: #d4382f;
}

.menu-arrow {
  color: #748198;
  font-size: 24rpx;
}

.panel {
  margin-top: 22rpx;
  padding: 24rpx;
}

.panel-title {
  margin-bottom: 18rpx;
  color: #172033;
  font-size: 30rpx;
  font-weight: 900;
}

.quota-log,
.announcement {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #edf1f7;
}

.quota-log {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.log-type {
  color: #172033;
  font-size: 26rpx;
  font-weight: 800;
}

.amount {
  font-size: 28rpx;
  font-weight: 900;
}

.amount.plus {
  color: #16834a;
}

.amount.minus {
  color: #d4382f;
}

.announcement-content {
  margin-top: 10rpx;
  color: #526176;
  font-size: 25rpx;
  line-height: 1.6;
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 16rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  background: #f5f7fb;
  color: #172033;
  font-size: 26rpx;
}

.textarea {
  min-height: 150rpx;
}
</style>
