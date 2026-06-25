<template>
  <view class="page login-page">
    <app-topbar title="勋港家具 AI" subtitle="登录" :show-avatar="false" />

    <view class="login-hero">
      <text class="login-title">登录</text>
      <text class="login-desc">{{ useMock ? '当前为 mock 模式' : '连接本地后端账号' }}</text>
    </view>

    <view class="mode-row">
      <text>mock 模式</text>
      <switch :checked="useMock" color="#d8b86a" @change="toggleMock" />
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="login-tabs">
      <view
        v-for="item in loginModes"
        :key="item.key"
        :class="['login-tab', mode === item.key ? 'active' : '']"
        @click="switchMode(item.key)"
      >
        {{ item.label }}
      </view>
    </view>

    <view class="login-form">
      <view v-if="mode !== 'wechat'" class="field">
        <text>账号</text>
        <input v-model="form.identifier" :placeholder="mode === 'sms' ? '请输入手机号' : '手机号 / 用户名'" />
      </view>
      <view v-if="mode === 'password'" class="field">
        <text>密码</text>
        <input v-model="form.password" password placeholder="请输入密码" />
      </view>
      <view v-if="mode === 'sms'" class="field">
        <text>验证码</text>
        <view class="code-row">
          <input v-model="form.code" type="number" maxlength="6" placeholder="6 位验证码" />
          <button class="secondary-btn code-btn" :disabled="countdown > 0 || submitting" @click="sendCode">
            {{ countdown > 0 ? countdown + 's' : '获取' }}
          </button>
        </view>
      </view>
      <view v-if="mode === 'wechat'" class="wechat-card">
        <view class="wechat-title">微信授权登录</view>
        <view class="muted">调用小程序登录能力获取授权 code。</view>
      </view>
      <button class="primary-btn" :disabled="submitting" @click="submitLogin">
        {{ submitText }}
      </button>
      <button class="secondary-btn" @click="back">返回</button>
    </view>

    <view class="hint-card">
      <text>真实接口</text>
      <text>{{ apiHint }}</text>
    </view>
  </view>
</template>

<script>
import { loginByCode, loginByPassword, sendSmsCode } from '../../api/auth.js';
import { mockLogin } from '../../utils/mockSession.js';
import { clearToken, getToken, setUseMockApi, useMockApi } from '../../utils/request.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';

export default {
  components: {
    AppTopbar
  },
  data() {
    return {
      useMock: false,
      submitting: false,
      mode: 'password',
      countdown: 0,
      timer: null,
      errorText: '',
      loginModes: [
        { key: 'password', label: '密码' },
        { key: 'sms', label: '验证码' },
        { key: 'wechat', label: '微信' }
      ],
      form: {
        identifier: '',
        password: '',
        code: ''
      }
    };
  },
  computed: {
    submitText() {
      if (this.submitting) return '处理中';
      if (this.useMock) return 'mock 登录';
      if (this.mode === 'sms') return '验证码登录';
      if (this.mode === 'wechat') return '微信授权登录';
      return '密码登录';
    },
    apiHint() {
      if (this.mode === 'sms') return 'POST /api/sms/send-code + POST /api/auth/code-login';
      if (this.mode === 'wechat') return '小程序端 uni.login；后端微信登录接口缺失';
      return 'POST /api/auth/login';
    }
  },
  onShow() {
    // 登录页只负责显示登录入口。不要在启动阶段自动跳转，避免 appLaunch with non-empty page stack。
    this.useMock = useMockApi();
  },
  onUnload() {
    this.clearTimer();
  },
  methods: {
    toggleMock(event) {
      this.useMock = Boolean(event.detail.value);
      setUseMockApi(this.useMock);
      clearToken();
      this.errorText = this.useMock ? '已切换到 mock 数据' : '已切换到真实接口';
    },
    switchMode(key) {
      this.mode = key;
      this.errorText = '';
    },
    async sendCode() {
      if (!this.form.identifier) {
        uni.showToast({ title: '请输入手机号', icon: 'none' });
        return;
      }
      this.errorText = '';
      try {
        if (this.useMock) {
          this.startCountdown();
          uni.showToast({ title: 'mock 验证码 123456', icon: 'none' });
          return;
        }
        await sendSmsCode({ phone: this.form.identifier, scene: 'LOGIN' });
        this.startCountdown();
        uni.showToast({ title: '验证码已发送', icon: 'success' });
      } catch (error) {
        this.errorText = error.message || '验证码发送失败';
      }
    },
    startCountdown() {
      this.clearTimer();
      this.countdown = 60;
      this.timer = setInterval(() => {
        this.countdown = Math.max(0, this.countdown - 1);
        if (this.countdown <= 0) this.clearTimer();
      }, 1000);
    },
    clearTimer() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    },
    async submitLogin() {
      if (this.mode === 'wechat') {
        await this.loginByWechat();
        return;
      }
      if (!this.form.identifier) {
        uni.showToast({ title: '请输入账号', icon: 'none' });
        return;
      }
      if (this.mode === 'password' && !this.form.password) {
        uni.showToast({ title: '请输入账号和密码', icon: 'none' });
        return;
      }
      if (this.mode === 'sms' && !this.form.code) {
        uni.showToast({ title: '请输入验证码', icon: 'none' });
        return;
      }
      this.errorText = '';
      this.submitting = true;
      try {
        if (this.useMock) {
          mockLogin();
          uni.showToast({ title: 'mock 登录成功', icon: 'success' });
        } else if (this.mode === 'sms') {
          const response = await loginByCode({
            phone: this.form.identifier,
            code: this.form.code
          });
          if (!getToken()) {
            console.warn('[miniapp-auth] 登录成功响应未保存 token，请检查后端返回结构', response);
            this.errorText = '登录返回缺少 token，请联系管理员检查接口返回';
            return;
          }
          uni.showToast({ title: '登录成功', icon: 'success' });
        } else {
          const response = await loginByPassword({
            identifier: this.form.identifier,
            password: this.form.password
          });
          if (!getToken()) {
            console.warn('[miniapp-auth] 登录成功响应未保存 token，请检查后端返回结构', response);
            this.errorText = '登录返回缺少 token，请联系管理员检查接口返回';
            return;
          }
          uni.showToast({ title: '登录成功', icon: 'success' });
        }
        setTimeout(() => {
          uni.switchTab({ url: '/pages/index/index' });
        }, 350);
      } catch (error) {
        this.errorText = error.message || '登录失败，请检查后端服务和账号密码';
      } finally {
        this.submitting = false;
      }
    },
    loginByWechat() {
      this.errorText = '';
      this.submitting = true;
      if (this.useMock) {
        mockLogin();
        this.submitting = false;
        uni.showToast({ title: 'mock 登录成功', icon: 'success' });
        setTimeout(() => {
          uni.switchTab({ url: '/pages/index/index' });
        }, 350);
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        uni.login({
          provider: 'weixin',
          success: (result) => {
            const code = result && result.code;
            this.submitting = false;
            if (!code) {
              this.errorText = '未获取到微信登录 code';
              resolve();
              return;
            }
            this.errorText = '已获取微信授权 code，但当前后端缺少微信小程序登录接口，暂不能完成真实微信登录。';
            resolve();
          },
          fail: (error) => {
            this.submitting = false;
            this.errorText = error.errMsg || '微信授权失败，请在微信小程序环境中测试';
            resolve();
          }
        });
      });
    },
    back() {
      // 未登录时不允许通过返回进入业务页。
      uni.showToast({ title: '请先登录', icon: 'none' });
    }
  }
};
</script>

