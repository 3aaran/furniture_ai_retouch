<template>
  <view class="page users-page">
    <app-topbar title="用户管理" subtitle="成员与算力" :avatar-text="topbarAvatar" show-back back-url="/pages/workbench/index" @profile="goMine" />

    <view class="users-summary">
      <view class="summary-main">
        <view class="summary-icon"><app-icon name="users" tone="dark" :size="34" /></view>
        <view>
          <text class="summary-kicker">门店成员</text>
          <text class="summary-title">用户管理</text>
          <text class="summary-desc">成员、体验账号、算力。</text>
        </view>
      </view>
      <view class="summary-quota">
        <text class="summary-label">剩余算力</text>
        <text class="summary-value">{{ storeQuotaText }}</text>
        <text class="summary-code">门店编号：{{ merchantCodeText }}</text>
      </view>
    </view>

    <view v-if="!canManageUsers" class="notice-card">
      <text class="notice-title">当前账号暂无用户管理权限</text>
      <text class="notice-desc">请使用门店主账号或门店管理员账号进入用户管理。</text>
    </view>

    <view v-else class="toolbar-card">
      <view class="search-box">
        <app-icon name="search" :size="28" />
        <input class="search-input" v-model="query.keyword" placeholder="搜索用户名、手机号" confirm-type="search" @confirm="reload" />
      </view>
      <view class="filter-row">
        <picker :range="roleNames" :value="roleIndex" @change="changeRole">
          <view class="picker-box"><text>{{ currentRoleName }}</text><text>⌄</text></view>
        </picker>
        <picker :range="statusNames" :value="statusIndex" @change="changeStatus">
          <view class="picker-box"><text>{{ currentStatusName }}</text><text>⌄</text></view>
        </picker>
      </view>
      <view class="action-row">
        <button class="secondary-btn action-btn" @click="generateTrial">体验账号</button>
        <button class="primary-btn action-btn" @click="openCreate">创建用户</button>
      </view>
    </view>

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view v-if="canManageUsers" class="user-list">
      <view v-for="item in viewItems" :key="item.id" class="user-card">
        <view class="user-head">
          <view class="user-avatar">{{ item.avatar }}</view>
          <view class="user-main">
            <view class="name-line">
              <text class="user-name">{{ item.name }}</text>
              <text :class="item.statusClass">{{ item.statusLabel }}</text>
            </view>
            <text class="account-line">{{ item.account }}</text>
          </view>
        </view>

        <view class="meta-grid">
          <view class="meta-item"><text class="meta-item-label">角色</text><text class="meta-value">{{ item.roleLabel }}</text></view>
          <view class="meta-item"><text class="meta-item-label">类型</text><text class="meta-value">{{ item.typeLabel }}</text></view>
          <view class="meta-item"><text class="meta-item-label">算力点</text><text class="meta-value quota-text">{{ item.quotaLabel }}</text></view>
          <view class="meta-item"><text class="meta-item-label">注册时间</text><text class="meta-value">{{ item.createdLabel }}</text></view>
          <view class="meta-item"><text class="meta-item-label">过期时间</text><text class="meta-value">{{ item.expireLabel }}</text></view>
          <view class="meta-item"><text class="meta-item-label">邮箱</text><text class="meta-value">{{ item.emailLabel }}</text></view>
        </view>

        <view class="card-actions" v-if="item.canManage">
          <button class="mini-btn" @click="toggleStatus(item.raw)">{{ item.statusAction }}</button>
          <button class="mini-btn" @click="openRecharge(item.raw)">充值</button>
          <button class="mini-btn" @click="openEdit(item.raw)">编辑</button>
          <button class="mini-btn danger" @click="removeUser(item.raw)">删除</button>
        </view>
        <view v-else class="owner-note">主账号不可删除或禁用</view>
      </view>
    </view>

    <view v-if="showEmpty && canManageUsers" class="empty-card">暂无用户</view>
    <view v-if="loading" class="empty-card">正在读取用户列表...</view>
    <button v-if="canLoadMore && canManageUsers" class="secondary-btn more-btn" @click="loadMore">查看更多用户</button>

    <view v-if="trialTicket" class="modal-mask" @click="closeTrial">
      <view class="modal-card" @click.stop>
        <view class="modal-head">
          <text class="modal-title">体验账号</text>
          <view class="modal-close" @click="closeTrial"><app-icon name="x" :size="28" /></view>
        </view>
        <view class="ticket-box">
          <view class="ticket-row"><text class="ticket-label">账号</text><text class="ticket-value">{{ trialAccountText }}</text></view>
          <view class="ticket-row"><text class="ticket-label">密码</text><text class="ticket-value">{{ trialPasswordText }}</text></view>
          <view class="ticket-row"><text class="ticket-label">初始算力</text><text class="ticket-value">{{ trialQuotaText }}</text></view>
          <view class="ticket-row"><text class="ticket-label">到期</text><text class="ticket-value">{{ trialExpireText }}</text></view>
        </view>
        <button class="primary-btn modal-submit" @click="copyTrial">复制账号信息</button>
      </view>
    </view>

    <view v-if="modalOpen" class="modal-mask" @click="closeModal">
      <view class="modal-card" @click.stop>
        <view class="modal-head">
          <text class="modal-title">{{ modalTitle }}</text>
          <view class="modal-close" @click="closeModal"><app-icon name="x" :size="28" /></view>
        </view>

        <view v-if="createOpen" class="form-grid">
          <picker :range="createRoleNames" :value="createRoleIndex" @change="changeCreateRole">
            <view class="form-picker"><text class="form-picker-label">用户角色</text><text class="form-picker-value">{{ currentCreateRoleName }}</text></view>
          </picker>
          <view class="form-field"><text class="field-label">用户名 / 备注</text><input v-model="form.displayName" placeholder="例如：修图一组" /></view>
          <view class="form-field"><text class="field-label">手机号</text><input v-model="form.phone" placeholder="用于登录" type="number" /></view>
          <view class="form-field"><text class="field-label">初始密码</text><input v-model="form.password" placeholder="至少 6 位" /></view>
          <view v-if="form.role !== 'MERCHANT_ADMIN'" class="form-field"><text class="field-label">初始算力点</text><input v-model="form.quota" type="number" /></view>
          <button class="primary-btn modal-submit" @click="submitCreate">确认创建</button>
        </view>

        <view v-if="editUser" class="form-grid">
          <view class="form-field"><text class="field-label">用户名 / 备注</text><input v-model="editForm.displayName" /></view>
          <view v-if="editUser.role !== 'TRIAL'" class="form-field"><text class="field-label">手机号</text><input v-model="editForm.phone" type="number" /></view>
          <view class="form-field"><text class="field-label">新密码</text><input v-model="editForm.password" placeholder="不修改可留空" /></view>
          <button class="primary-btn modal-submit" @click="submitEdit">保存修改</button>
        </view>

        <view v-if="rechargeUser" class="form-grid">
          <view class="target-line">{{ rechargeTitle }}</view>
          <view class="form-field"><text class="field-label">调整算力</text><input v-model="rechargeAmount" type="number" placeholder="可输入负数回收" /></view>
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

