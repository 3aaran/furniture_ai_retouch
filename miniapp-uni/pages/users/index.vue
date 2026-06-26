<template>
  <view class="page users-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" show-back back-url="/pages/mine/index" @profile="goMine" />

    <view class="users-hero">
      <view>
        <text class="eyebrow">门店成员</text>
        <text class="hero-title">用户管理</text>
      </view>
      <view class="quota-card">
        <text>门店编号 {{ merchantCodeText }}</text>
        <b>剩余算力 <em>{{ storeQuotaText }}</em></b>
      </view>
    </view>

    <view class="toolbar-card">
      <view class="search-box">
        <text>⌕</text>
        <input v-model="query.keyword" placeholder="搜索用户名、手机号" confirm-type="search" @confirm="reload" />
      </view>
      <view class="filter-row">
        <picker :range="roleNames" :value="roleIndex" @change="changeRole">
          <view class="picker-box">{{ currentRoleName }}<text>⌄</text></view>
        </picker>
        <picker :range="statusNames" :value="statusIndex" @change="changeStatus">
          <view class="picker-box">{{ currentStatusName }}<text>⌄</text></view>
        </picker>
      </view>
      <view class="action-row">
        <button class="secondary-btn action-btn" @click="generateTrial">生成体验账号</button>
        <button class="primary-btn action-btn" @click="openCreate">创建用户</button>
      </view>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="user-list">
      <view v-for="item in viewItems" :key="item.id" class="user-card">
        <view class="user-head">
          <view class="user-avatar">{{ item.avatar }}</view>
          <view class="user-main">
            <view class="name-line">
              <b>{{ item.name }}</b>
              <text :class="item.statusClass">{{ item.statusLabel }}</text>
            </view>
            <text class="account-line">{{ item.account }}</text>
          </view>
        </view>

        <view class="meta-grid">
          <view><text>角色</text><b>{{ item.roleLabel }}</b></view>
          <view><text>用户类型</text><b>{{ item.typeLabel }}</b></view>
          <view><text>算力点</text><b class="quota-text">{{ item.quotaLabel }}</b></view>
          <view><text>注册时间</text><b>{{ item.createdLabel }}</b></view>
          <view><text>过期时间</text><b>{{ item.expireLabel }}</b></view>
          <view><text>邮箱</text><b>{{ item.emailLabel }}</b></view>
        </view>

        <view class="card-actions" v-if="item.canManage">
          <button class="icon-btn" @click="toggleStatus(item.raw)">{{ item.statusAction }}</button>
          <button class="icon-btn" @click="openRecharge(item.raw)">充值</button>
          <button class="icon-btn" @click="openEdit(item.raw)">编辑</button>
          <button class="icon-btn danger" @click="removeUser(item.raw)">删除</button>
        </view>
        <view v-else class="owner-note">主账号不可删除或禁用</view>
      </view>
    </view>

    <view v-if="showEmpty" class="empty-card">暂无用户</view>
    <view v-if="loading" class="empty-card">正在读取用户列表...</view>
    <button v-if="canLoadMore" class="secondary-btn more-btn" @click="loadMore">查看更多用户</button>

    <view v-if="trialTicket" class="modal-mask" @click="closeTrial">
      <view class="modal-card" @click.stop>
        <view class="modal-head">
          <b>体验账号</b>
          <text @click="closeTrial">×</text>
        </view>
        <view class="ticket-box">
          <view><text>账号</text><b>{{ trialAccountText }}</b></view>
          <view><text>密码</text><b>{{ trialPasswordText }}</b></view>
          <view><text>初始算力</text><b>{{ trialQuotaText }}</b></view>
          <view><text>到期</text><b>{{ trialExpireText }}</b></view>
        </view>
        <button class="primary-btn modal-submit" @click="copyTrial">复制账号信息</button>
      </view>
    </view>

    <view v-if="modalOpen" class="modal-mask" @click="closeModal">
      <view class="modal-card" @click.stop>
        <view class="modal-head">
          <b>{{ modalTitle }}</b>
          <text @click="closeModal">×</text>
        </view>

        <view v-if="createOpen" class="form-grid">
          <picker :range="createRoleNames" :value="createRoleIndex" @change="changeCreateRole">
            <view class="form-picker"><text>用户角色</text><b>{{ currentCreateRoleName }}</b></view>
          </picker>
          <label><text>用户名 / 备注</text><input v-model="form.displayName" placeholder="例如：修图一组" /></label>
          <label><text>手机号</text><input v-model="form.phone" placeholder="用于登录" type="number" /></label>
          <label><text>初始密码</text><input v-model="form.password" placeholder="至少 6 位" /></label>
          <label v-if="form.role !== 'MERCHANT_ADMIN'"><text>初始算力点</text><input v-model="form.quota" type="number" /></label>
          <button class="primary-btn modal-submit" @click="submitCreate">确认创建</button>
        </view>

        <view v-if="editUser" class="form-grid">
          <label><text>用户名 / 备注</text><input v-model="editForm.displayName" /></label>
          <label v-if="editUser.role !== 'TRIAL'"><text>手机号</text><input v-model="editForm.phone" type="number" /></label>
          <label><text>新密码</text><input v-model="editForm.password" placeholder="不修改可留空" /></label>
          <button class="primary-btn modal-submit" @click="submitEdit">保存修改</button>
        </view>

        <view v-if="rechargeUser" class="form-grid">
          <view class="target-line">{{ rechargeTitle }}</view>
          <label><text>调整算力</text><input v-model="rechargeAmount" type="number" placeholder="可输入负数回收" /></label>
          <button class="primary-btn modal-submit" @click="submitRecharge">确认调整</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import {
  adjustMerchantUserQuota,
  createMerchantUser,
  deleteMerchantUser,
  getCurrentUser,
  getMerchantUsers,
  updateMerchantUser,
  updateMerchantUserStatus
} from '../../api/user.js';
import { requireLogin } from '../../utils/auth.js';
import { displayName, fmtTime, unwrapUser, userQuota } from '../../utils/model.js';

