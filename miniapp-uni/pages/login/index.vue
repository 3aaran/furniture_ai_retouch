<template>
  <view class="page login-page">
    <view class="auth-shell">
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
              <text class="wechat-desc">点击按钮授权手机号后登录已开通账号</text>
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

const PHONE_RE = /^1[3-9]\d{9}$/;

export default {
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
  onShow() {
    if (getToken()) this.redirectAfterLogin();
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

<style scoped>
.login-page { min-height: 100vh; padding: 0 28rpx; box-sizing: border-box; background: var(--xg-bg-page); color: var(--xg-text-main); overflow: hidden; }
.auth-shell { min-height: 100vh; display: flex; align-items: center; padding: 36rpx 0 calc(28rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.auth-card { width: 100%; max-width: 860rpx; margin: 0 auto; padding: 40rpx; box-sizing: border-box; border-radius: 40rpx; border: 1rpx solid var(--xg-border-soft); background: rgba(255,255,255,.94); box-shadow: var(--xg-shadow-soft); }
.auth-mode-tabs { display: flex; padding: 10rpx; border-radius: 40rpx; background: var(--xg-bg-card-soft); border: 1rpx solid var(--xg-border-soft); }
.auth-mode-tab { flex: 1; height: 82rpx; display: flex; align-items: center; justify-content: center; border-radius: 28rpx; color: var(--xg-text-muted); font-size: 28rpx; font-weight: 900; }
.auth-mode-tab.active { color: var(--xg-text-inverse); background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); box-shadow: var(--xg-shadow-soft); }
.auth-panel { margin-top: 32rpx; }
.card-head { display: flex; align-items: center; margin-bottom: 28rpx; }
.card-head-icon { width: 56rpx; height: 56rpx; flex: 0 0 56rpx; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; border-radius: 14rpx; background: rgba(var(--xg-color-primary-rgb),.12); border: 1rpx solid rgba(var(--xg-color-primary-rgb),.26); }
.card-head-icon .app-icon { color: var(--xg-color-primary); }
.card-eyebrow { display: block; color: var(--xg-color-primary); font-size: 24rpx; font-weight: 900; }
.card-title { display: block; margin-top: 8rpx; color: var(--xg-text-main); font-size: 48rpx; font-weight: 900; line-height: 1.1; }
.wechat-card { padding: 24rpx; border-radius: 28rpx; border: 1rpx solid var(--xg-border-soft); background: var(--xg-bg-card-soft); }
.wechat-head { margin-bottom: 20rpx; }
.wechat-title { display: block; color: var(--xg-text-main); font-size: 30rpx; font-weight: 900; }
.wechat-desc { display: block; margin-top: 10rpx; color: var(--xg-text-muted); font-size: 24rpx; line-height: 1.55; }
.wechat-btn { margin-top: 8rpx; border-radius: 28rpx; }
.wechat-tip { display: block; margin-top: 18rpx; color: var(--xg-text-muted); font-size: 22rpx; line-height: 1.55; }
.manual-toggle { height: 78rpx; margin-top: 22rpx; padding: 0 24rpx; display: flex; align-items: center; justify-content: space-between; border-radius: 999rpx; color: var(--xg-text-muted); background: var(--xg-bg-card); border: 1rpx solid var(--xg-border-soft); }
.manual-toggle text { font-size: 25rpx; font-weight: 900; }
.manual-toggle-action { color: var(--xg-color-primary); font-size: 24rpx; }
.manual-panel { margin-top: 20rpx; }
.login-tabs { display: flex; padding: 10rpx; border-radius: 28rpx; border: 1rpx solid var(--xg-border-soft); background: var(--xg-bg-card-soft); }
.login-tab { flex: 1; height: 78rpx; display: flex; align-items: center; justify-content: center; border-radius: 22rpx; color: var(--xg-text-muted); font-size: 24rpx; font-weight: 900; }
.login-tab + .login-tab { margin-left: 10rpx; }
.login-tab .app-icon { margin-right: 8rpx; }
.login-tab.active { color: var(--xg-text-inverse); background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); }
.login-form { margin-top: 20rpx; }
.field { margin-bottom: 20rpx; }
.field text { display: block; margin-bottom: 12rpx; color: var(--xg-text-main); font-size: 24rpx; font-weight: 900; }
.field input, .field textarea { width: 100%; box-sizing: border-box; border-radius: 28rpx; color: var(--xg-text-main); background: var(--xg-bg-card-soft); border: 1rpx solid var(--xg-border-soft); font-size: 27rpx; }
.field input { height: 94rpx; padding: 0 26rpx; }
.field textarea { min-height: 140rpx; padding: 20rpx 22rpx; line-height: 1.55; }
.code-row { display: flex; align-items: stretch; }
.code-row input { flex: 1; min-width: 0; border-radius: 28rpx 0 0 28rpx; }
.code-btn { width: 212rpx; height: 94rpx; flex: 0 0 212rpx; border-left: 0; border-radius: 0 28rpx 28rpx 0; color: var(--xg-color-primary); background: rgba(var(--xg-color-accent-rgb),.12); border-color: rgba(var(--xg-color-accent-rgb),.36); font-size: 23rpx; }
.apply-note { margin-bottom: 20rpx; padding: 20rpx 22rpx; border-radius: 28rpx; border: 1rpx solid rgba(var(--xg-color-primary-rgb),.22); background: rgba(var(--xg-color-primary-rgb),.12); }
.apply-note text { color: var(--xg-color-primary); font-size: 23rpx; line-height: 1.6; }
.apply-form .primary-btn, .login-form .primary-btn { margin-top: 12rpx; border-radius: 28rpx; }
.primary-btn { background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); color: var(--xg-text-inverse); box-shadow: var(--xg-shadow-soft); }
.secondary-btn { color: var(--xg-color-primary); background: rgba(var(--xg-color-accent-rgb),.12); border-color: rgba(var(--xg-color-accent-rgb),.36); }
.error-card { margin: 20rpx 0 0; padding: 18rpx 20rpx; border-radius: 28rpx; font-size: 23rpx; line-height: 1.6; border: 1rpx solid rgba(255,112,135,.28); background: rgba(255,112,135,.1); color: #cc3654; }
</style>
