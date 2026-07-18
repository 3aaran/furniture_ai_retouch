<template>
  <view v-if="visible" class="login-mask" @click="close">
    <view class="login-sheet" @click.stop="noop">
      <view class="sheet-handle"></view>
      <view class="sheet-head">
        <view class="sheet-icon"><app-icon name="users" :size="34" /></view>
        <view class="sheet-copy">
          <text class="sheet-title">登录勋港家具 AI</text>
          <text class="sheet-desc">使用当前微信身份保存图片、任务和算力记录。</text>
        </view>
        <view class="sheet-close" @click="close"><app-icon name="x" :size="28" /></view>
      </view>

      <button class="wechat-login-btn" :loading="loggingIn" :disabled="loggingIn" @click="loginWithWechat">
        {{ loggingIn ? '正在登录' : '微信一键登录' }}
      </button>
      <text class="sheet-note">无需授权手机号、验证码或账号密码。首次登录会创建独立体验账号。</text>
      <button class="account-login-btn" :disabled="loggingIn" @click="openAccountLogin">使用已有账号登录</button>
    </view>
  </view>
</template>

<script>
import { wechatSilentLogin } from '../../api/auth.js';
import { getToken } from '../../utils/request.js';
import { clearPendingLoginActions, resumePendingLoginActions } from '../../utils/auth.js';

export default {
  name: 'LoginSheet',
  data() {
    return {
      visible: false,
      loggingIn: false
    };
  },
  mounted() {
    uni.$on('auth:required', this.open);
    uni.$on('auth:resolved', this.closeSilently);
    uni.$on('auth:cancelled', this.closeSilently);
  },
  beforeDestroy() {
    this.removeAuthListeners();
  },
  unmounted() {
    this.removeAuthListeners();
  },
  methods: {
    noop() {},
    open() {
      if (!getToken()) this.visible = true;
    },
    closeSilently() {
      this.visible = false;
    },
    close() {
      if (this.loggingIn) return;
      clearPendingLoginActions();
      uni.$emit('auth:cancelled');
    },
    removeAuthListeners() {
      uni.$off('auth:required', this.open);
      uni.$off('auth:resolved', this.closeSilently);
      uni.$off('auth:cancelled', this.closeSilently);
    },
    getWechatLoginCode() {
      return new Promise((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: (result) => {
            if (result.code) resolve(result.code);
            else reject(new Error('微信登录未返回 code'));
          },
          fail: (error) => reject(new Error(error?.errMsg || '微信登录失败'))
        });
      });
    },
    async loginWithWechat() {
      if (this.loggingIn) return;
      this.loggingIn = true;
      try {
        const code = await this.getWechatLoginCode();
        const result = await wechatSilentLogin({ code });
        if (!getToken() && !result?.token && !result?.accessToken) {
          throw new Error(result?.message || '微信登录接口未返回登录凭证');
        }
        uni.$emit('auth:resolved');
        uni.showToast({ title: '登录成功', icon: 'success' });
        await resumePendingLoginActions();
        this.$emit('login-success', result);
        uni.$emit('auth:success', result);
      } catch (error) {
        uni.showToast({ title: error?.message || '微信登录失败', icon: 'none' });
      } finally {
        this.loggingIn = false;
      }
    },
    openAccountLogin() {
      clearPendingLoginActions();
      uni.$emit('auth:resolved');
      uni.navigateTo({ url: '/pages/login/index' });
    }
  }
};
</script>

<style scoped>
.login-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  background: rgba(22, 34, 58, .46);
  backdrop-filter: blur(8rpx);
}
.login-sheet {
  width: 100%;
  box-sizing: border-box;
  padding: 18rpx 28rpx calc(34rpx + env(safe-area-inset-bottom));
  border-radius: 36rpx 36rpx 0 0;
  background: var(--xg-bg-card);
  box-shadow: 0 -20rpx 60rpx rgba(22, 34, 58, .16);
}
.sheet-handle {
  width: 76rpx;
  height: 8rpx;
  margin: 0 auto 26rpx;
  border-radius: 999rpx;
  background: var(--xg-border-soft);
}
.sheet-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.sheet-icon {
  width: 72rpx;
  height: 72rpx;
  flex: 0 0 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
  color: var(--xg-color-primary);
  background: rgba(var(--xg-color-primary-rgb), .1);
}
.sheet-copy {
  flex: 1;
  min-width: 0;
}
.sheet-title {
  display: block;
  color: var(--xg-text-main);
  font-size: 34rpx;
  font-weight: 900;
}
.sheet-desc {
  display: block;
  margin-top: 7rpx;
  color: var(--xg-text-muted);
  font-size: 23rpx;
  line-height: 1.55;
}
.sheet-close {
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  color: var(--xg-text-muted);
  background: var(--xg-bg-card-soft);
}
.wechat-login-btn {
  height: 92rpx;
  margin-top: 30rpx;
  border: 0;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--xg-text-inverse);
  background: linear-gradient(135deg, var(--xg-color-primary), var(--xg-color-accent));
  font-size: 30rpx;
  font-weight: 900;
}
.wechat-login-btn::after,
.account-login-btn::after {
  border: 0;
}
.sheet-note {
  display: block;
  margin: 18rpx 4rpx 0;
  color: var(--xg-text-muted);
  font-size: 22rpx;
  line-height: 1.6;
  text-align: center;
}
.account-login-btn {
  height: 76rpx;
  margin-top: 16rpx;
  border: 1rpx solid var(--xg-border-soft);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--xg-color-primary);
  background: var(--xg-bg-card-soft);
  font-size: 25rpx;
  font-weight: 900;
}
</style>