function firstValue() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function roleLabel(role) {
  const map = {
    MERCHANT_OWNER: '门店主账号',
    MERCHANT_ADMIN: '门店管理员',
    STAFF: '普通用户',
    TRIAL: '体验账号'
  };
  return map[role] || role || '-';
}

function userTypeLabel(role) {
  if (role === 'TRIAL') return '外部客户';
  if (role === 'MERCHANT_OWNER') return '门店主账号';
  return '内部员工';
}

function quotaLabel(item) {
  if (item.role === 'MERCHANT_OWNER' || item.role === 'MERCHANT_ADMIN') return '门店池';
  return String(Number(firstValue(item.quota, item.quotaBalance, item.quota_balance, 0)));
}

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {},
      items: [],
      viewItems: [],
      total: 0,
      merchantCode: '',
      merchantQuota: 0,
      loading: false,
      errorText: '',
      query: { keyword: '', role: '', status: '', page: 1, pageSize: 10 },
      roleOptions: [
        { key: '', name: '全部角色' },
        { key: 'MERCHANT_ADMIN', name: '门店管理员' },
        { key: 'STAFF', name: '普通用户' },
        { key: 'TRIAL', name: '体验账号' }
      ],
      statusOptions: [
        { key: '', name: '全部状态' },
        { key: 'ACTIVE', name: '启用账号' },
        { key: 'DISABLED', name: '禁用账号' }
      ],
      createOpen: false,
      editUser: null,
      rechargeUser: null,
      trialTicket: null,
      form: { phone: '', displayName: '', role: 'STAFF', quota: 0, password: '123456' },
      editForm: { displayName: '', phone: '', password: '' },
      rechargeAmount: 10
    };
  },
  computed: {
    topbarAvatar() { return displayName(this.user).slice(0, 1) || '勋'; },
    storeQuotaText() { return String(Number(firstValue(this.merchantQuota, userQuota(this.user), 0))); },
    merchantCodeText() { return this.merchantCode || this.user.merchantCode || '-'; },
    roleNames() { return this.roleOptions.map(function(item) { return item.name; }); },
    statusNames() { return this.statusOptions.map(function(item) { return item.name; }); },
    roleIndex() {
      for (let i = 0; i < this.roleOptions.length; i += 1) {
        if (this.roleOptions[i].key === this.query.role) return i;
      }
      return 0;
    },
    statusIndex() {
      for (let i = 0; i < this.statusOptions.length; i += 1) {
        if (this.statusOptions[i].key === this.query.status) return i;
      }
      return 0;
    },
    currentRoleName() { return this.roleNames[this.roleIndex] || '全部角色'; },
    currentStatusName() { return this.statusNames[this.statusIndex] || '全部状态'; },
    canLoadMore() { return this.viewItems.length > 0 && this.viewItems.length < this.total; },
    showEmpty() { return !this.viewItems.length && !this.loading; },
    createRoleOptions() {
      if (this.user.role === 'MERCHANT_OWNER') {
        return [
          { key: 'MERCHANT_ADMIN', name: '门店管理员' },
          { key: 'STAFF', name: '普通用户' }
        ];
      }
      return [{ key: 'STAFF', name: '普通用户' }];
    },
    createRoleNames() { return this.createRoleOptions.map(function(item) { return item.name; }); },
    createRoleIndex() {
      for (let i = 0; i < this.createRoleOptions.length; i += 1) {
        if (this.createRoleOptions[i].key === this.form.role) return i;
      }
      return 0;
    },
    currentCreateRoleName() { return this.createRoleNames[this.createRoleIndex] || '普通用户'; },
    modalOpen() { return this.createOpen || !!this.editUser || !!this.rechargeUser; },
    modalTitle() {
      if (this.createOpen) return '创建用户';
      if (this.editUser) return '编辑用户信息';
      return '用户算力调整';
    },
    rechargeTitle() {
      if (!this.rechargeUser) return '';
      return firstValue(this.rechargeUser.displayName, this.rechargeUser.username, this.rechargeUser.phone, '-');
    },
    trialAccountText() {
      if (!this.trialTicket) return '-';
      return firstValue(this.trialTicket.username, this.trialTicket.phone, '-');
    },
    trialPasswordText() {
      if (!this.trialTicket) return '-';
      return firstValue(this.trialTicket.password, '-');
    },
    trialQuotaText() {
      if (!this.trialTicket) return '50';
      return String(firstValue(this.trialTicket.quota, 50));
    },
    trialExpireText() {
      if (!this.trialTicket) return '-';
      return this.trialTicket.expireAt ? fmtTime(this.trialTicket.expireAt) : '按系统配置';
    }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
    this.reload();
  },
  methods: {
    async loadUser() {
      try {
        this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {};
      } catch (error) {}
    },
    async reload() {
      this.loading = true;
      this.errorText = '';
      try {
        const payload = await getMerchantUsers(this.query, { showLoading: false });
        const list = payload && Array.isArray(payload.items) ? payload.items : [];
        this.items = list;
        this.viewItems = list.map(this.toViewItem);
        this.total = Number(firstValue(payload && payload.total, list.length, 0));
        this.merchantQuota = Number(firstValue(payload && payload.merchantQuota, this.merchantQuota, 0));
        this.merchantCode = firstValue(payload && payload.merchantCode, this.user.merchantCode, '');
      } catch (error) {
        this.items = [];
        this.viewItems = [];
        this.total = 0;
        this.errorText = error.message || '用户列表读取失败';
      } finally {
        this.loading = false;
      }
    },
    toViewItem(item) {
      const name = firstValue(item.displayName, item.username, item.phone, '-');
      const createdAt = firstValue(item.createdAt, item.created_at, '');
      const expireAt = firstValue(item.trialExpireAt, item.trial_expire_at, '');
      const isActive = item.status === 'ACTIVE';
      return {
        id: item.id,
        raw: item,
        avatar: name.slice(0, 1) || '用',
        name,
        account: firstValue(item.phone, item.username, '-'),
        statusClass: isActive ? 'status-badge active' : 'status-badge',
        statusLabel: isActive ? '启用' : (item.status === 'DISABLED' ? '禁用' : firstValue(item.status, '-')),
        statusAction: isActive ? '禁用' : '启用',
        roleLabel: roleLabel(item.role),
        typeLabel: userTypeLabel(item.role),
        quotaLabel: quotaLabel(item),
        createdLabel: createdAt ? fmtTime(createdAt) : '-',
        expireLabel: item.role === 'TRIAL' ? (expireAt ? fmtTime(expireAt) : '按系统配置') : '-',
        emailLabel: firstValue(item.email, '-'),
        canManage: item.role !== 'MERCHANT_OWNER'
      };
    },
    changeRole(e) {
      const index = Number(e.detail.value) || 0;
      this.query.role = this.roleOptions[index] ? this.roleOptions[index].key : '';
      this.query.page = 1;
      this.query.pageSize = 10;
      this.reload();
    },
    changeStatus(e) {
      const index = Number(e.detail.value) || 0;
      this.query.status = this.statusOptions[index] ? this.statusOptions[index].key : '';
      this.query.page = 1;
      this.query.pageSize = 10;
      this.reload();
    },
    loadMore() {
      this.query.pageSize += 10;
      this.reload();
    },
    resetForm() {
      this.form = { phone: '', displayName: '', role: 'STAFF', quota: 0, password: '123456' };
    },
    openCreate() {
      this.resetForm();
      this.createOpen = true;
    },
    changeCreateRole(e) {
      const index = Number(e.detail.value) || 0;
      this.form.role = this.createRoleOptions[index] ? this.createRoleOptions[index].key : 'STAFF';
    },
    async submitCreate() {
      try {
        await createMerchantUser({
          phone: this.form.phone,
          displayName: this.form.displayName,
          role: this.form.role,
          quota: Number(this.form.quota || 0),
          password: this.form.password
        });
        this.closeModal();
        this.reload();
        uni.showToast({ title: '用户已创建', icon: 'success' });
      } catch (error) {}
    },
    async generateTrial() {
      if (Number(this.storeQuotaText) < 50) {
        uni.showToast({ title: '门店剩余算力不足', icon: 'none' });
        return;
      }
      try {
        const data = await createMerchantUser({ displayName: '体验账号', role: 'TRIAL', quota: 50, password: '123456' });
        this.trialTicket = data && data.account ? data.account : null;
        this.reload();
      } catch (error) {}
    },
    openEdit(item) {
      this.editUser = item;
      this.editForm = {
        displayName: firstValue(item.displayName, ''),
        phone: firstValue(item.phone, ''),
        password: ''
      };
    },
    async submitEdit() {
      if (!this.editUser) return;
      const body = { displayName: this.editForm.displayName };
      if (this.editUser.role !== 'TRIAL') body.phone = this.editForm.phone;
      if (this.editForm.password) body.password = this.editForm.password;
      try {
        await updateMerchantUser(this.editUser.id, body);
        this.closeModal();
        this.reload();
        uni.showToast({ title: '用户已更新', icon: 'success' });
      } catch (error) {}
    },
    openRecharge(item) {
      if (item.role === 'MERCHANT_OWNER' || item.role === 'MERCHANT_ADMIN') {
        uni.showToast({ title: '管理员使用门店额度池', icon: 'none' });
        return;
      }
      this.rechargeUser = item;
      this.rechargeAmount = 10;
    },
    async submitRecharge() {
      if (!this.rechargeUser) return;
      try {
        await adjustMerchantUserQuota(this.rechargeUser.id, Number(this.rechargeAmount || 0));
        this.closeModal();
        this.reload();
        uni.showToast({ title: '算力已调整', icon: 'success' });
      } catch (error) {}
    },
    async toggleStatus(item) {
      try {
        const next = item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        await updateMerchantUserStatus(item.id, next);
        this.reload();
        uni.showToast({ title: '状态已更新', icon: 'success' });
      } catch (error) {}
    },
    removeUser(item) {
      const name = firstValue(item.displayName, item.username, item.phone, '该账号');
      uni.showModal({
        title: '删除账号',
        content: `确定删除 ${name}？剩余算力会回收到门店额度池。`,
        success: async (res) => {
          if (!res.confirm) return;
          try {
            await deleteMerchantUser(item.id);
            this.reload();
            uni.showToast({ title: '账号已删除', icon: 'success' });
          } catch (error) {}
        }
      });
    },
    closeTrial() {
      this.trialTicket = null;
    },
    copyTrial() {
      if (!this.trialTicket) return;
      const text = `账号：${this.trialAccountText}\n密码：${this.trialPasswordText}\n初始算力：${this.trialQuotaText}\n到期：${this.trialExpireText}`;
      uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'success' }) });
    },
    closeModal() {
      this.createOpen = false;
      this.editUser = null;
      this.rechargeUser = null;
    },
    goMine() {
      uni.reLaunch({ url: '/pages/mine/index' });
    }
  }
};
</script>