<style>
.login-hero {
  padding: 42rpx 32rpx;
  border: 1rpx solid rgba(216, 184, 106, 0.28);
  border-radius: 24rpx;
  background: linear-gradient(135deg, #171d25, #0f141b);
  color: #edf2f7;
  box-shadow: 0 20rpx 48rpx rgba(0, 0, 0, 0.25);
}

.login-title,
.login-desc,
.field text,
.hint-card text {
  display: block;
}

.login-title {
  font-size: 46rpx;
  font-weight: 900;
}

.login-desc {
  margin-top: 12rpx;
  color: #b9c2cf;
  font-size: 26rpx;
}

.mode-row,
.login-tabs,
.login-form,
.hint-card,
.error-card {
  margin-top: 22rpx;
  border: 1rpx solid #2b3442;
  border-radius: 18rpx;
  background: #151a21;
  box-shadow: 0 14rpx 38rpx rgba(0, 0, 0, 0.2);
}

.mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 26rpx;
  color: #edf2f7;
  font-size: 27rpx;
  font-weight: 800;
}

.error-card {
  padding: 18rpx 22rpx;
  background: #3a2023;
  color: #ffb2b2;
  font-size: 25rpx;
  line-height: 1.5;
}

.login-tabs {
  display: flex;
  gap: 10rpx;
  padding: 10rpx;
}

.login-tab {
  flex: 1;
  height: 62rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b9c2cf;
  font-size: 25rpx;
  font-weight: 800;
}

.login-tab.active {
  background: #d8b86a;
  color: #19140a;
}

.login-form {
  padding: 28rpx;
}

.field,
.wechat-card,
.login-form .primary-btn,
.login-form .secondary-btn {
  margin-bottom: 22rpx;
}

.login-form .secondary-btn {
  margin-bottom: 0;
}

.field text {
  margin-bottom: 12rpx;
  color: #edf2f7;
  font-size: 26rpx;
  font-weight: 800;
}

input {
  height: 82rpx;
  padding: 0 20rpx;
  border: 1rpx solid #2b3442;
  border-radius: 16rpx;
  background: #10151c;
  color: #edf2f7;
  font-size: 27rpx;
}

.code-row {
  display: flex;
  gap: 12rpx;
}

.code-row input {
  flex: 1;
  min-width: 0;
}

.code-btn {
  width: 150rpx;
  height: 82rpx;
  font-size: 24rpx;
}

.wechat-card {
  padding: 22rpx;
  border: 1rpx solid #2b3442;
  border-radius: 16rpx;
  background: #10151c;
}

.wechat-title {
  color: #edf2f7;
  font-size: 30rpx;
  font-weight: 900;
}

.hint-card {
  padding: 22rpx;
  background: #10151c;
}

.hint-card text:first-child {
  color: #d8b86a;
  font-size: 24rpx;
  font-weight: 800;
}

.hint-card text:last-child {
  margin-top: 8rpx;
  color: #b9c2cf;
  font-size: 25rpx;
}
</style>
