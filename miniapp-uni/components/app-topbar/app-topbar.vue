<template>
  <view class="topbar-wrap">
    <view class="topbar">
      <view v-if="showBack" class="topbar-icon-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view v-else class="topbar-icon-btn" @click="openMenu">
        <app-icon name="menu" :size="34" />
      </view>

      <view class="topbar-title-box">
        <text class="topbar-title">{{ displayTitle }}</text>
        <text v-if="displaySubtitle" class="topbar-subtitle">{{ displaySubtitle }}</text>
      </view>

      <view v-if="quota" class="quota-chip">
        <app-icon name="wallet" tone="dark" :size="24" />
        <text>{{ quota }}</text>
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
          <text class="brand-name">勋港家具 AI</text>
          <text class="brand-desc">智能修图平台</text>
        </view>
        <view class="menu-close" @click="closeMenu"><app-icon name="x" :size="28" /></view>
      </view>

      <view class="menu-list">
        <view v-for="item in menuItems" :key="item.key" :class="['menu-item', activeKey === item.key ? 'menu-item-active' : '']" @click="navigateMenu(item)">
          <app-icon class="menu-icon" :name="item.icon" :tone="activeKey === item.key ? 'dark' : 'gold'" :size="36" />
          <text class="menu-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="menu-tools">
        <view class="tool-item" @click="navigateQuick('/pages/feedback/index')">
          <app-icon name="message" :size="30" /><text class="tool-label">问题反馈</text>
        </view>
        <view class="tool-item" @click="navigateQuick('/pages/announcements/index')">
          <app-icon name="mail" :size="30" /><text class="tool-label">公告邮箱</text>
        </view>
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
    logo: { type: String, default: '/static/brand/xungang-mark.png' },
    showAvatar: { type: Boolean, default: true },
    showBack: { type: Boolean, default: false },
    backUrl: { type: String, default: '/pages/workbench/index' }
  },
  data() {
    return {
      menuVisible: false,
      activeKey: 'workbench',
      menuItems: [
        { key: 'workbench', label: '工作室', icon: 'brush', url: '/pages/workbench/index' },
        { key: 'resources', label: '资产库', icon: 'layers', url: '/pages/resources/index' },
        { key: 'users', label: '用户管理', icon: 'users', url: '/pages/users/index' },
        { key: 'tasks', label: '历史记录', icon: 'image', url: '/pages/tasks/index' },
        { key: 'promotion', label: '邀请共创', icon: 'ticket', url: '/pages/promotion/index' },
        { key: 'mine', label: '我的', icon: 'wallet', url: '/pages/mine/index' }
      ]
    };
  },
  computed: {
    displayTitle() {
      return this.title || '勋港家具 AI';
    },
    displaySubtitle() {
      return this.subtitle || (this.title ? '' : '智能修图 · 宣传图');
    }
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

<style scoped>
.topbar-wrap {
  position: relative;
  z-index: 60;
  margin: 0 -24rpx;
  padding-top: var(--status-bar-height);
}
.topbar {
  min-height: 108rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 24rpx;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1rpx solid var(--xg-border-soft);
  box-shadow: var(--xg-shadow-soft);
}
.topbar-icon-btn {
  width: 84rpx;
  height: 84rpx;
  flex: 0 0 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 26rpx;
  border: 1rpx solid var(--xg-border-soft);
  background: var(--xg-bg-card-soft);
}
.back-icon {
  color: var(--xg-color-primary);
  font-size: 62rpx;
  line-height: 1;
  font-weight: 500;
}
.topbar-title-box { flex: 1; min-width: 0; }
.topbar-title { display: block; color: var(--xg-text-main); font-size: 31rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topbar-subtitle { display: block; margin-top: 3rpx; color: var(--xg-text-muted); font-size: 21rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.quota-chip {
  max-width: 150rpx;
  height: 58rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  border-radius: 999rpx;
  color: var(--xg-text-inverse);
  background: linear-gradient(135deg, var(--xg-color-primary), var(--xg-color-accent));
  font-size: 22rpx;
  font-weight: 900;
  overflow: hidden;
}
.quota-chip text:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topbar-avatar {
  width: 72rpx;
  height: 72rpx;
  flex: 0 0 72rpx;
  overflow: hidden;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid rgba(var(--xg-color-primary-rgb), 0.16);
  background: linear-gradient(135deg, var(--xg-color-primary), var(--xg-color-accent));
}
.avatar-img { width: 100%; height: 100%; }
.avatar-text { color: var(--xg-text-inverse); font-size: 29rpx; font-weight: 900; }
.menu-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 88;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(6px);
}
.side-menu {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 90;
  width: 78vw;
  max-width: 620rpx;
  box-sizing: border-box;
  padding: calc(var(--status-bar-height) + 30rpx) 28rpx 42rpx;
  background: var(--xg-bg-card);
  border-right: 1rpx solid var(--xg-border-soft);
  transform: translateX(-102%);
  transition: transform 0.22s ease;
  box-shadow: 26rpx 0 70rpx rgba(0, 0, 0, 0.56);
}
.side-menu-show { transform: translateX(0); }
.brand-row { display: flex; align-items: center; gap: 18rpx; margin-bottom: 32rpx; }
.brand-logo {
  width: 78rpx;
  height: 78rpx;
  border-radius: 24rpx;
  overflow: hidden;
  border: 1rpx solid var(--xg-border-soft);
  background: var(--xg-bg-card-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-logo-img { width: 100%; height: 100%; }
.brand-logo-text { color: var(--xg-color-primary); font-size: 27rpx; font-weight: 900; }
.brand-copy { flex: 1; min-width: 0; }
.brand-name { display: block; color: var(--xg-text-main); font-size: 35rpx; font-weight: 900; }
.brand-desc { display: block; margin-top: 4rpx; color: var(--xg-text-muted); font-size: 24rpx; }
.menu-close {
  width: 74rpx;
  height: 74rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--xg-color-primary);
  border: 1rpx solid var(--xg-border-soft);
  background: var(--xg-bg-card-soft);
}
.menu-list { display: grid; gap: 18rpx; }
.menu-item {
  min-height: 96rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
  border-radius: 28rpx;
  color: var(--xg-text-main);
  background: var(--xg-bg-card-soft);
  border: 1rpx solid var(--xg-border-soft);
}
.menu-item-active {
  color: var(--xg-text-inverse);
  background: linear-gradient(135deg, var(--xg-color-primary), var(--xg-color-accent));
  border-color: transparent;
}
.menu-icon { width: 48rpx; }
.menu-label { font-size: 31rpx; font-weight: 900; }
.menu-tools {
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid var(--xg-border-soft);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
}
.tool-item {
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border-radius: 24rpx;
  color: var(--xg-text-main);
  background: var(--xg-bg-card-soft);
  border: 1rpx solid var(--xg-border-soft);
}
.tool-label { font-size: 25rpx; font-weight: 900; }
</style>
