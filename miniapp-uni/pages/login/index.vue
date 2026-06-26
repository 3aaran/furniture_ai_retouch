<template>
  <view class="page login-page">
    <app-topbar title="勋港家具 AI" subtitle="登录 / 注册" :show-avatar="false" />

    <view class="login-hero">
      <text class="login-title">登录勋港家具 AI</text>
      <text class="login-desc">使用 Web 前端一致的账号体系登录，登录后才能访问工作台、历史任务和资源库。</text>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="login-tabs">
      <view v-for="item in loginModes" :key="item.key" :class="['login-tab', mode === item.key ? 'active' : '']" @click="switchMode(item.key)">
        {{ item.label }}
      </view>
    </view>

    <view class="login-form">
      <view class="field">
        <text>{{ mode === 'sms' ? '手机号' : '账号' }}</text>
        <input v-model="form.identifier" :placeholder="mode === 'sms' ? '请输入手机号' : '请输入手机号或用户名'" />
      </view>

      <view v-if="mode === 'password'" class="field">
        <text>密码</text>
        <input v-model="form.password" password placeholder="请输入密码" />
      </view>

      <view v-if="mode === 'sms'" class="field">
        <text>验证码</text>
        <view class="code-row">
          <input v-model="form.code" type="number" maxlength="6" placeholder="请输入验证码" />
          <button class="secondary-btn code-btn" :disabled="countdown > 0 || submitting" @click="sendCode">
            {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
          </button>
        </view>
      </view>

      <button class="primary-btn" :disabled="submitting" @click="submitLogin">{{ submitText }}</button>
    </view>

    <view class="hint-card">
      <text>接口信息</text>
      <text>{{ apiHint }}</text>
    </view>
  </view>
</template>

<script>
import { loginByCode, loginByPassword, sendSmsCode } from '../../api/auth.js';
import { getToken } from '../../utils/request.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';

export default {
  components: { AppTopbar },
  data() {
    return {
      submitting: false,
      mode: 'password',
      countdown: 0,
      timer: null,
      errorText: '',
      loginModes: [
        { key: 'password', label: '密码登录' },
        { key: 'sms', label: '验证码登录' }
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
      if (this.submitting) return '登录中';
      return this.mode === 'sms' ? '验证码登录 / 注册' : '登录';
    },
    apiHint() {
      return this.mode === 'sms' ? 'POST /api/sms/send-code + POST /api/auth/code-login' : 'POST /api/auth/login';
    }
  },
  onUnload() {
    this.clearTimer();
  },
  methods: {
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
      if (!this.form.identifier) {
        uni.showToast({ title: '请输入账号', icon: 'none' });
        return;
      }
      if (this.mode === 'password' && !this.form.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' });
        return;
      }
      if (this.mode === 'sms' && !this.form.code) {
        uni.showToast({ title: '请输入验证码', icon: 'none' });
        return;
      }
      this.errorText = '';
      this.submitting = true;
      try {
        if (this.mode === 'sms') {
          await loginByCode({ phone: this.form.identifier, code: this.form.code });
        } else {
          await loginByPassword({ identifier: this.form.identifier, password: this.form.password });
        }
        if (!getToken()) {
          this.errorText = '登录接口未返回 token，请检查后端返回结构。';
          return;
        }
        uni.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/workbench/index' });
        }, 250);
      } catch (error) {
        this.errorText = error.message || '登录失败，请检查账号或后端接口';
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style>
.login-page { padding-top: 0; }
.login-hero { padding: 48rpx 6rpx 26rpx; }
.login-title { display: block; color: #fff4df; font-size: 46rpx; font-weight: 900; }
.login-desc { display: block; margin-top: 14rpx; color: rgba(255,244,223,.6); font-size: 25rpx; line-height: 1.6; }
.login-tabs { display: grid; grid-template-columns: repeat(2,1fr); gap: 14rpx; margin: 22rpx 0; }
.login-tab { height: 78rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; border: 1rpx solid rgba(242,213,140,.16); color: rgba(255,244,223,.72); background: rgba(255,255,255,.04); font-weight: 800; }
.login-tab.active { color: #181207; background: linear-gradient(135deg,#f3da94,#c79b3b); border-color: transparent; }
.login-form { padding: 24rpx; border-radius: 28rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(242,213,140,.14); }
.field { margin-bottom: 20rpx; }
.field text { display: block; margin-bottom: 10rpx; color: #f4dfaa; font-size: 24rpx; font-weight: 800; }
.field input { height: 82rpx; padding: 0 22rpx; border-radius: 18rpx; color: #fff4df; background: #101317; border: 1rpx solid rgba(255,255,255,.1); }
.code-row { display: grid; grid-template-columns: 1fr 190rpx; gap: 12rpx; align-items: center; }
.code-btn { height: 82rpx; font-size: 24rpx; }
.hint-card, .error-card { margin-top: 20rpx; padding: 18rpx 20rpx; border-radius: 18rpx; font-size: 23rpx; line-height: 1.6; }
.hint-card { border: 1rpx solid rgba(242,213,140,.12); color: rgba(255,244,223,.58); background: rgba(255,255,255,.03); }
.hint-card text { display: block; }
.error-card { border: 1rpx solid rgba(255,112,112,.25); background: rgba(255,112,112,.08); color: #ffb4a8; }
</style>