function unwrapUserList(payload) {
  const source = payload && payload.data !== undefined ? payload.data : payload;
  const candidates = [
    source && source.items,
    source && source.list,
    source && source.users,
    source && source.rows,
    payload && payload.items,
    payload && payload.list,
    payload && payload.users,
    Array.isArray(source) ? source : null,
    Array.isArray(payload) ? payload : null
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    if (Array.isArray(candidates[i])) return candidates[i];
  }
  return [];
}

function unwrapTotal(payload, list) {
  const source = payload && payload.data !== undefined ? payload.data : payload;
  return Number(firstValue(source && source.total, payload && payload.total, list.length, 0));
}

function roleLabel(role) {
  const map = {
    PLATFORM_ADMIN: '平台管理员',
    SYSTEM_ADMIN: '平台管理员',
    STORE_OWNER: '门店主账号',
    STORE_ADMIN: '门店管理员',
    MERCHANT_OWNER: '门店主账号',
    MERCHANT_ADMIN: '门店管理员',
    INTERNAL_STAFF: '内部人员',
    STAFF: '普通用户',
    USER: '普通用户',
    TRIAL: '体验账号',
    user: '普通用户',
    admin: '管理员'
  };
  return map[role] || role || '-';
}

function userTypeLabel(role) {
  if (role === 'TRIAL') return '外部客户';
  if (role === 'PLATFORM_ADMIN' || role === 'SYSTEM_ADMIN') return '平台管理员';
  if (role === 'STORE_OWNER' || role === 'MERCHANT_OWNER') return '门店主账号';
  if (role === 'STORE_ADMIN' || role === 'MERCHANT_ADMIN') return '门店管理员';
  return '内部员工';
}

