
import { consumeWorkbenchResource, createMockTask, getFeatureGroups, getFeatureTypes, getMockUser, getMockResources, getMockTasks } from '../../utils/mockStore.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getToken, useMockApi } from '../../utils/request.js';
import { uploadImage } from '../../api/upload.js';
import { createAiTask } from '../../api/task.js';
import { getResources } from '../../api/resource.js';
import { normalizeFileUrl } from '../../utils/fileUrl.js';
import { requireLogin } from '../../utils/auth.js';

const FEATURE_KEY = 'miniapp_pending_feature_key';
const BASE_RATIO_OPTIONS = ['自适应', '1:1', '4:3', '3:4', '16:9'];
const BASE_RESOLUTION_OPTIONS = ['1K', '2K', '4K'];

export default {
  components: { AppTopbar },
  data() {
    return {
      features: [],
      featureGroups: [],
      featureGroup: 'base',
      resources: [],
      tasks: [],
      user: getMockUser(),
      useMock: true,
      activeDrawer: '',
      selectedFeatureKey: 'material',
      inputImages: [],
      selectedResource: null,
      custom: '',
      resolution: '2K',
      ratio: '自适应',
      removeOpts: { whiteBg: false, mirror: false },
      enhanceOpts: { focus: false, angle: '不变' },
      multiView: '三角度视图',
      resourceScope: 'ALL',
      uploadBusy: false,
      submitBusy: false,
      promotionOptions: {
        promo_main_image: { mainBackground: '暖灰渐变商业摄影背景', mainComposition: '主体居中', mainWhitespace: '少量留白' },
        promo_poster_image: { posterTextMode: 'auto', posterCopyPlacement: '右侧留白', posterTone: '温暖家居' },
        promo_detail_image: { detailLayout: '四宫格', detailFocus: '材质纹理、边角工艺', detailTextMode: '留白不生成文字' }
      },
      resourceScopes: [
        { key: 'ALL', name: '全部' },
        { key: 'SYSTEM', name: '系统' },
        { key: 'MERCHANT', name: '门店' },
        { key: 'USER', name: '个人' }
      ],
      enhanceAngles: ['不变', '正面', '45度', '侧面'],
      multiViewOptions: ['三角度视图', '四角度视图']
    };
  },
  computed: {
    currentFeature() { return this.features.find((item) => item.key === this.selectedFeatureKey) || {}; },
    currentFeatureMode() { return this.featureGroup === 'promotion' ? '宣传图' : this.featureGroup === 'video' ? '短视频' : '基础'; },
    currentFeatureLabel() { return this.currentFeature.name || '材质替换'; },
    drawerFeatures() { return this.features.filter((item) => item.group === this.featureGroup); },
    isPromotionSelected() { return ['promo_main_image','promo_poster_image','promo_detail_image'].includes(this.selectedFeatureKey); },
    maxImageCount() { return 4; },
    originImage() { return this.inputImages[0] || null; },
    recentTasks() { return this.tasks.slice(0, 8); },
    topbarQuota() { return this.user && this.user.quota !== undefined ? this.user.quota : ''; },
    topbarAvatar() { const name = this.user.displayName || this.user.username || this.user.phone || '用'; return String(name).slice(0, 1); },
    resolutionOptions() { return BASE_RESOLUTION_OPTIONS; },
    ratioOptions() { return this.featureGroup === 'video' ? ['16:9', '9:16', '1:1', '4:3', '3:4'] : BASE_RATIO_OPTIONS; },
    calcCost() { const mul = { '1K': 1, '2K': 2, '4K': 4 }[this.resolution] || 2; return Math.ceil(Number(this.currentFeature.cost || 0) * mul); },
    generateLabel() { return this.featureGroup === 'promotion' ? '生成宣传图' : this.featureGroup === 'video' ? '生成视频' : '生成效果'; },
    promptPlaceholder() { return this.isPromotionSelected ? '选填：补充颜色、空间、风格或卖点要求' : '选填：如有特殊要求，可以简短说明'; },
    filteredResources() {
      const target = this.selectedFeatureKey === 'material' ? 'material' : this.selectedFeatureKey === 'replace_bg' ? 'scene' : '';
      if (!target) return [];
      return this.resources.filter((item) => {
        if (this.resourceScope !== 'ALL' && item.scope !== this.resourceScope) return false;
        return item.resourceType === target;
      });
    },
    enhanceAngleIndex() { return Math.max(0, this.enhanceAngles.indexOf(this.enhanceOpts.angle)); },
    promotionRows() {
      const map = {
        promo_main_image: [
          { label: '背景', key: 'mainBackground', items: ['暖灰渐变商业摄影背景', '浅米色高级背景', '米白色柔和光影', '极简空间背景'] },
          { label: '构图', key: 'mainComposition', items: ['主体居中', '左侧留白', '右侧留白', '主体偏下'] },
          { label: '留白', key: 'mainWhitespace', items: ['少量留白', '不留白', '顶部留白', '侧边留白'] }
        ],
        promo_poster_image: [
          { label: '文字', key: 'posterTextMode', items: ['auto', 'custom', 'none'] },
          { label: '留白', key: 'posterCopyPlacement', items: ['右侧留白', '左侧留白', '顶部留白', '下方留白'] },
          { label: '氛围', key: 'posterTone', items: ['温暖家居', '现代简约', '高级质感', '自然木质'] }
        ],
        promo_detail_image: [
          { label: '排版', key: 'detailLayout', items: ['四宫格', '三宫格', '拼合排版', '多区域细节'] },
          { label: '重点', key: 'detailFocus', items: ['材质纹理、边角工艺', '结构连接、坐垫厚度', '木纹质感、扶手造型', '布料纹理、靠背弧度'] },
          { label: '文字', key: 'detailTextMode', items: ['留白不生成文字', '完全不留文字区'] }
        ]
      };
      return map[this.selectedFeatureKey] || [];
    }
  },
  onLoad() {},
  onShow() {
    if (!requireLogin()) return;
    this.loadData();
    const pendingFeature = uni.getStorageSync(FEATURE_KEY);
    if (pendingFeature) {
      const feature = this.features.find((item) => item.key === pendingFeature || item.apiFeatureKey === pendingFeature);
      if (feature) this.selectFeature(feature);
      uni.removeStorageSync(FEATURE_KEY);
    }
    const resource = consumeWorkbenchResource();
    if (resource) this.applyIncomingResource(resource);
  },
  methods: {
    normalizeFileUrl,
    loadData() {
      this.useMock = useMockApi();
      this.features = getFeatureTypes();
      this.featureGroups = getFeatureGroups();
      this.tasks = getMockTasks();
      if (this.useMock || !getToken()) this.resources = getMockResources(); else this.loadRealResources();
    },
    async loadRealResources() {
      try {
        const data = await getResources({ pageSize: 50 }, { showLoading: false, showErrorToast: false });
        const items = Array.isArray(data?.items) ? data.items : [];
        this.resources = items.map((item) => ({ ...item, type: item.scope === 'SYSTEM' ? 'system' : item.scope === 'MERCHANT' ? 'merchant' : 'personal', typeText: item.scope === 'SYSTEM' ? '系统素材' : item.scope === 'MERCHANT' ? '门店素材' : '个人素材', thumbText: item.name || '素材', imageId: item.id }));
      } catch (error) {
        this.resources = getMockResources();
      }
    },
    openDrawer(type) { this.activeDrawer = type; },
    closeDrawer() { this.activeDrawer = ''; },
    selectFeatureGroup(group) {
      this.featureGroup = group;
      const first = this.features.find((item) => item.group === group);
      if (first) this.selectFeature(first);
      this.ratio = this.ratioOptions.includes(this.ratio) ? this.ratio : this.ratioOptions[0];
    },
    selectFeature(item) {
      this.selectedFeatureKey = item.key;
      this.featureGroup = item.group || this.featureGroup;
      this.selectedResource = null;
      this.ratio = this.ratioOptions.includes(this.ratio) ? this.ratio : this.ratioOptions[0];
    },
    selectResource(item) { this.selectedResource = item; },
    changeRatio(e) { this.ratio = this.ratioOptions[Number(e.detail.value)] || this.ratioOptions[0]; },
    changeEnhanceAngle(e) { this.enhanceOpts.angle = this.enhanceAngles[Number(e.detail.value)] || '不变'; },
    changePromotionOption(row, e) { this.promotionOptions[this.selectedFeatureKey][row.key] = row.items[Number(e.detail.value)] || row.items[0]; },
    chooseInputImage() {
      if (this.useMock) { this.mockUpload(); return; }
      if (this.uploadBusy) return;
      const remain = this.maxImageCount - this.inputImages.length;
      if (remain <= 0) return uni.showToast({ title: `最多 ${this.maxImageCount} 张`, icon: 'none' });
      uni.chooseImage({ count: remain, sizeType: ['compressed', 'original'], sourceType: ['album', 'camera'], success: async (result) => {
        const paths = result.tempFilePaths || [];
        this.uploadBusy = true;
        try {
          for (let index = 0; index < paths.length; index += 1) {
            const uploaded = await uploadImage(paths[index], {});
            this.inputImages.push({ id: uploaded.id, name: uploaded.originalName || uploaded.fileName || `家具原图 ${this.inputImages.length + 1}`, imageUrl: uploaded.thumbUrl || uploaded.url, url: uploaded.url, status: 'success', source: 'upload' });
          }
          uni.showToast({ title: '图片已上传', icon: 'success' });
        } catch (error) { uni.showToast({ title: error.message || '上传失败', icon: 'none' }); }
        finally { this.uploadBusy = false; }
      }});
    },
    mockUpload() {
      if (this.inputImages.length >= this.maxImageCount) return uni.showToast({ title: `最多 ${this.maxImageCount} 张`, icon: 'none' });
      const index = this.inputImages.length + 1;
      this.inputImages.push({ id: `upload_${Date.now()}_${index}`, name: `家具原图 ${index}`, thumbText: `原图${index}`, status: 'success' });
    },
    clearInputs() { this.inputImages = []; },
    applyIncomingResource(resource) {
      if (resource.resourceType === 'material' || resource.resourceType === 'scene') {
        this.selectedResource = resource;
        if (resource.resourceType === 'material') this.selectFeature(this.features.find((item) => item.key === 'material'));
        if (resource.resourceType === 'scene') this.selectFeature(this.features.find((item) => item.key === 'replace_bg'));
        return;
      }
      this.inputImages = [{ id: resource.imageId || resource.id, name: resource.name, thumbText: resource.thumbText, status: 'resource', resourceId: resource.id, imageUrl: resource.thumbUrl || resource.imageUrl || resource.url, url: resource.imageUrl || resource.url }, ...this.inputImages].slice(0, this.maxImageCount);
    },
    validateTask() {
      if (!this.inputImages.length && this.featureGroup !== 'video') return '请先上传家具原图';
      if (this.selectedFeatureKey === 'material' && !this.selectedResource && !String(this.custom || '').trim()) return '请选择材质参考或填写材质要求';
      if (this.selectedFeatureKey === 'replace_bg' && !this.selectedResource && !String(this.custom || '').trim()) return '请选择场景模板或填写场景要求';
      return '';
    },
    submitTask() {
      const msg = this.validateTask();
      if (msg) return uni.showToast({ title: msg, icon: 'none' });
      if (this.useMock) {
        createMockTask({ title: this.inputImages[0]?.name || '宣传视频分镜', featureKey: this.selectedFeatureKey, inputImages: this.inputImages, selectedResource: this.selectedResource, userPrompt: this.custom, params: this.buildOptions() });
        uni.showToast({ title: '已创建任务', icon: 'success' });
        setTimeout(() => uni.switchTab({ url: '/pages/tasks/index' }), 350);
      } else this.submitRealTask();
    },
    async submitRealTask() {
      if (this.selectedFeatureKey === 'video_generate') return uni.showToast({ title: '宣传视频真实接口后续接入', icon: 'none' });
      const origin = this.inputImages[0];
      const reference = this.selectedResource;
      const payload = { originImageId: origin.id, featureKey: this.currentFeature.apiFeatureKey || this.selectedFeatureKey, selectedResourceId: reference?.id || null, selectedResourceSnapshot: reference ? { id: reference.id, imageId: reference.imageId || reference.id, name: reference.name, resourceType: reference.resourceType, mainCategoryName: reference.mainCategoryName || '', subCategoryName: reference.subCategoryName || '', imageUrl: reference.imageUrl || reference.url || '' } : null, userPrompt: this.custom, resolution: this.resolution, ratio: this.ratio, options: this.buildOptions() };
      try { await createAiTask(payload); uni.showToast({ title: '已提交生成', icon: 'success' }); setTimeout(() => uni.switchTab({ url: '/pages/tasks/index' }), 350); }
      catch (error) { uni.showToast({ title: error.message || '任务提交失败', icon: 'none' }); }
    },
    buildOptions() {
      if (this.selectedFeatureKey === 'material') return { resolution: this.resolution, ratio: this.ratio, materialName: this.selectedResource?.name || '', materialColor: this.selectedResource?.colorName || '', materialCategory: this.selectedResource?.subCategoryName || this.selectedResource?.mainCategoryName || '', keepStructure: true, keepAngle: true, keepProportion: true };
      if (this.selectedFeatureKey === 'replace_bg') return { resolution: this.resolution, ratio: this.ratio, sceneType: this.selectedResource?.name || '真实室内商业场景', sceneName: this.selectedResource?.name || '', sceneDesc: this.selectedResource?.description || '', keepLighting: true, keepPerspective: true };
      if (this.selectedFeatureKey === 'remove_bg') return { resolution: this.resolution, ratio: this.ratio, whiteBg: !!this.removeOpts.whiteBg, mirror: !!this.removeOpts.mirror, backgroundTone: this.removeOpts.whiteBg ? 'Pure white' : 'Warm white', shadowStyle: '柔和阴影' };
      if (this.selectedFeatureKey === 'enhance') return { resolution: this.resolution, ratio: this.ratio, focus: !!this.enhanceOpts.focus, angle: this.enhanceOpts.angle, enhanceSharpness: true, enhanceLight: true, enhanceTexture: true, commercialStyle: true };
      if (this.selectedFeatureKey === 'lineart') return { resolution: this.resolution, ratio: this.ratio, lineStyle: 'Simple line art', lineColor: '黑色', keepDetailLevel: '中等', withShadow: false };
      if (this.selectedFeatureKey === 'multiview') return { resolution: this.resolution, ratio: this.ratio, viewMode: this.multiView, viewCount: this.multiView === '三角度视图' ? 3 : 4 };
      if (this.isPromotionSelected) return { resolution: this.resolution, ratio: this.ratio, ...this.promotionOptions[this.selectedFeatureKey], keepSubject: true, forbidGeneratedText: true, forbidLogo: true, forbidPeople: true };
      return { resolution: this.resolution, ratio: this.ratio };
    },
    showWatermarkTip() { uni.showToast({ title: '水印配置后续接入', icon: 'none' }); },
    goHistory() { uni.switchTab({ url: '/pages/tasks/index' }); },
    goMine() { uni.switchTab({ url: '/pages/mine/index' }); }
  }
};
