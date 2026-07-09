<template>
  <view class="page login-page">
    <app-topbar title="勋港家具 AI" subtitle="微信授权登录" :show-avatar="false" />

    <view class="auth-shell">
      <view class="auth-grid"></view>
      <view class="auth-glow auth-glow-one"></view>
      <view class="auth-glow auth-glow-two"></view>

      <view class="login-hero">
        <view class="brand-row">
          <view class="hero-mark"><app-icon name="brush" tone="dark" :size="42" /></view>
          <view class="brand-copy">
            <text class="brand-name">勋港家具 AI</text>
            <text class="brand-subtitle">家具视觉工作台</text>
          </view>
        </view>
        <text class="login-title">登录后继续处理门店图片</text>
        <text class="login-desc">在小程序里完成上传、AI 修图、资源归档和历史任务查看。</text>
        <view class="hero-stats">
          <view class="hero-stat">
            <text class="hero-stat-value">AI</text>
            <text class="hero-stat-label">修图工作台</text>
          </view>
          <view class="hero-stat">
            <text class="hero-stat-value">云端</text>
            <text class="hero-stat-label">资源库</text>
          </view>
          <view class="hero-stat">
            <text class="hero-stat-value">门店</text>
            <text class="hero-stat-label">账号体系</text>
          </view>
        </view>
      </view>

      <view class="auth-card">
        <view class="auth-mode-tabs">
          <view :class="['auth-mode-tab', authMode === 'login' ? 'active' : '']" @click="switchAuthMode('login')">登录</view>
          <view :class="['auth-mode-tab', authMode === 'apply' ? 'active' : '']" @click="switchAuthMode('apply')">申请入驻</view>
        </view>

        <view v-if="errorText" class="error-card">{{ errorText }}</view>

        <view v-if="authMode === 'login'" class="auth-panel">
          <view class="card-head">
            <view class="card-head-icon"><app-icon name="users" tone="dark" :size="32" /></view>
            <view>
              <text class="card-eyebrow">欢迎回来</text>
              <text class="card-title">登录账号</text>
            </view>
          </view>

          <view class="wechat-card">
            <view class="wechat-head">
              <text class="wechat-title">微信手机号快捷登录</text>
              <text class="wechat-desc">{{ silentChecking ? '正在尝试自动登录...' : '首次授权手机号，之后自动登录' }}</text>
            </view>
            <button class="primary-btn wechat-btn" open-type="getPhoneNumber" :disabled="submitting || silentChecking" @getphonenumber="handleWechatPhoneLogin">
              {{ submitting ? '登录中' : '微信授权登录' }}
            </button>
            <text class="wechat-tip">授权后只用手机号匹配已开通账号，不发送验证码，不自动创建陌生账号。</text>
          </view>

          <view class="manual-toggle" @click="manualOpen = !manualOpen">
            <text>其他登录方式</text>
            <text class="manual-toggle-action">{{ manualOpen ? '收起' : '展开' }}</text>
          </view>

          <view v-if="manualOpen" class="manual-panel">
            <view class="login-tabs">
              <view v-for="item in loginModes" :key="item.key" :class="['login-tab', mode === item.key ? 'active' : '']" @click="switchMode(item.key)">
                <app-icon :name="item.icon" :tone="mode === item.key ? 'dark' : 'gold'" :size="24" />{{ item.label }}
              </view>
            </view>

            <view class="login-form">
              <view class="field">
                <text>{{ mode === 'sms' ? '手机号' : '账号 / 手机号' }}</text>
                <input v-model="form.identifier" :placeholder="mode === 'sms' ? '请输入手机号' : '请输入账号或手机号'" />
              </view>

              <view v-if="mode === 'password'" class="field">
                <text>密码</text>
                <input v-model="form.password" password placeholder="请输入密码" />
              </view>

              <view v-if="mode === 'sms'" class="field">
                <text>短信验证码</text>
                <view class="code-row">
                  <input v-model="form.code" type="number" maxlength="6" placeholder="请输入 6 位验证码" />
                  <button class="secondary-btn code-btn" :disabled="countdown > 0 || submitting" @click="sendCode">
                    {{ countdown > 0 ? countdown + 's' : '发送验证码' }}
                  </button>
                </view>
              </view>

              <button class="primary-btn" :disabled="submitting" @click="submitLogin">{{ submitText }}</button>
            </view>
          </view>
        </view>

        <view v-else class="auth-panel">
          <view class="card-head">
            <view class="card-head-icon"><app-icon name="layers" tone="dark" :size="32" /></view>
            <view>
              <text class="card-eyebrow">门店入驻</text>
              <text class="card-title">提交商家申请</text>
            </view>
          </view>

          <view class="apply-note">
            <text>提交后由管理员审核。已开通手机号可直接返回登录。</text>
          </view>

          <view class="login-form apply-form">
            <view class="field">
              <text>商家名称</text>
              <input v-model="applyForm.companyName" placeholder="请输入门店或公司名称" />
            </view>
            <view class="field">
              <text>联系人</text>
              <input v-model="applyForm.contactName" placeholder="请输入联系人姓名" />
            </view>
            <view class="field">
              <text>联系人手机号</text>
              <input v-model="applyForm.phone" type="number" maxlength="11" placeholder="请输入手机号" />
            </view>
            <view class="field">
              <text>短信验证码</text>
              <view class="code-row">
                <input v-model="applyForm.applyCode" type="number" maxlength="6" placeholder="请输入 6 位验证码" />
                <button class="secondary-btn code-btn" :disabled="applyCountdown > 0 || submitting" @click="sendApplyCode">
                  {{ applyCountdown > 0 ? applyCountdown + 's' : '发送验证码' }}
                </button>
              </view>
            </view>
            <view class="field">
              <text>邀请码</text>
              <input v-model="applyForm.inviteCode" placeholder="选填" />
            </view>
            <view class="field">
              <text>申请说明</text>
              <textarea v-model="applyForm.note" maxlength="160" placeholder="选填，例如门店所在城市、主营品类" />
            </view>

            <button class="primary-btn" :disabled="submitting" @click="submitApplication">{{ submitting ? '提交中' : '提交申请' }}</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { loginByCode, loginByPassword, sendSmsCode, submitMerchantApplication, verifySmsCode, wechatPhoneLogin, wechatSilentLogin } from '../../api/auth.js';
