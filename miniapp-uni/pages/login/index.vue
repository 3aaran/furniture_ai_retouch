<template>
  <view class="page login-page">
    <app-topbar title="勋港家具 AI" subtitle="微信授权登录" :show-avatar="false" />

    <view class="login-hero">
      <view class="hero-mark"><app-icon name="brush" tone="dark" :size="40" /></view>
      <text class="login-title">勋港家具 AI</text>
      <text class="login-desc">使用微信手机号快捷登录，后续打开小程序自动进入工作台。</text>
      <view class="hero-chips">
        <view class="hero-chip"><app-icon name="brush" :size="22" />AI 工作台</view>
        <view class="hero-chip"><app-icon name="layers" :size="22" />资源库</view>
        <view class="hero-chip"><app-icon name="image" :size="22" />历史任务</view>
      </view>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="wechat-card">
      <view class="wechat-head">
        <view class="wechat-icon"><app-icon name="users" tone="dark" :size="34" /></view>
        <view>
          <b>微信手机号快捷登录</b>
          <text>{{ silentChecking ? '正在尝试自动登录...' : '首次授权手机号，之后自动登录' }}</text>
        </view>
      </view>
      <button class="primary-btn wechat-btn" open-type="getPhoneNumber" :disabled="submitting || silentChecking" @getphonenumber="handleWechatPhoneLogin">
        {{ submitting ? '登录中' : '微信授权登录' }}
      </button>
      <text class="wechat-tip">授权后只用手机号匹配已开通账号，不发送验证码，不自动创建陌生账号。</text>
    </view>

    <view class="manual-toggle" @click="manualOpen = !manualOpen">
      <text>其他登录方式</text>
      <b>{{ manualOpen ? '收起' : '展开' }}</b>
    </view>

    <view v-if="manualOpen" class="manual-panel">
      <view class="login-tabs">
        <view v-for="item in loginModes" :key="item.key" :class="['login-tab', mode === item.key ? 'active' : '']" @click="switchMode(item.key)">
          <app-icon :name="item.icon" :tone="mode === item.key ? 'dark' : 'gold'" :size="24" />{{ item.label }}
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
    </view>
  </view>
</template>

<script>
import { loginByCode, loginByPassword, sendSmsCode, wechatPhoneLogin, wechatSilentLogin } from '../../api/auth.js';
import { getToken } from '../../utils/request.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';

