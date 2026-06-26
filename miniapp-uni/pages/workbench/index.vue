<template>
  <view class="page workbench-page">
    <app-topbar
      title="勋港家具 AI"
      subtitle="智能家具修图平台"
      :quota="topbarQuota"
      :avatar-text="topbarAvatar"
      @profile="goMine"
    />

    <view :class="['wb-screen', activeDrawer ? 'drawer-open' : '']">
      <view v-if="activeDrawer" class="wb-drawer-mask" @click="closeDrawer"></view>

      <view class="wb-tool-rail">
        <view class="wb-rail-btn primary" @click="openDrawer('features')">
          <text class="rail-icon">▦</text>
          <view><text>{{ currentFeatureMode }}</text><b>{{ currentFeatureLabel }}</b></view>
        </view>
        <view class="wb-rail-btn" @click="openDrawer('recent')">
          <text class="rail-icon">◉</text>
          <view><text>最近生成</text><b>{{ recentTasks.length }}</b></view>
        </view>
        <view class="wb-rail-btn" @click="showWatermarkTip">
          <text class="rail-icon">◎</text>
          <view><text>水印</text><b>水印配置</b></view>
        </view>
      </view>

      <view :class="['wb-drawer', 'left', activeDrawer === 'features' ? 'show' : '']">
        <view class="drawer-head">
          <view><text>{{ currentFeatureMode }}</text><b>{{ currentFeatureLabel }}</b></view>
          <button class="drawer-close" @click="closeDrawer">×</button>
        </view>

        <view class="wb-section-tabs">
          <button :class="featureGroup === 'base' ? 'active' : ''" @click="selectFeatureGroup('base')">基础</button>
          <button :class="featureGroup === 'promotion' ? 'active' : ''" @click="selectFeatureGroup('promotion')">宣传图</button>
          <button :class="featureGroup === 'video' ? 'active' : ''" @click="selectFeatureGroup('video')">宣传短视频</button>
        </view>

        <view class="wb-feature-grid">
          <button
            v-for="item in drawerFeatures"
            :key="item.key"
            :class="['wb-feature-btn', selectedFeatureKey === item.key ? 'active' : '']"
            @click="selectFeature(item)"
          >
            <text class="feature-tag">{{ item.shortName || item.tag || item.name.slice(0, 2) }}</text>
            <text>{{ item.name }}</text>
          </button>
        </view>

        <view class="wb-divider"></view>

        <view v-if="selectedFeatureKey === 'material' || selectedFeatureKey === 'replace_bg'" class="drawer-section">
          <view class="drawer-title">
            <b>{{ selectedFeatureKey === 'material' ? '材质参考' : '场景模板' }}</b>
            <text>系统 / 门店 / 个人</text>
          </view>
          <view class="scope-tabs">
            <text v-for="item in resourceScopes" :key="item.key" :class="resourceScope === item.key ? 'active' : ''" @click="resourceScope = item.key">{{ item.name }}</text>
          </view>
          <view class="resource-list">
            <view
              v-for="item in filteredResources"
              :key="item.id"
              :class="['resource-row', selectedResource && selectedResource.id === item.id ? 'active' : '']"
              @click="selectResource(item)"
            >
              <view class="resource-thumb">
                <image v-if="item.thumbUrl || item.imageUrl || item.url" :src="normalizeFileUrl(item.thumbUrl || item.imageUrl || item.url)" mode="aspectFill" />
                <text v-else>{{ item.thumbText || '素材' }}</text>
              </view>
              <view class="resource-info"><b>{{ item.name }}</b><text>{{ item.typeText }} · {{ item.subCategoryName || item.mainCategoryName }}</text></view>
            </view>
            <view v-if="!filteredResources.length" class="drawer-empty">暂无匹配素材</view>
          </view>
        </view>

        <view class="drawer-section">
          <view class="drawer-title"><b>功能参数</b><text>与 Web 工作台参数一致</text></view>
          <view v-if="selectedFeatureKey === 'remove_bg'" class="option-stack">
            <label class="switch-row"><checkbox :checked="removeOpts.whiteBg" @click="removeOpts.whiteBg = !removeOpts.whiteBg" /> <text>白底图</text></label>
            <label class="switch-row"><checkbox :checked="removeOpts.mirror" @click="removeOpts.mirror = !removeOpts.mirror" /> <text>镜像产品</text></label>
          </view>
          <view v-else-if="selectedFeatureKey === 'enhance'" class="option-stack">
            <label class="switch-row"><checkbox :checked="enhanceOpts.focus" @click="enhanceOpts.focus = !enhanceOpts.focus" /> <text>产品聚焦</text></label>
            <view class="param-line"><text>角度</text><picker :range="enhanceAngles" :value="enhanceAngleIndex" @change="changeEnhanceAngle"><view class="select-box">{{ enhanceOpts.angle }}</view></picker></view>
          </view>
          <view v-else-if="selectedFeatureKey === 'multiview'" class="pill-grid">
            <text v-for="item in multiViewOptions" :key="item" :class="multiView === item ? 'active' : ''" @click="multiView = item">{{ item }}</text>
          </view>
          <view v-else-if="isPromotionSelected" class="option-stack">
            <view v-for="row in promotionRows" :key="row.key" class="param-line"><text>{{ row.label }}</text><picker :range="row.items" :value="row.items.indexOf(promotionOptions[selectedFeatureKey][row.key])" @change="changePromotionOption(row, $event)"><view class="select-box">{{ promotionOptions[selectedFeatureKey][row.key] }}</view></picker></view>
          </view>
          <view v-else class="drawer-hint">当前功能主要依赖原图和参考素材，生成前可在主面板补充要求。</view>
        </view>
      </view>

      <view :class="['wb-drawer', 'right', activeDrawer === 'recent' ? 'show' : '']">
        <view class="drawer-head">
          <view><text>最近生成</text><b>历史任务</b></view>
          <button class="drawer-close" @click="closeDrawer">×</button>
        </view>
        <view class="recent-list">
          <view v-for="task in recentTasks" :key="task.id" class="recent-item" @click="goHistory">
            <view class="recent-thumb"><view class="furniture-shape small"></view><text v-if="task.status === 'failed'">失败</text></view>
            <view class="recent-info"><b>{{ task.featureName }}</b><text>{{ task.status === 'running' ? '生成中...' : task.status === 'failed' ? '失败，已退回算力' : task.createdAt }}</text><small>{{ task.id }}</small></view>
          </view>
          <view v-if="!recentTasks.length" class="drawer-empty">暂无生成记录</view>
        </view>
        <button class="secondary-btn drawer-more" @click="goHistory">查看更多记录</button>
      </view>

      <view class="wb-center-panel">
        <view class="wb-main-block source-block">
          <view class="wb-source-head">
            <view><b>产品原图</b><text>上传或从资源库选择要处理的家具图片</text></view>
            <button class="watermark-btn" @click="showWatermarkTip">水印配置</button>
          </view>
          <view class="upload-box" @click="chooseInputImage">
            <view v-if="!originImage" class="upload-inner">
              <view class="upload-circle">＋</view>
              <b>点击上传家具原图</b>
              <text>支持相册/拍照，最多 {{ maxImageCount }} 张</text>
            </view>
            <view v-else class="image-preview">
              <image v-if="originImage.imageUrl || originImage.url" :src="normalizeFileUrl(originImage.imageUrl || originImage.url)" mode="aspectFill" />
              <view v-else class="mock-preview"><view class="furniture-shape"></view></view>
              <view class="preview-meta"><b>{{ originImage.name }}</b><text>{{ inputImages.length }} 张输入图</text></view>
            </view>
          </view>
          <view class="upload-actions">
            <button class="secondary-btn compact" @click.stop="chooseInputImage">继续上传</button>
            <button class="secondary-btn compact" @click.stop="openDrawer('features')">选择功能</button>
            <button class="secondary-btn compact" @click.stop="clearInputs">清空</button>
          </view>
        </view>

        <view v-if="selectedFeatureKey === 'material' || selectedFeatureKey === 'replace_bg'" class="wb-main-block reference-block">
          <view class="wb-source-head">
            <view><b>{{ selectedFeatureKey === 'material' ? '材质参考' : '场景模板' }}</b><text>{{ selectedResource ? selectedResource.name : '未选择参考素材' }}</text></view>
            <button class="watermark-btn" @click="openDrawer('features')">选择素材</button>
          </view>
          <view class="selected-resource" @click="openDrawer('features')">
            <view class="resource-thumb large"><text>{{ selectedResource ? (selectedResource.thumbText || selectedResource.name.slice(0, 2)) : '参考' }}</text></view>
            <view><b>{{ selectedResource ? selectedResource.name : '从左侧功能面板选择资源' }}</b><text>{{ selectedResource ? selectedResource.desc || selectedResource.typeText : '材质替换选择材质，场景融合选择场景模板' }}</text></view>
          </view>
        </view>

        <view class="generation-card">
          <textarea class="prompt-input" v-model="custom" :placeholder="promptPlaceholder" />
          <view class="bottom-bar">
            <view class="control-group">
              <text>分辨率</text>
              <view class="pills"><button v-for="item in resolutionOptions" :key="item" :class="resolution === item ? 'active' : ''" @click="resolution = item">{{ item }}</button></view>
            </view>
            <view class="control-group ratio">
              <text>比例</text>
              <picker :range="ratioOptions" :value="ratioOptions.indexOf(ratio)" @change="changeRatio"><view class="select-box dark">{{ ratio }}</view></picker>
            </view>
            <view class="action-group">
              <button class="primary-btn generate-btn" @click="submitTask">{{ generateLabel }}</button>
              <text>消耗 {{ calcCost }} 点算力　剩余：{{ user.quota }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
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
</script>

<style>
.workbench-page { padding-top: 12rpx; }
.wb-screen { position: relative; }
.wb-tool-rail { position: sticky; top: 0; z-index: 30; display: grid; grid-template-columns: minmax(0,1fr) minmax(120rpx,.72fr) minmax(120rpx,.72fr); gap: 12rpx; margin: -4rpx 0 16rpx; padding-bottom: 10rpx; background: #07090c; }
.wb-rail-btn { min-width: 0; min-height: 92rpx; display: grid; grid-template-columns: 38rpx minmax(0,1fr); gap: 4rpx 14rpx; align-items: center; padding: 14rpx 16rpx; border-radius: 18rpx; border: 1rpx solid rgba(242,213,140,.16); background: rgba(13,15,18,.94); color: #f5f0e6; box-shadow: 0 12rpx 36rpx rgba(0,0,0,.26); }
.wb-rail-btn.primary { background: linear-gradient(135deg, rgba(242,213,140,.2), rgba(18,20,22,.96)); border-color: rgba(242,213,140,.34); }
.rail-icon { grid-row: 1 / 3; color: #f3dc9a; font-size: 28rpx; font-weight: 900; }
.wb-rail-btn text, .wb-rail-btn b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wb-rail-btn view text { display: block; color: rgba(255,244,223,.58); font-size: 22rpx; }
.wb-rail-btn b { display: block; margin-top: 4rpx; color: #fff5dc; font-size: 28rpx; line-height: 1.15; }
.wb-drawer-mask { position: fixed; inset: 0; z-index: 230; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); }
.wb-drawer { position: fixed; top: 0; bottom: 0; z-index: 240; width: min(414px, calc(100vw - 40px)); max-width: calc(100vw - 40px); height: 100vh; overflow-y: auto; box-sizing: border-box; padding: calc(24rpx + var(--status-bar-height)) 28rpx 36rpx; background: linear-gradient(180deg, rgba(18,20,23,.99), rgba(9,10,12,.99)); box-shadow: 0 0 70rpx rgba(0,0,0,.62); transition: transform .22s ease; }
.wb-drawer.left { left: 0; border-right: 1rpx solid rgba(242,213,140,.18); transform: translateX(-105%); }
.wb-drawer.right { right: 0; border-left: 1rpx solid rgba(242,213,140,.18); transform: translateX(105%); }
.wb-drawer.show { transform: translateX(0); }
.drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 20rpx; }
.drawer-head view text, .drawer-head view b { display: block; max-width: 520rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer-head view text { color: rgba(255,244,223,.55); font-size: 22rpx; font-weight: 800; }
.drawer-head view b { color: #fff4df; font-size: 34rpx; line-height: 1.2; }
.drawer-close { width: 72rpx; height: 72rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: #f5ead0; font-size: 38rpx; line-height: 1; }
.wb-section-tabs { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10rpx; }
.wb-section-tabs button { height: 70rpx; border: 1rpx solid rgba(255,255,255,.1); border-radius: 18rpx; background: rgba(255,255,255,.035); color: #cfc8b8; font-size: 24rpx; font-weight: 900; }
.wb-section-tabs button.active { border-color: transparent; background: linear-gradient(135deg,#f3da94,#c79b3b); color: #181207; }
.wb-feature-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12rpx; margin-top: 16rpx; }
.wb-feature-btn { min-height: 96rpx; display: flex; align-items: center; gap: 12rpx; justify-content: flex-start; padding: 0 16rpx; border-radius: 18rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #f5f0e6; font-size: 25rpx; font-weight: 900; }
.wb-feature-btn.active { border-color: rgba(242,213,140,.42); background: rgba(242,213,140,.12); color: #f2d58c; }
.feature-tag { flex: 0 0 auto; padding: 6rpx 10rpx; border-radius: 999rpx; background: rgba(242,213,140,.12); color: #f0d68a; font-size: 20rpx; }
.wb-divider { height: 1rpx; margin: 22rpx 0; background: rgba(255,255,255,.08); }
.drawer-section { margin-top: 20rpx; }
.drawer-title { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 14rpx; }
.drawer-title b { color: #fff4df; font-size: 29rpx; }
.drawer-title text, .drawer-hint { color: rgba(255,244,223,.55); font-size: 22rpx; line-height: 1.55; }
.scope-tabs { display: grid; grid-template-columns: repeat(4,1fr); gap: 8rpx; margin-bottom: 12rpx; }
.scope-tabs text { height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 15rpx; background: rgba(255,255,255,.05); color: rgba(255,244,223,.62); font-size: 22rpx; font-weight: 800; }
.scope-tabs text.active { background: rgba(242,213,140,.14); color: #f0d68a; }
.resource-list, .recent-list { display: grid; gap: 12rpx; }
.resource-row, .recent-item, .selected-resource { display: flex; align-items: center; gap: 14rpx; padding: 14rpx; border-radius: 18rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); }
.resource-row.active { border-color: rgba(242,213,140,.5); background: rgba(242,213,140,.1); }
.resource-thumb, .recent-thumb { width: 86rpx; height: 72rpx; flex: 0 0 86rpx; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 16rpx; border: 1rpx solid rgba(242,213,140,.14); background: linear-gradient(135deg,#202731,#11161d); color: #f0d68a; font-size: 22rpx; font-weight: 900; }
.resource-thumb image { width: 100%; height: 100%; display: block; }
.resource-thumb.large { width: 116rpx; height: 92rpx; }
.resource-info, .recent-info, .selected-resource view:last-child { flex: 1; min-width: 0; }
.resource-info b, .recent-info b, .selected-resource b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff4df; font-size: 25rpx; font-weight: 900; }
.resource-info text, .recent-info text, .selected-resource text, .recent-info small { display: block; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,244,223,.55); font-size: 21rpx; }
.drawer-empty { padding: 28rpx; border: 1rpx dashed rgba(242,213,140,.18); border-radius: 18rpx; color: rgba(255,244,223,.55); text-align: center; font-size: 23rpx; }
.option-stack { display: grid; gap: 14rpx; }
.switch-row, .param-line { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; min-height: 66rpx; color: #fff4df; font-size: 25rpx; font-weight: 900; }
.select-box { min-width: 210rpx; padding: 16rpx 18rpx; border-radius: 16rpx; background: rgba(255,255,255,.06); color: #f0d68a; text-align: center; font-size: 24rpx; font-weight: 900; }
.select-box.dark { min-width: 150rpx; background: #101216; }
.pill-grid { display: flex; flex-wrap: wrap; gap: 10rpx; }
.pill-grid text { padding: 12rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.07); color: #cfc8b8; font-size: 23rpx; font-weight: 800; }
.pill-grid text.active { background: #f0d68a; color: #181207; }
.wb-center-panel { width: 100%; min-height: auto; }
.wb-main-block, .generation-card { margin-top: 16rpx; padding: 20rpx; border: 1rpx solid rgba(242,213,140,.12); border-radius: 26rpx; background: rgba(255,255,255,.04); box-shadow: 0 24rpx 70rpx rgba(0,0,0,.32); }
.wb-source-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 16rpx; }
.wb-source-head b, .wb-source-head text { display: block; }
.wb-source-head b { color: #fff4df; font-size: 30rpx; font-weight: 1000; }
.wb-source-head text { margin-top: 6rpx; color: rgba(255,244,223,.55); font-size: 22rpx; }
.watermark-btn { flex: 0 0 auto; min-height: 66rpx; padding: 0 18rpx; border-radius: 18rpx; border: 1rpx solid rgba(240,214,138,.52); background: rgba(240,214,138,.06); color: #f0d68a; font-size: 24rpx; font-weight: 900; }
.upload-box { min-height: 300rpx; border: 1rpx dashed rgba(242,213,140,.22); border-radius: 24rpx; background: radial-gradient(circle at 70% -20%, rgba(242,213,140,.13), transparent 45%), rgba(8,10,13,.8); overflow: hidden; }
.upload-inner { min-height: 300rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.upload-circle { width: 86rpx; height: 86rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg,#f3da94,#c79b3b); color: #181207; font-size: 46rpx; font-weight: 1000; }
.upload-inner b { margin-top: 16rpx; color: #fff4df; font-size: 31rpx; }
.upload-inner text { margin-top: 8rpx; color: rgba(255,244,223,.56); font-size: 24rpx; }
.image-preview { position: relative; min-height: 300rpx; }
.image-preview image, .mock-preview { width: 100%; height: 300rpx; display: block; }
.mock-preview { position: relative; background: linear-gradient(135deg,#202731,#11161d); }
.preview-meta { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 14rpx; border-radius: 16rpx; background: rgba(0,0,0,.58); }
.preview-meta b, .preview-meta text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-meta b { color: #fff4df; font-size: 25rpx; }
.preview-meta text { margin-top: 4rpx; color: rgba(255,244,223,.58); font-size: 21rpx; }
.furniture-shape { position: absolute; left: 24rpx; right: 24rpx; bottom: 24rpx; height: 34rpx; border-radius: 999rpx 999rpx 12rpx 12rpx; background: rgba(242,213,140,.26); }
.furniture-shape.small { left: 12rpx; right: 12rpx; bottom: 13rpx; height: 18rpx; }
.upload-actions { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12rpx; margin-top: 16rpx; }
.compact { height: 70rpx; font-size: 24rpx; }
.reference-block .selected-resource { margin-top: 4rpx; }
.prompt-input { width: 100%; min-height: 148rpx; box-sizing: border-box; padding: 18rpx; border-radius: 20rpx; border: 1rpx solid rgba(255,255,255,.1); background: #101216; color: #fff4df; font-size: 25rpx; line-height: 1.55; }
.bottom-bar { display: grid; gap: 18rpx; margin-top: 18rpx; }
.control-group { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; color: rgba(255,244,223,.58); font-size: 23rpx; font-weight: 900; }
.pills { display: flex; gap: 8rpx; }
.pills button { min-width: 76rpx; height: 58rpx; border-radius: 999rpx; border: 0; background: rgba(255,255,255,.07); color: #cfc8b8; font-size: 23rpx; font-weight: 900; }
.pills button.active { background: #f0d68a; color: #181207; }
.action-group { display: grid; gap: 8rpx; }
.generate-btn { height: 84rpx; }
.action-group text { color: rgba(255,244,223,.58); font-size: 22rpx; text-align: center; }
.drawer-more { margin-top: 16rpx; }
</style>