function quotaLabel(item) {
  if (['STORE_OWNER', 'STORE_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_ADMIN'].indexOf(item.role) >= 0) return '门店池';
  return String(Number(firstValue(item.quota, item.quotaBalance, item.quota_balance, item.balance, 0)));
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
    canManageUsers() { return ['PLATFORM_ADMIN', 'SYSTEM_ADMIN', 'STORE_OWNER', 'STORE_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_ADMIN', 'admin'].indexOf(this.user.role) >= 0; },
    roleNames() { return this.roleOptions.map(function(item) { return item.name; }); },
    statusNames() { return this.statusOptions.map(function(item) { return item.name; }); },
    roleIndex() { return Math.max(0, this.roleOptions.findIndex((item) => item.key === this.query.role)); },
    statusIndex() { return Math.max(0, this.statusOptions.findIndex((item) => item.key === this.query.status)); },
    currentRoleName() { return this.roleNames[this.roleIndex] || '全部角色'; },
    currentStatusName() { return this.statusNames[this.statusIndex] || '全部状态'; },
    canLoadMore() { return this.viewItems.length > 0 && this.viewItems.length < this.total; },
    showEmpty() { return !this.viewItems.length && !this.loading && !this.errorText; },
    createRoleOptions() {
      if (['PLATFORM_ADMIN', 'SYSTEM_ADMIN', 'STORE_OWNER', 'MERCHANT_OWNER', 'admin'].indexOf(this.user.role) >= 0) {
        return [
          { key: 'MERCHANT_ADMIN', name: '门店管理员' },
          { key: 'STAFF', name: '普通用户' }
        ];
      }
      return [{ key: 'STAFF', name: '普通用户' }];
    },
    createRoleNames() { return this.createRoleOptions.map(function(item) { return item.name; }); },
    createRoleIndex() { return Math.max(0, this.createRoleOptions.findIndex((item) => item.key === this.form.role)); },
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
    this.bootstrap();
  },
  methods: {
    async bootstrap() {
      await this.loadUser();
      if (this.canManageUsers) await this.reload();
    },
    async loadUser() {
      try {
        this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {};
      } catch (error) {
        this.user = {};
      }
    },
    async reload() {
      this.loading = true;
      this.errorText = '';
      try {
        const payload = await getMerchantUsers(this.query, { showLoading: false });
        const list = unwrapUserList(payload);
        const source = payload && payload.data !== undefined ? payload.data : payload;
        this.items = list;
        this.viewItems = list.map(this.toViewItem);
        this.total = unwrapTotal(payload, list);
        this.merchantQuota = Number(firstValue(source && source.merchantQuota, payload && payload.merchantQuota, this.merchantQuota, 0));
        this.merchantCode = firstValue(source && source.merchantCode, payload && payload.merchantCode, this.user.merchantCode, '');
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
      const name = firstValue(item.displayName, item.name, item.username, item.phone, '-');
      const createdAt = firstValue(item.createdAt, item.created_at, item.createdTime, '');
      const expireAt = firstValue(item.trialExpireAt, item.trial_expire_at, item.expireAt, '');
      const status = firstValue(item.status, 'ACTIVE');
      const isActive = status === 'ACTIVE' || status === 'enabled' || status === '正常';
      return {
        id: firstValue(item.id, item.userId, item.phone, name),
        raw: item,
        avatar: name.slice(0, 1) || '用',
        name,
        account: firstValue(item.phone, item.username, '-'),
        statusClass: isActive ? 'status-badge active' : 'status-badge',
        statusLabel: isActive ? '启用' : (status === 'DISABLED' ? '禁用' : firstValue(status, '-')),
        statusAction: isActive ? '禁用' : '启用',
        roleLabel: roleLabel(item.role),
        typeLabel: userTypeLabel(item.role),
        quotaLabel: quotaLabel(item),
        createdLabel: createdAt ? fmtTime(createdAt) : '-',
        expireLabel: item.role === 'TRIAL' ? (expireAt ? fmtTime(expireAt) : '按系统配置') : '-',
        emailLabel: firstValue(item.email, '-'),
        canManage: item.role !== 'MERCHANT_OWNER' && item.role !== 'STORE_OWNER'
      };
    },
    changeRole(e) { this.query.role = this.roleOptions[Number(e.detail.value) || 0]?.key || ''; this.query.page = 1; this.query.pageSize = 10; this.reload(); },
    changeStatus(e) { this.query.status = this.statusOptions[Number(e.detail.value) || 0]?.key || ''; this.query.page = 1; this.query.pageSize = 10; this.reload(); },
    loadMore() { this.query.pageSize += 10; this.reload(); },
    resetForm() { this.form = { phone: '', displayName: '', role: 'STAFF', quota: 0, password: '123456' }; },
    openCreate() { this.resetForm(); this.createOpen = true; },
    changeCreateRole(e) { this.form.role = this.createRoleOptions[Number(e.detail.value) || 0]?.key || 'STAFF'; },
    async submitCreate() {
      try {
        await createMerchantUser({ phone: this.form.phone, displayName: this.form.displayName, role: this.form.role, quota: Number(this.form.quota || 0), password: this.form.password });
        this.closeModal(); this.reload(); uni.showToast({ title: '用户已创建', icon: 'success' });
      } catch (error) {}
    },
    async generateTrial() {
      if (Number(this.storeQuotaText) < 50) return uni.showToast({ title: '门店剩余算力不足', icon: 'none' });
      try { const data = await createMerchantUser({ displayName: '体验账号', role: 'TRIAL', quota: 50, password: '123456' }); this.trialTicket = data && data.account ? data.account : data; this.reload(); } catch (error) {}
    },
    openEdit(item) { this.editUser = item; this.editForm = { displayName: firstValue(item.displayName, item.name, ''), phone: firstValue(item.phone, ''), password: '' }; },
    async submitEdit() {
      if (!this.editUser) return;
      const body = { displayName: this.editForm.displayName };
      if (this.editUser.role !== 'TRIAL') body.phone = this.editForm.phone;
      if (this.editForm.password) body.password = this.editForm.password;
      try { await updateMerchantUser(firstValue(this.editUser.id, this.editUser.userId), body); this.closeModal(); this.reload(); uni.showToast({ title: '用户已更新', icon: 'success' }); } catch (error) {}
    },
    openRecharge(item) {
      if (['STORE_OWNER', 'STORE_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_ADMIN'].indexOf(item.role) >= 0) return uni.showToast({ title: '管理员使用门店额度池', icon: 'none' });
      this.rechargeUser = item; this.rechargeAmount = 10;
    },
    async submitRecharge() {
      if (!this.rechargeUser) return;
      try { await adjustMerchantUserQuota(firstValue(this.rechargeUser.id, this.rechargeUser.userId), Number(this.rechargeAmount || 0)); this.closeModal(); this.reload(); uni.showToast({ title: '算力已调整', icon: 'success' }); } catch (error) {}
    },
    async toggleStatus(item) {
      try { const next = item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'; await updateMerchantUserStatus(firstValue(item.id, item.userId), next); this.reload(); uni.showToast({ title: '状态已更新', icon: 'success' }); } catch (error) {}
    },
    removeUser(item) {
      const name = firstValue(item.displayName, item.username, item.phone, '该账号');
      uni.showModal({
        title: '删除账号',
        content: `确定删除 ${name}？剩余算力会回收到门店额度池。`,
        success: async (res) => {
          if (!res.confirm) return;
          try { await deleteMerchantUser(firstValue(item.id, item.userId)); this.reload(); uni.showToast({ title: '账号已删除', icon: 'success' }); } catch (error) {}
        }
      });
    },
    closeTrial() { this.trialTicket = null; },
    copyTrial() { if (!this.trialTicket) return; const text = `账号：${this.trialAccountText}\n密码：${this.trialPasswordText}\n初始算力：${this.trialQuotaText}\n到期：${this.trialExpireText}`; uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'success' }) }); },
    closeModal() { this.createOpen = false; this.editUser = null; this.rechargeUser = null; },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style scoped>