export default {
  components: { AppTopbar },
  data() {
    return {
      submitting: false,
      silentChecking: false,
      manualOpen: false,
      mode: 'password',
      countdown: 0,
      timer: null,
      errorText: '',
      loginModes: [
        { key: 'password', label: '密码登录', icon: 'wallet' },
        { key: 'sms', label: '验证码登录', icon: 'mail' }
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
      return this.mode === 'sms' ? '验证码登录' : '登录';
    }
  },
  onLoad() {
    this.tryWechatSilentLogin();
  },
  onUnload() {
    this.clearTimer();
  },
  methods: {
    redirectAfterLogin() {
      uni.reLaunch({ url: '/pages/workbench/index' });
    },
    getWechatLoginCode() {
      return new Promise((resolve, reject) => {
        if (!uni.login) {
          reject(new Error('当前环境不支持微信登录'));
          return;
        }
        uni.login({
          provider: 'weixin',
          success: (res) => {
            if (res.code) resolve(res.code);
            else reject(new Error('微信登录未返回 code'));
          },
          fail: (error) => reject(new Error(error?.errMsg || '微信登录失败'))
        });
      });
    },
    async tryWechatSilentLogin() {
      if (getToken()) {
        this.redirectAfterLogin();
        return;
      }
      this.silentChecking = true;
      try {
        const code = await this.getWechatLoginCode();
        const result = await wechatSilentLogin({ code });
        if (getToken() || result?.token || result?.accessToken) {
          this.redirectAfterLogin();
          return;
        }
        if (result?.needPhoneAuth) this.errorText = '';
      } catch (error) {
        this.errorText = '';
      } finally {
        this.silentChecking = false;
      }
    },
    async handleWechatPhoneLogin(e) {
      const detail = e?.detail || {};
      if (!detail.code) {
        if (detail.errMsg && detail.errMsg.indexOf('deny') >= 0) this.errorText = '需要授权手机号后才能快捷登录';
        else this.errorText = detail.errMsg || '未获取到微信手机号授权';
        return;
      }
      this.errorText = '';
      this.submitting = true;
      try {
        const loginCode = await this.getWechatLoginCode();
        await wechatPhoneLogin({ loginCode, phoneCode: detail.code });
        if (!getToken()) {
          this.errorText = '微信登录接口未返回 token，请检查后端返回结构。';
          return;
        }
        uni.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => this.redirectAfterLogin(), 250);
      } catch (error) {
        this.errorText = error.message || '微信授权登录失败';
      } finally {
        this.submitting = false;
      }
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
        setTimeout(() => this.redirectAfterLogin(), 250);
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
.login-hero { padding: 42rpx 6rpx 24rpx; }
.hero-mark { width: 92rpx; height: 92rpx; display: flex; align-items: center; justify-content: center; border-radius: 28rpx; color: #181207; background: linear-gradient(135deg,#f3da94,#c79b3b); box-shadow: 0 18rpx 48rpx rgba(199,155,59,.18); }
.login-title { display: block; margin-top: 24rpx; color: #fff4df; font-size: 48rpx; font-weight: 900; }
.login-desc { display: block; margin-top: 12rpx; color: rgba(255,244,223,.6); font-size: 25rpx; line-height: 1.6; }
.hero-chips { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 20rpx; }
.hero-chip { height: 50rpx; display: inline-flex; align-items: center; gap: 8rpx; padding: 0 16rpx; border-radius: 999rpx; color: rgba(255,244,223,.72); background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.08); font-size: 22rpx; font-weight: 800; }
.wechat-card { margin-top: 18rpx; padding: 26rpx; border-radius: 30rpx; border: 1rpx solid rgba(242,213,140,.18); background: linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.035)); }
.wechat-head { display: flex; align-items: center; gap: 18rpx; margin-bottom: 22rpx; }
.wechat-icon { width: 74rpx; height: 74rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#f3da94,#c79b3b); }
.wechat-head b { display: block; color: #fff4df; font-size: 33rpx; font-weight: 900; }
.wechat-head text { display: block; margin-top: 6rpx; color: rgba(255,244,223,.58); font-size: 23rpx; }
.wechat-btn { margin-top: 6rpx; }
.wechat-tip { display: block; margin-top: 18rpx; color: rgba(255,244,223,.52); font-size: 22rpx; line-height: 1.55; }
.manual-toggle { height: 76rpx; margin: 20rpx 0 12rpx; padding: 0 22rpx; display: flex; align-items: center; justify-content: space-between; border-radius: 22rpx; color: rgba(255,244,223,.72); background: rgba(255,255,255,.035); border: 1rpx solid rgba(255,255,255,.08); }
.manual-toggle text { font-size: 25rpx; font-weight: 800; }
.manual-toggle b { color: #f3dc9a; font-size: 24rpx; }
.login-tabs { display: grid; grid-template-columns: repeat(2,1fr); gap: 14rpx; margin: 18rpx 0; }
.login-tab { height: 76rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; border-radius: 18rpx; border: 1rpx solid rgba(242,213,140,.16); color: rgba(255,244,223,.72); background: rgba(255,255,255,.04); font-weight: 800; }
.login-tab.active { color: #181207; background: linear-gradient(135deg,#f3da94,#c79b3b); border-color: transparent; }
.login-form { padding: 24rpx; border-radius: 28rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(242,213,140,.14); }
.field { margin-bottom: 20rpx; }
.field text { display: block; margin-bottom: 10rpx; color: #f4dfaa; font-size: 24rpx; font-weight: 800; }
.field input { height: 82rpx; padding: 0 22rpx; border-radius: 18rpx; color: #fff4df; background: #101317; border: 1rpx solid rgba(255,255,255,.1); }
.code-row { display: grid; grid-template-columns: 1fr 190rpx; gap: 12rpx; align-items: center; }
.code-btn { height: 82rpx; font-size: 24rpx; }
.error-card { margin-top: 20rpx; padding: 18rpx 20rpx; border-radius: 18rpx; font-size: 23rpx; line-height: 1.6; border: 1rpx solid rgba(255,112,112,.25); background: rgba(255,112,112,.08); color: #ffb4a8; }
</style>