<style>
.users-hero { margin-top: 22rpx; display: flex; align-items: stretch; gap: 16rpx; }
.users-hero > view:first-child { flex: 1; min-width: 0; padding: 24rpx; border-radius: 26rpx; background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025)); border: 1rpx solid rgba(255,255,255,.09); }
.eyebrow { display: block; color: rgba(255,246,220,.55); font-size: 22rpx; }
.hero-title { display: block; margin-top: 6rpx; color: #fff6dc; font-size: 42rpx; font-weight: 900; }
.quota-card { width: 260rpx; box-sizing: border-box; padding: 22rpx; border-radius: 26rpx; background: linear-gradient(135deg, rgba(239,212,130,.18), rgba(201,151,49,.08)); border: 1rpx solid rgba(239,212,130,.24); }
.quota-card text { display: block; color: rgba(255,246,220,.62); font-size: 22rpx; line-height: 1.35; }
.quota-card b { display: block; margin-top: 10rpx; color: #fff6dc; font-size: 24rpx; }
.quota-card em { color: #efd482; font-style: normal; font-size: 40rpx; font-weight: 900; }
.toolbar-card { margin: 18rpx 0; display: grid; gap: 14rpx; padding: 18rpx; border-radius: 26rpx; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); }
.search-box, .picker-box, .form-picker { height: 76rpx; box-sizing: border-box; display: flex; align-items: center; gap: 14rpx; padding: 0 22rpx; border-radius: 20rpx; background: rgba(5,6,8,.6); border: 1rpx solid rgba(255,255,255,.09); color: rgba(255,246,220,.74); }
.search-box input { flex: 1; color: #fff6dc; font-size: 27rpx; }
.filter-row, .action-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.picker-box { justify-content: space-between; color: #fff6dc; font-size: 26rpx; }
.action-btn { height: 82rpx; line-height: 82rpx; font-size: 27rpx; }
.user-list { display: grid; gap: 18rpx; }
.user-card { padding: 20rpx; border-radius: 26rpx; background: linear-gradient(180deg, rgba(22,23,25,.96), rgba(13,14,16,.98)); border: 1rpx solid rgba(255,255,255,.09); }
.user-head { display: flex; align-items: center; gap: 16rpx; }
.user-avatar { width: 78rpx; height: 78rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#fff1b8,#c99731); color: #161006; font-size: 30rpx; font-weight: 900; }
.user-main { flex: 1; min-width: 0; }
.name-line { display: flex; align-items: center; gap: 12rpx; }
.name-line b { flex: 1; min-width: 0; color: #fff6dc; font-size: 31rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-line { display: block; margin-top: 5rpx; color: rgba(255,246,220,.52); font-size: 23rpx; }
.status-badge { height: 42rpx; display: flex; align-items: center; padding: 0 16rpx; border-radius: 999rpx; color: #ffb4a8; background: rgba(255,112,112,.1); border: 1rpx solid rgba(255,112,112,.18); font-size: 22rpx; font-weight: 900; }
.status-badge.active { color: #63e0a0; background: rgba(99,224,160,.1); border-color: rgba(99,224,160,.2); }
.meta-grid { margin-top: 18rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.meta-grid view { min-width: 0; padding: 14rpx; border-radius: 18rpx; background: rgba(255,255,255,.035); }
.meta-grid text { display: block; color: rgba(255,246,220,.46); font-size: 21rpx; }
.meta-grid b { display: block; margin-top: 6rpx; color: #fff6dc; font-size: 23rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta-grid .quota-text { color: #efd482; }
.card-actions { margin-top: 18rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.icon-btn { height: 68rpx; line-height: 68rpx; border-radius: 18rpx; color: #fff6dc; background: rgba(255,255,255,.055); border: 1rpx solid rgba(255,255,255,.1); font-size: 24rpx; }
.icon-btn.danger { color: #ffb4a8; border-color: rgba(255,112,112,.2); background: rgba(255,112,112,.08); }
.owner-note { margin-top: 18rpx; padding: 16rpx; border-radius: 18rpx; color: rgba(255,246,220,.54); background: rgba(255,255,255,.035); font-size: 24rpx; text-align: center; }
.empty-card, .error-card { margin-top: 18rpx; padding: 24rpx; border-radius: 22rpx; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); color: rgba(255,246,220,.62); font-size: 26rpx; }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); }
.more-btn { margin-top: 20rpx; }
.modal-mask { position: fixed; z-index: 120; left: 0; right: 0; top: 0; bottom: 0; padding: 48rpx 28rpx; box-sizing: border-box; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.66); }
.modal-card { width: 100%; max-height: 86vh; overflow-y: auto; box-sizing: border-box; padding: 24rpx; border-radius: 28rpx; background: #111317; border: 1rpx solid rgba(239,212,130,.18); box-shadow: 0 30rpx 80rpx rgba(0,0,0,.45); }
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.modal-head b { color: #fff6dc; font-size: 32rpx; font-weight: 900; }
.modal-head text { width: 68rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; color: #efd482; font-size: 38rpx; }
.form-grid { display: grid; gap: 14rpx; }
.form-grid label { display: block; padding: 16rpx; border-radius: 20rpx; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); }
.form-grid label text, .form-picker text, .ticket-box text { display: block; color: rgba(255,246,220,.52); font-size: 22rpx; }
.form-grid input { margin-top: 8rpx; height: 58rpx; color: #fff6dc; font-size: 28rpx; }
.form-picker { height: 86rpx; justify-content: space-between; }
.form-picker b { color: #fff6dc; font-size: 27rpx; }
.modal-submit { margin-top: 8rpx; height: 84rpx; line-height: 84rpx; }
.target-line { padding: 18rpx; border-radius: 18rpx; color: #fff6dc; background: rgba(239,212,130,.08); font-size: 28rpx; font-weight: 900; }
.ticket-box { display: grid; gap: 12rpx; }
.ticket-box view { padding: 16rpx; border-radius: 18rpx; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); }
.ticket-box b { display: block; margin-top: 6rpx; color: #fff6dc; font-size: 28rpx; word-break: break-all; }
</style>
