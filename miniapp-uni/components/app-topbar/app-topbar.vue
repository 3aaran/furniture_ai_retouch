<template>
  <view class="topbar-wrap">
    <view class="topbar">
      <view v-if="showBack" class="back-button" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view v-else class="menu-button" @click="openMenu">
        <text class="menu-line menu-line-long"></text>
        <text class="menu-line"></text>
        <text class="menu-line menu-line-long"></text>
      </view>
      <view class="topbar-title-box">
        <text v-if="title" class="topbar-title">{{ title }}</text>
        <text v-if="subtitle" class="topbar-subtitle">{{ subtitle }}</text>
      </view>
      <view v-if="showAvatar" class="topbar-avatar" @click="goProfile">
        <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill" />
        <text v-else class="avatar-text">{{ avatarText || '勋' }}</text>
      </view>
    </view>

    <view v-if="menuVisible" class="menu-mask" @click="closeMenu"></view>
    <view :class="['side-menu', menuVisible ? 'side-menu-show' : '']">
      <view class="brand-row">
        <view class="brand-logo">
          <image v-if="logo" class="brand-logo-img" :src="logo" mode="aspectFill" />
          <text v-else class="brand-logo-text">勋</text>
        </view>
        <view class="brand-copy">
          <text class="brand-name">勋港</text>
          <text class="brand-desc">智能家具 AI 修图平台</text>
        </view>
        <view class="menu-close" @click="closeMenu">×</view>
      </view>

      <view class="menu-list">
        <view v-for="item in menuItems" :key="item.key" :class="['menu-item', activeKey === item.key ? 'menu-item-active' : '']" @click="navigateMenu(item)">
          <text class="menu-icon">{{ item.icon }}</text>
          <text class="menu-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="menu-bottom">
        <view class="menu-round" @click="navigateQuick('/pages/feedback/index')">▢</view>
        <view class="menu-round" @click="navigateQuick('/pages/announcements/index')">✉</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AppTopbar',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    quota: { type: [String, Number], default: '' },
    avatarText: { type: String, default: '勋' },
    avatarUrl: { type: String, default: '' },
    logo: { type: String, default: '' },
    showAvatar: { type: Boolean, default: true },
    showBack: { type: Boolean, default: false },
    backUrl: { type: String, default: '/pages/workbench/index' }
  },
  data() {
    return {
      menuVisible: false,
      activeKey: 'workbench',
      menuItems: [
        { key: 'workbench', label: '工作台', icon: '⌁', url: '/pages/workbench/index' },
        { key: 'tasks', label: '历史', icon: '▧', url: '/pages/tasks/index' },
        { key: 'resources', label: '资源库', icon: '▰', url: '/pages/resources/index' },
        { key: 'users', label: '用户管理', icon: '♟', url: '/pages/users/index' },
        { key: 'promotion', label: '推荐收益', icon: '▣', url: '/pages/promotion/index' }
      ]
    };
  },
  methods: {
    openMenu() {
      this.refreshActive();
      this.menuVisible = true;
    },
    closeMenu() {
      this.menuVisible = false;
    },
    refreshActive() {
      const pages = getCurrentPages ? getCurrentPages() : [];
      const route = pages.length ? pages[pages.length - 1].route : '';
      if (route.indexOf('tasks') >= 0) this.activeKey = 'tasks';
      else if (route.indexOf('resources') >= 0) this.activeKey = 'resources';
      else if (route.indexOf('users') >= 0) this.activeKey = 'users';
      else if (route.indexOf('promotion') >= 0) this.activeKey = 'promotion';
      else if (route.indexOf('mine') >= 0 || route.indexOf('quota') >= 0 || route.indexOf('feedback') >= 0 || route.indexOf('announcements') >= 0) this.activeKey = 'mine';
      else this.activeKey = 'workbench';
    },
    navigateMenu(item) {
      if (!item.url) return;
      this.closeMenu();
      const current = getCurrentPages && getCurrentPages().length ? '/' + getCurrentPages()[getCurrentPages().length - 1].route : '';
      if (current === item.url) return;
uni.reLaunch({ url: item.url });
    },
    goBack() {
      const pages = getCurrentPages ? getCurrentPages() : [];
      if (pages.length > 1) {
        uni.navigateBack({ delta: 1 });
        return;
      }
      uni.reLaunch({ url: this.backUrl || '/pages/workbench/index' });
    },
    goProfile() {
      this.$emit('profile');
      uni.reLaunch({ url: '/pages/mine/index' });
    },
    navigateQuick(url) {
      this.closeMenu();
      uni.navigateTo({ url });
    }
  }
};
</script>

