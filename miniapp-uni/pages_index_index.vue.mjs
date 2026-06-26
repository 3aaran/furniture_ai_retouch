
import { getCurrentUser, getQuotaLogs } from '../../api/user.js';
import { getMockTasks, getMockUser } from '../../utils/mockStore.js';
import { isMockLoggedIn } from '../../utils/mockSession.js';
import { getToken, useMockApi } from '../../utils/request.js';
import { requireLogin } from '../../utils/auth.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';

const roleNameMap = {
  MERCHANT_OWNER: '门店负责人',
  MERCHANT_ADMIN: '门店管理员',
  STAFF: '门店员工',
  STORE_STAFF: '门店员工',
  INTERNAL_STAFF: '内部人员',
  TRIAL: '体验人员',
  SYSTEM_ADMIN: '平台管理员'
};

function normalizeUser(user = {}, quotaSummary = null) {
  return {
    ...user,
    company: user.companyName || user.company || '个人中心',
    roleName: roleNameMap[user.role] || user.roleName || user.role || '用户',
    quota: Number(quotaSummary?.currentBalance ?? user.quota ?? 0),
    merchantQuota: Number(user.merchantQuota ?? user.quota ?? 0)
  };
}

export default {
  components: { AppTopbar },
  data() {
    return { user: {}, recentTasks: [], loggedIn: false, errorText: '' };
  },
  computed: {
    quotaLine() {
      return this.loggedIn ? `${this.user.roleName} · 门店额度 ${this.user.merchantQuota}` : '登录后查看真实算力';
    },
    topbarAvatar() {
      const name = this.user.displayName || this.user.username || this.user.phone || '用';
      return String(name).slice(0, 1);
    }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadUser();
    this.recentTasks = getMockTasks().slice(0, 3);
  },
  methods: {
    async loadUser() {
      this.errorText = '';
      if (useMockApi()) {
        this.loggedIn = isMockLoggedIn();
        this.user = this.loggedIn ? getMockUser() : {};
        return;
      }
      this.loggedIn = Boolean(getToken());
      if (!this.loggedIn) { this.user = {}; return; }
      try {
        const [user, quotaData] = await Promise.all([
          getCurrentUser({ showLoading: false, showErrorToast: false }),
          getQuotaLogs({ page: 1, pageSize: 1 }, { showLoading: false, showErrorToast: false }).catch(() => null)
        ]);
        this.user = normalizeUser(user, quotaData?.summary || null);
      } catch (error) {
        this.errorText = error.message || '读取算力失败，请确认后端接口可用';
      }
    },
    goWorkbench() { uni.switchTab({ url: '/pages/workbench/index' }); },
    goTasks() { uni.switchTab({ url: '/pages/tasks/index' }); },
    goResources() { uni.switchTab({ url: '/pages/resources/index' }); },
    goMine() { uni.switchTab({ url: '/pages/mine/index' }); }
  }
};