import { getToken } from '../../utils/request.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';

const PHONE_RE = /^1[3-9]\d{9}$/;

export default {
  components: { AppTopbar },
  data() {
    return {
      submitting: false,
      silentChecking: false,
      manualOpen: false,
      authMode: 'login',
      mode: 'password',
      countdown: 0,
      applyCountdown: 0,
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
      },
      applyForm: {
        companyName: '',
        contactName: '',
        phone: '',
        applyCode: '',
        inviteCode: '',
        note: ''
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
    switchAuthMode(key) {
      this.authMode = key;
      this.errorText = '';
      if (key === 'apply') this.manualOpen = false;
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
        this.startCountdown('login');
        uni.showToast({ title: '验证码已发送', icon: 'success' });
      } catch (error) {
        this.errorText = error.message || '验证码发送失败';
      }
    },
    async sendApplyCode() {
      const phone = String(this.applyForm.phone || '').trim();
      if (!PHONE_RE.test(phone)) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' });
        return;
      }
      this.errorText = '';
      try {
        await sendSmsCode({ phone, scene: 'APPLICATION' });
        this.startCountdown('apply');
        uni.showToast({ title: '验证码已发送', icon: 'success' });
      } catch (error) {
        this.errorText = error.message || '验证码发送失败';
      }
    },
    startCountdown(target) {
      this.clearTimer();
      if (target === 'apply') this.applyCountdown = 60;
      else this.countdown = 60;
      this.timer = setInterval(() => {
        this.countdown = Math.max(0, this.countdown - 1);
        this.applyCountdown = Math.max(0, this.applyCountdown - 1);
        if (this.countdown <= 0 && this.applyCountdown <= 0) this.clearTimer();
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
    },
    async submitApplication() {
      const payload = {
        companyName: String(this.applyForm.companyName || '').trim(),
        contactName: String(this.applyForm.contactName || '').trim(),
        phone: String(this.applyForm.phone || '').trim(),
        inviteCode: String(this.applyForm.inviteCode || '').trim(),
        note: String(this.applyForm.note || '').trim()
      };
      const code = String(this.applyForm.applyCode || '').trim();
      if (!payload.companyName || !payload.contactName) {
        uni.showToast({ title: '请填写商家名称和联系人', icon: 'none' });
        return;
      }
      if (!PHONE_RE.test(payload.phone)) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' });
        return;
      }
      if (!/^\d{6}$/.test(code)) {
        uni.showToast({ title: '请输入 6 位验证码', icon: 'none' });
        return;
      }
      this.errorText = '';
      this.submitting = true;
      try {
        const verified = await verifySmsCode({ phone: payload.phone, code, scene: 'APPLICATION' });
        await submitMerchantApplication({ ...payload, smsToken: verified?.smsToken });
        uni.showToast({ title: '申请已提交', icon: 'success' });
        this.authMode = 'login';
        this.applyForm = { companyName: '', contactName: '', phone: '', applyCode: '', inviteCode: '', note: '' };
      } catch (error) {
        this.errorText = error.message || '申请提交失败';
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style>
.login-page { position: relative; padding-top: 0; overflow: hidden; }
.auth-shell { position: relative; padding: 28rpx 0 56rpx; }
.auth-grid { position: absolute; left: -24rpx; right: -24rpx; top: 0; height: 520rpx; opacity: .22; background: linear-gradient(rgba(255,255,255,.08) 1rpx, transparent 1rpx), linear-gradient(90deg, rgba(255,255,255,.06) 1rpx, transparent 1rpx); background-size: 64rpx 64rpx; }
.auth-glow { position: absolute; border-radius: 999rpx; pointer-events: none; }
.auth-glow-one { width: 360rpx; height: 360rpx; left: -180rpx; top: 42rpx; background: rgba(242,213,140,.16); }
.auth-glow-two { width: 440rpx; height: 440rpx; right: -220rpx; top: 260rpx; background: rgba(95,128,180,.16); }
.login-hero, .auth-card { position: relative; z-index: 1; }
.login-hero { padding: 28rpx 4rpx 26rpx; }
.brand-row { display: flex; align-items: center; }
.hero-mark { width: 96rpx; height: 96rpx; flex: 0 0 96rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; color: #181207; background: linear-gradient(135deg,#f3da94,#c79b3b); box-shadow: 0 18rpx 48rpx rgba(199,155,59,.24); }
.brand-copy { min-width: 0; margin-left: 18rpx; }
.brand-name { display: block; color: #fff; font-size: 34rpx; font-weight: 900; line-height: 1.12; }
.brand-subtitle { display: block; margin-top: 8rpx; color: #aeb8c5; font-size: 23rpx; }
.login-title { display: block; margin-top: 44rpx; color: #fff; font-size: 54rpx; line-height: 1.08; font-weight: 900; }
.login-desc { display: block; margin-top: 16rpx; color: #aeb8c5; font-size: 26rpx; line-height: 1.65; }
.hero-stats { display: flex; margin-top: 28rpx; }
.hero-stat { flex: 1; min-height: 98rpx; padding: 18rpx 14rpx; box-sizing: border-box; border: 1rpx solid rgba(255,255,255,.12); border-radius: 8rpx; background: rgba(255,255,255,.045); }
.hero-stat + .hero-stat { margin-left: 12rpx; }
.hero-stat-value { display: block; color: #f2d58c; font-size: 27rpx; line-height: 1.1; font-weight: 900; }
.hero-stat-label { display: block; margin-top: 10rpx; color: #c7d0db; font-size: 21rpx; line-height: 1.2; }
.auth-card { margin-top: 16rpx; padding: 24rpx; border-radius: 8rpx; border: 1rpx solid rgba(255,255,255,.14); background: linear-gradient(180deg, rgba(22,27,34,.96), rgba(13,16,21,.98)); box-shadow: 0 30rpx 90rpx rgba(0,0,0,.44); }
.auth-mode-tabs { display: flex; padding: 6rpx; border-radius: 8rpx; background: #0c1118; border: 1rpx solid rgba(255,255,255,.12); }
.auth-mode-tab { flex: 1; height: 70rpx; display: flex; align-items: center; justify-content: center; border-radius: 6rpx; color: #aeb8c5; font-size: 26rpx; font-weight: 900; }
.auth-mode-tab.active { color: #141414; background: linear-gradient(135deg,#d8b86a,#f5dfa2); }
.auth-panel { margin-top: 26rpx; }
.card-head { display: flex; align-items: center; margin-bottom: 22rpx; }
.card-head-icon { width: 68rpx; height: 68rpx; flex: 0 0 68rpx; display: flex; align-items: center; justify-content: center; margin-right: 16rpx; border-radius: 8rpx; background: linear-gradient(135deg,#d8b86a,#f5dfa2); }
.card-eyebrow { display: block; color: #f2d58c; font-size: 23rpx; font-weight: 900; }
.card-title { display: block; margin-top: 4rpx; color: #fff; font-size: 36rpx; font-weight: 900; line-height: 1.1; }
.wechat-card { padding: 24rpx; border-radius: 8rpx; border: 1rpx solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); }
.wechat-head { margin-bottom: 20rpx; }
.wechat-title { display: block; color: #fff4df; font-size: 30rpx; font-weight: 900; }
.wechat-desc { display: block; margin-top: 8rpx; color: rgba(255,244,223,.62); font-size: 23rpx; line-height: 1.5; }
.wechat-btn { margin-top: 6rpx; border-radius: 8rpx; }
.wechat-tip { display: block; margin-top: 18rpx; color: rgba(255,244,223,.54); font-size: 22rpx; line-height: 1.55; }
.manual-toggle { height: 76rpx; margin-top: 20rpx; padding: 0 20rpx; display: flex; align-items: center; justify-content: space-between; border-radius: 8rpx; color: rgba(255,244,223,.76); background: rgba(255,255,255,.035); border: 1rpx solid rgba(255,255,255,.1); }
.manual-toggle text { font-size: 25rpx; font-weight: 900; }
.manual-toggle-action { color: #f3dc9a; font-size: 24rpx; }
.manual-panel { margin-top: 18rpx; }
.login-tabs { display: flex; padding: 6rpx; border-radius: 8rpx; border: 1rpx solid rgba(255,255,255,.12); background: #0c1118; }
.login-tab { flex: 1; height: 70rpx; display: flex; align-items: center; justify-content: center; border-radius: 6rpx; color: #aeb8c5; font-size: 24rpx; font-weight: 900; }
.login-tab + .login-tab { margin-left: 6rpx; }
.login-tab .app-icon { margin-right: 8rpx; }
.login-tab.active { color: #181207; background: linear-gradient(135deg,#d8b86a,#f5dfa2); }
.login-form { margin-top: 20rpx; }
.field { margin-bottom: 20rpx; }
.field text { display: block; margin-bottom: 10rpx; color: #d9e1eb; font-size: 24rpx; font-weight: 900; }
.field input, .field textarea { width: 100%; box-sizing: border-box; border-radius: 8rpx; color: #fff4df; background: #0c1118; border: 1rpx solid rgba(255,255,255,.14); font-size: 27rpx; }
.field input { height: 86rpx; padding: 0 22rpx; }
.field textarea { min-height: 140rpx; padding: 20rpx 22rpx; line-height: 1.55; }
.code-row { display: flex; align-items: stretch; }
.code-row input { flex: 1; min-width: 0; border-radius: 8rpx 0 0 8rpx; }
.code-btn { width: 190rpx; height: 86rpx; flex: 0 0 190rpx; border-radius: 0 8rpx 8rpx 0; font-size: 23rpx; }
.apply-note { margin-bottom: 20rpx; padding: 18rpx 20rpx; border-radius: 8rpx; border: 1rpx solid rgba(242,213,140,.18); background: rgba(242,213,140,.08); }
.apply-note text { color: #f2d58c; font-size: 23rpx; line-height: 1.6; }
.apply-form .primary-btn, .login-form .primary-btn { margin-top: 8rpx; border-radius: 8rpx; }
.error-card { margin: 20rpx 0 0; padding: 18rpx 20rpx; border-radius: 8rpx; font-size: 23rpx; line-height: 1.6; border: 1rpx solid rgba(255,112,112,.25); background: rgba(255,112,112,.08); color: #ffb4a8; }
</style>