<style>
.topbar-wrap {
  position: relative;
  z-index: 60;
  margin: 0 -24rpx;
  padding-top: var(--status-bar-height);
}
.topbar {
  height: 128rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 28rpx;
  background: rgba(7, 8, 10, 0.96);
  border-bottom: 1rpx solid rgba(226, 199, 115, 0.14);
}
.menu-button,
.back-button {
  width: 88rpx;
  height: 88rpx;
  flex: 0 0 88rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 11rpx;
  border-radius: 25rpx;
  border: 1rpx solid rgba(226, 199, 115, 0.24);
  background: rgba(255, 255, 255, 0.035);
}
.back-icon {
  color: #efd482;
  font-size: 62rpx;
  line-height: 1;
  font-weight: 500;
}
.menu-line {
  width: 34rpx;
  height: 5rpx;
  border-radius: 999rpx;
  background: #efd482;
}
.menu-line-long { width: 46rpx; }
.topbar-title-box { flex: 1; min-width: 0; }
.topbar-title { display: block; color: #fff6dc; font-size: 30rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topbar-subtitle { display: block; margin-top: 4rpx; color: rgba(255, 246, 220, 0.55); font-size: 22rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topbar-avatar {
  width: 76rpx;
  height: 76rpx;
  flex: 0 0 76rpx;
  overflow: hidden;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid rgba(226, 199, 115, 0.38);
  background: linear-gradient(135deg, #fff1b8, #c99731);
}
.avatar-img { width: 100%; height: 100%; }
.avatar-text { color: #15100a; font-size: 30rpx; font-weight: 900; }
.menu-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 88;
  background: rgba(0, 0, 0, 0.54);
  backdrop-filter: blur(6px);
}
.side-menu {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 90;
  width: 74vw;
  max-width: 620rpx;
  box-sizing: border-box;
  padding: calc(var(--status-bar-height) + 34rpx) 28rpx 42rpx;
  background: linear-gradient(180deg, #111214 0%, #0b0d0f 100%);
  border-right: 1rpx solid rgba(226, 199, 115, 0.22);
  transform: translateX(-102%);
  transition: transform 0.22s ease;
  box-shadow: 24rpx 0 70rpx rgba(0, 0, 0, 0.42);
}
.side-menu-show { transform: translateX(0); }
.brand-row { display: flex; align-items: center; gap: 18rpx; margin-bottom: 38rpx; }
.brand-logo {
  width: 82rpx;
  height: 82rpx;
  border-radius: 20rpx;
  overflow: hidden;
  border: 1rpx solid rgba(226, 199, 115, 0.28);
  background: #050607;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-logo-img { width: 100%; height: 100%; }
.brand-logo-text { color: #efd482; font-size: 32rpx; font-weight: 900; }
.brand-copy { flex: 1; min-width: 0; }
.brand-name { display: block; color: #fff6dc; font-size: 37rpx; font-weight: 900; }
.brand-desc { display: block; margin-top: 4rpx; color: rgba(255, 246, 220, 0.58); font-size: 25rpx; }
.menu-close {
  width: 76rpx;
  height: 76rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ead082;
  font-size: 34rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.13);
  background: rgba(255, 255, 255, 0.045);
}
.menu-list { display: flex; flex-direction: column; gap: 22rpx; }
.menu-item {
  min-height: 100rpx;
  box-sizing: border-box;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-radius: 30rpx;
  color: #fff6dc;
  background: rgba(255, 255, 255, 0.045);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
}
.menu-item-active {
  color: #141006;
  background: linear-gradient(135deg, #fff1b8 0%, #e5bc51 54%, #c99731 100%);
  border-color: transparent;
}
.menu-icon { width: 42rpx; text-align: center; font-size: 40rpx; font-weight: 900; }
.menu-label { font-size: 32rpx; font-weight: 900; }
.menu-bottom { position: absolute; left: 0; right: 0; bottom: 42rpx; display: flex; justify-content: center; gap: 28rpx; }
.menu-round {
  width: 92rpx;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 30rpx;
  color: #efd482;
  font-size: 40rpx;
  border: 1rpx solid rgba(226, 199, 115, 0.38);
  background: rgba(255, 255, 255, 0.035);
}
</style>
