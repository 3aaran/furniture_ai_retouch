<template>
  <view class="page feedback-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" show-back back-url="/pages/mine/index" @profile="goMine" />

    <view class="page-head">
      <view class="page-head-main">
        <view class="page-icon"><app-icon name="message" tone="dark" :size="34" /></view>
        <view class="page-title-text">
          <b>问题反馈</b>
          <text>提交后平台管理员会在后台统一处理</text>
        </view>
      </view>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="form-card">
      <label>
        <text>反馈标题</text>
        <input v-model="form.title" placeholder="例如：图片生成失败" />
      </label>
      <label>
        <text>联系方式（可选）</text>
        <input v-model="form.contact" placeholder="手机号 / 微信 / 其他联系方式" />
      </label>
      <label>
        <text>反馈内容</text>
        <textarea v-model="form.content" placeholder="请描述问题现象、操作步骤或希望改进的地方" />
      </label>
      <button class="primary-btn submit-btn" :disabled="submitting" @click="submit">{{ submitting ? '提交中' : '提交反馈' }}</button>
    </view>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getCurrentUser, submitFeedback } from '../../api/user.js';
import { requireLogin } from '../../utils/auth.js';
import { displayName, unwrapUser } from '../../utils/model.js';

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      form: { title: '', contact: '', content: '' },
      submitting: false,
      errorText: ''
    };
  },
  computed: {
    topbarAvatar() { return displayName(this.user).slice(0, 1) || '勋'; }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
  },
  methods: {
    async loadUser() {
      try { this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {}; } catch (e) {}
    },
    async submit() {
      const title = this.form.title.trim();
      const content = this.form.content.trim();
      if (!title) return uni.showToast({ title: '请输入反馈标题', icon: 'none' });
      if (!content) return uni.showToast({ title: '请输入反馈内容', icon: 'none' });
      this.submitting = true;
      this.errorText = '';
      try {
        await submitFeedback({ title, content, contact: this.form.contact.trim() });
        this.form = { title: '', contact: '', content: '' };
        uni.showToast({ title: '问题反馈已提交', icon: 'success' });
      } catch (error) {
        this.errorText = error.message || '反馈提交失败';
      } finally {
        this.submitting = false;
      }
    },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style>
.form-card { display: grid; gap: 20rpx; padding: 24rpx; border-radius: 28rpx; background: #111317; border: 1rpx solid rgba(255,255,255,.09); }
.form-card label { display: grid; gap: 12rpx; }
.form-card label text { color: rgba(255,246,220,.72); font-size: 25rpx; font-weight: 800; }
.form-card input, .form-card textarea { width: 100%; box-sizing: border-box; border-radius: 20rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.045); color: #fff6dc; font-size: 28rpx; }
.form-card input { height: 82rpx; padding: 0 22rpx; }
.form-card textarea { min-height: 260rpx; padding: 22rpx; }
.submit-btn { margin-top: 8rpx; }
.error-card { margin-bottom: 18rpx; padding: 18rpx; border-radius: 18rpx; background: rgba(255,112,112,.08); color: #ffb4a8; border: 1rpx solid rgba(255,112,112,.22); font-size: 24rpx; }
</style>