.users-summary { margin-top: 22rpx; display: flex; align-items: stretch; gap: 16rpx; }
.summary-main { flex: 1; min-width: 0; padding: 24rpx; border-radius: 26rpx; display: flex; align-items: center; gap: 16rpx; background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025)); border: 1rpx solid rgba(255,255,255,.09); }
.summary-icon { width: 72rpx; height: 72rpx; flex: 0 0 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 22rpx; color: var(--xg-text-inverse); background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); }
.summary-kicker { display: block; color: var(--xg-text-muted); font-size: 22rpx; }
.summary-title { display: block; margin-top: 6rpx; color: var(--xg-text-main); font-size: 42rpx; font-weight: 900; }
.summary-desc { display: block; margin-top: 6rpx; color: var(--xg-text-muted); font-size: 23rpx; }
.summary-quota { width: 260rpx; box-sizing: border-box; padding: 22rpx; border-radius: 26rpx; background: linear-gradient(135deg, rgba(var(--xg-color-primary-rgb), .18), rgba(201,151,49,.08)); border: 1rpx solid rgba(var(--xg-color-primary-rgb), .24); }
.summary-label { display: block; color: var(--xg-text-muted); font-size: 22rpx; line-height: 1.35; }
.summary-value { display: block; margin-top: 8rpx; color: var(--xg-color-primary); font-size: 42rpx; font-weight: 900; }
.summary-code { display: block; margin-top: 8rpx; color: var(--xg-text-muted); font-size: 21rpx; }
.notice-card, .toolbar-card, .empty-card, .error-card { margin-top: 18rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); }
.notice-title { display: block; color: var(--xg-text-main); font-size: 30rpx; font-weight: 900; }
.notice-desc { display: block; margin-top: 8rpx; color: var(--xg-text-muted); font-size: 24rpx; line-height: 1.6; }
.toolbar-card { display: grid; gap: 14rpx; }
.search-box, .picker-box, .form-picker { height: 76rpx; box-sizing: border-box; display: flex; align-items: center; gap: 14rpx; padding: 0 22rpx; border-radius: 20rpx; background: var(--xg-bg-card-soft); border: 1rpx solid rgba(255,255,255,.09); color: var(--xg-text-muted); }
.search-input { flex: 1; color: var(--xg-text-main); font-size: 27rpx; }
.filter-row, .action-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.picker-box { justify-content: space-between; color: var(--xg-text-main); font-size: 26rpx; }
.action-btn { height: 82rpx; line-height: 82rpx; font-size: 27rpx; }
.user-list { display: grid; gap: 18rpx; margin-top: 18rpx; }
.user-card { padding: 20rpx; border-radius: 26rpx; background: var(--xg-bg-card); border: 1rpx solid rgba(255,255,255,.09); }
.user-head { display: flex; align-items: center; gap: 16rpx; }
.user-avatar { width: 78rpx; height: 78rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); color: var(--xg-text-inverse); font-size: 30rpx; font-weight: 900; }
.user-main { flex: 1; min-width: 0; }
.name-line { display: flex; align-items: center; gap: 12rpx; }
.user-name { flex: 1; min-width: 0; color: var(--xg-text-main); font-size: 31rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-line { display: block; margin-top: 5rpx; color: var(--xg-text-muted); font-size: 23rpx; }
.status-badge { height: 42rpx; display: flex; align-items: center; padding: 0 16rpx; border-radius: 999rpx; color: #ffb4a8; background: rgba(255,112,112,.1); border: 1rpx solid rgba(255,112,112,.18); font-size: 22rpx; font-weight: 900; }
.status-badge.active { color: #63e0a0; background: rgba(99,224,160,.1); border-color: rgba(99,224,160,.2); }
.meta-grid { margin-top: 18rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.meta-item { min-width: 0; padding: 14rpx; border-radius: 18rpx; background: rgba(255,255,255,.035); }
.meta-item-label { display: block; color: var(--xg-text-muted); font-size: 21rpx; }
.meta-value { margin-top: 6rpx; color: var(--xg-text-main) !important; font-size: 23rpx !important; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.quota-text { color: var(--xg-color-primary) !important; }
.card-actions { margin-top: 18rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.mini-btn { height: 68rpx; line-height: 68rpx; border-radius: 18rpx; color: var(--xg-text-main); background: rgba(255,255,255,.055); border: 1rpx solid rgba(255,255,255,.1); font-size: 24rpx; }
.mini-btn.danger { color: #ffb4a8; border-color: rgba(255,112,112,.2); background: rgba(255,112,112,.08); }
.owner-note { margin-top: 18rpx; padding: 16rpx; border-radius: 18rpx; color: var(--xg-text-muted); background: rgba(255,255,255,.035); font-size: 24rpx; text-align: center; }
.empty-card { color: var(--xg-text-muted); font-size: 26rpx; }
.error-card { color: #ffb4a8; border-color: rgba(255,112,112,.22); font-size: 26rpx; }
.more-btn { margin-top: 20rpx; }
.modal-mask { position: fixed; z-index: 120; left: 0; right: 0; top: 0; bottom: 0; padding: 48rpx 28rpx; box-sizing: border-box; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.66); }
.modal-card { width: 100%; max-height: 86vh; overflow-y: auto; box-sizing: border-box; padding: 24rpx; border-radius: 28rpx; background: var(--xg-bg-card); border: 1rpx solid rgba(var(--xg-color-primary-rgb), .18); box-shadow: 0 30rpx 80rpx rgba(0,0,0,.45); }
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.modal-title { color: var(--xg-text-main); font-size: 32rpx; font-weight: 900; }
.modal-close { width: 68rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; color: var(--xg-color-primary); font-size: 38rpx; }
.form-grid { display: grid; gap: 14rpx; }
.form-field { display: block; padding: 16rpx; border-radius: 20rpx; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); }
.field-label, .form-picker-label, .ticket-label { display: block; color: var(--xg-text-muted); font-size: 22rpx; }
.form-field input { margin-top: 8rpx; height: 58rpx; color: var(--xg-text-main); font-size: 28rpx; }
.form-picker { height: 86rpx; justify-content: space-between; }
.modal-submit { margin-top: 8rpx; height: 84rpx; line-height: 84rpx; }
.target-line { padding: 18rpx; border-radius: 18rpx; color: var(--xg-text-main); background: rgba(var(--xg-color-primary-rgb), .08); font-size: 28rpx; font-weight: 900; }
.ticket-box { display: grid; gap: 12rpx; }
.ticket-row { padding: 16rpx; border-radius: 18rpx; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); }
.ticket-value { display: block; margin-top: 6rpx; color: var(--xg-text-main); font-size: 28rpx; word-break: break-all; }
</style>
