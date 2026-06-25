<template>
  <view class="app-topbar">
    <view class="topbar-inner">
      <view class="menu-btn" @click="$emit('menu')">
        <text></text>
        <text></text>
        <text></text>
      </view>
      <view class="brand-text">
        <view class="brand-title">{{ title || '勋港家具 AI' }}</view>
        <view v-if="subtitle" class="brand-subtitle">{{ subtitle }}</view>
      </view>
      <view class="topbar-right" @click="$emit('profile')">
        <view v-if="quota !== '' && quota !== null && quota !== undefined" class="quota-mini">{{ quota }} 算力</view>
        <view v-if="showAvatar" class="avatar-mini">{{ avatarText || '用' }}</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AppTopbar',
  props: {
    title: {
      type: String,
      default: '勋港家具 AI'
    },
    subtitle: {
      type: String,
      default: ''
    },
    quota: {
      type: [String, Number],
      default: ''
    },
    avatarText: {
      type: String,
      default: '用'
    },
    showAvatar: {
      type: Boolean,
      default: true
    }
  }
};
</script>

<style>
.app-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  margin: 0 -24rpx 20rpx;
  padding-top: var(--status-bar-height);
  background: rgba(8, 9, 12, 0.96);
  border-bottom: 1rpx solid rgba(242, 213, 140, 0.12);
  backdrop-filter: blur(16px);
}

.topbar-inner {
  height: 104rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 14rpx 24rpx;
  padding-right: 190rpx;
}

.menu-btn {
  width: 74rpx;
  height: 74rpx;
  flex: 0 0 74rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border: 1rpx solid rgba(242, 213, 140, 0.18);
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.035);
}

.menu-btn text {
  width: 30rpx;
  height: 3rpx;
  border-radius: 999rpx;
  background: #f3dc9a;
}

.brand-text {
  flex: 1;
  min-width: 0;
}

.brand-title,
.brand-subtitle {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-title {
  color: #fff4df;
  font-size: 32rpx;
  line-height: 1.12;
  font-weight: 900;
}

.brand-subtitle {
  margin-top: 4rpx;
  color: rgba(255, 244, 223, 0.55);
  font-size: 21rpx;
}

.topbar-right {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.quota-mini {
  max-width: 132rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(242, 213, 140, 0.12);
  color: #f3dc9a;
  font-size: 21rpx;
  font-weight: 900;
}

.avatar-mini {
  width: 62rpx;
  height: 62rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1rpx solid rgba(242, 213, 140, 0.22);
  background: linear-gradient(135deg, #f3da94, #c79b3b);
  color: #181207;
  font-size: 26rpx;
  font-weight: 900;
}
</style>
