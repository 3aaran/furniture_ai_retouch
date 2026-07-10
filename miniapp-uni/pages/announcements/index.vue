<template>
  <view class="page announcements-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" show-back back-url="/pages/mine/index" @profile="goMine" />

    <view class="page-head">
      <view class="page-head-main">
        <view class="page-icon"><app-icon name="mail" tone="dark" :size="34" /></view>
        <view class="page-title-text">
          <text class="ui-strong">公告邮箱</text>
          <text>{{ unreadCount }} 条未读</text>
        </view>
      </view>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="notice-list">
      <view v-for="item in items" :key="item.id" :class="['notice-card', item.isRead ? 'is-read' : 'is-unread']" @click="openNotice(item)">
        <view class="notice-state"><app-icon :name="item.isRead ? 'check' : 'mail'" :tone="item.isRead ? 'muted' : 'dark'" :size="24" /></view>
        <view class="notice-copy">
          <text class="ui-strong">{{ item.title }}</text>
          <text>{{ item.content }}</text>
          <text class="ui-small">{{ fmtTime(item.createdAt) }}</text>
        </view>
      </view>
    </view>

    <view v-if="!items.length && !loading" class="empty-card">暂无公告</view>
    <view v-if="loading" class="empty-card">公告加载中...</view>

    <view v-if="selected" class="modal-mask" @click="selected = null">
      <view class="notice-modal" @click.stop>
        <view class="modal-head">
          <view>
            <text>{{ selected.isRead ? '已读' : '未读' }}</text>
            <text class="ui-strong">{{ selected.title }}</text>
          </view>
          <button @click="selected = null"><app-icon name="x" :size="28" /></button>
        </view>
        <scroll-view scroll-y class="modal-body">
          <text>{{ selected.content }}</text>
        </scroll-view>
        <text class="ui-small">{{ fmtTime(selected.createdAt) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getAnnouncements, getCurrentUser, markAnnouncementRead } from '../../api/user.js';
import { requireLogin } from '../../utils/auth.js';
import { displayName, fmtTime, unwrapUser } from '../../utils/model.js';

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      items: [],
      unreadCount: 0,
      selected: null,
      loading: false,
      errorText: ''
    };
  },
  computed: {
    topbarAvatar() { return displayName(this.user).slice(0, 1) || '勋'; }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
    this.reload();
  },
  methods: {
    fmtTime,
    async loadUser() {
      try { this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {}; } catch (e) {}
    },
    async reload() {
      this.loading = true;
      this.errorText = '';
      try {
        const payload = await getAnnouncements({ showLoading: false });
        this.items = Array.isArray(payload?.items) ? payload.items : [];
        this.unreadCount = Number(payload?.unreadCount || this.items.filter(item => !item.isRead).length);
      } catch (error) {
        this.errorText = error.message || '公告读取失败';
        this.items = [];
      } finally {
        this.loading = false;
      }
    },
    async openNotice(item) {
      this.selected = item;
      if (item.isRead) return;
      item.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      try {
        await markAnnouncementRead(item.id);
      } catch (error) {
        this.errorText = error.message || '公告已读状态同步失败';
      }
    },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style scoped>
.notice-list { display: grid; gap: 18rpx; }
.notice-card { display: flex; gap: 18rpx; padding: 20rpx; border-radius: 24rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.1); }
.notice-card.is-unread { border-color: rgba(var(--xg-color-primary-rgb), .42); background: rgba(var(--xg-color-primary-rgb), .08); }
.notice-state { width: 76rpx; height: 44rpx; flex: 0 0 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; background: var(--xg-color-primary); color: var(--xg-text-inverse); font-size: 22rpx; font-weight: 900; }
.notice-card.is-read .notice-state { background: rgba(255,255,255,.08); color: var(--xg-text-muted); }
.notice-copy { flex: 1; min-width: 0; }
.notice-copy .ui-strong { display: block; color: var(--xg-text-main); font-size: 29rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-copy text { display: block; margin-top: 8rpx; color: var(--xg-text-muted); font-size: 24rpx; line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-copy .ui-small { display: block; margin-top: 10rpx; color: var(--xg-text-muted); font-size: 22rpx; }
.modal-mask { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-end; padding: 20rpx; box-sizing: border-box; background: rgba(0,0,0,.58); }
.notice-modal { width: 100%; max-height: 78vh; box-sizing: border-box; padding: 24rpx; border-radius: 30rpx 30rpx 0 0; background: var(--xg-bg-card); border: 1rpx solid rgba(var(--xg-color-primary-rgb), .18); }
.modal-head { display: flex; justify-content: space-between; gap: 18rpx; margin-bottom: 18rpx; }
.modal-head text { display: block; color: var(--xg-color-primary); font-size: 23rpx; }
.modal-head .ui-strong { display: block; margin-top: 4rpx; color: var(--xg-text-main); font-size: 34rpx; font-weight: 900; }
.modal-head button { width: 72rpx; height: 72rpx; padding: 0; border-radius: 22rpx; color: var(--xg-color-primary); background: rgba(255,255,255,.055); border: 1rpx solid rgba(255,255,255,.13); font-size: 30rpx; }
.modal-body { max-height: 52vh; color: var(--xg-text-muted); font-size: 28rpx; line-height: 1.7; white-space: pre-wrap; }
.notice-modal .ui-small { display: block; margin-top: 18rpx; color: var(--xg-text-muted); font-size: 22rpx; }
.empty-card, .error-card { margin-top: 20rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); color: var(--xg-text-muted); font-size: 26rpx; border: 1rpx solid rgba(255,255,255,.08); }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
</style>
