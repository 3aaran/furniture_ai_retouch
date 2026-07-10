<template>
  <view class="page workbench-page">
    <app-topbar title="" subtitle="" :avatar-text="topbarAvatar" @profile="goMine" />

    <view v-if="errorText" class="error-card">{{ errorText }}</view>

    <view class="metric-row">
      <view class="metric-card" @click="openDrawer('features')">
        <view class="metric-icon"><app-icon name="layers" :size="34" /></view>
        <view class="metric-copy">
          <text>{{ currentFeatureMode }}</text>
          <text class="ui-strong">{{ currentFeature.name }}</text>
        </view>
      </view>
      <view class="metric-card" @click="openDrawer('recent')">
        <view class="metric-icon"><app-icon name="eye" :size="34" /></view>
        <view class="metric-copy">
          <text>最近生成</text>
          <text class="ui-strong">{{ recentTasks.length }}</text>
        </view>
      </view>
    </view>

    <view class="work-card upload-card">
      <view class="block-title"><app-icon name="image" :size="34" />产品原图</view>
      <view class="upload-zone" @click="chooseInputImage">
        <view v-if="!originImage" class="upload-empty">
          <view class="upload-plus"><app-icon name="upload" tone="dark" :size="44" /></view>
          <text class="ui-strong">点击上传家具图片</text>
          <text>或</text>
          <view class="resource-select-btn" @click.stop="openResourceDrawer('origin')">从资产库选择</view>
        </view>
        <view v-else class="upload-preview">
          <image v-if="originImage.imageUrl" :src="originImage.imageUrl" mode="aspectFill" />
          <view class="upload-preview-meta">
            <text class="ui-strong">{{ originImage.name }}</text>
            <text>{{ inputImages.length }} 张输入图</text>
          </view>
        </view>
      </view>
    </view>

    <view :class="['ref-card', referenceOpen ? 'is-open' : '']">
      <view class="ref-header" @click="referenceOpen = !referenceOpen">
        <view class="fold-title"><app-icon name="image" :size="34" />参考图</view>
        <view class="fold-state">
          <text>{{ referenceStateText }}</text>
          <view class="fold-arrow">{{ referenceOpen ? '⌃' : '⌄' }}</view>
        </view>
      </view>
      <view v-if="referenceOpen" class="ref-body">
        <view class="ref-upload" @click="chooseReferenceImage">
          <image v-if="referenceImage && referenceImage.imageUrl" :src="referenceImage.imageUrl" mode="aspectFill" />
          <template v-else>
            <app-icon name="plus" :size="48" />
            <text class="ui-strong">上传参考图</text>
          </template>
        </view>
        <button class="secondary-btn ref-resource-btn" @click="openResourceDrawer('reference')">从资产库选择</button>
        <view v-if="selectedResource" class="selected-tip">已选择资源模板：{{ selectedResource.name }}</view>
      </view>
    </view>

    <textarea class="requirement-input" v-model="custom" :placeholder="promptPlaceholder" />

    <view class="param-block">
      <view class="param-title">分辨率</view>
      <view class="resolution-grid">
        <button v-for="item in resolutionOptions" :key="item" :class="resolution === item ? 'active' : ''" @click="resolution = item">{{ item }}</button>
      </view>
    </view>

    <view class="param-block ratio-cost-row">
      <view class="ratio-box">
        <view class="param-title">比例</view>
        <picker :range="ratioOptions" :value="ratioOptions.indexOf(ratio)" @change="changeRatio">
          <view class="ratio-picker">{{ ratio }}<text>⌄</text></view>
        </picker>
      </view>
      <view class="cost-box">
        <text>消耗 {{ currentCost }} 点算力</text>
        <text class="ui-strong">剩余：{{ quotaText || '-' }}</text>
      </view>
    </view>

    <button class="primary-btn generate-button" :disabled="submitBusy" @click="submitTask">{{ submitBusy ? '提交中' : generateLabel }}</button>

    <view v-if="activeDrawer" class="drawer-mask" @click="closeDrawer"></view>

    <view :class="['feature-drawer', activeDrawer === 'features' ? 'drawer-show' : '']">
      <view class="drawer-top">
        <view>
          <text>生图功能</text>
          <text class="ui-strong">{{ currentFeature.name }}</text>
        </view>
        <button class="drawer-close" @click="closeDrawer"><app-icon name="x" :size="28" /></button>
      </view>
      <view class="group-tabs">
        <text v-for="group in featureGroups" :key="group.key" :class="[featureGroup === group.key ? 'active' : '', group.key === 'video' ? 'is-coming' : '']" @click="selectFeatureGroup(group.key)">{{ group.name }}</text>
      </view>
      <view class="feature-grid">
        <view v-for="feature in drawerFeatures" :key="feature.key" :class="['feature-btn', selectedFeatureKey === feature.key ? 'active' : '']" @click="selectFeature(feature.key)">
          <text class="feature-tag">{{ feature.tag }}</text>
          <text class="ui-strong">{{ feature.name }}</text>
        </view>
        <view v-if="!drawerFeatures.length" class="empty-drawer">当前分类暂无功能</view>
      </view>
      <view class="drawer-section">
        <view v-if="needsResource" class="feature-resource-panel">
          <view class="feature-desc-row">
            <text>✓</text>
            <text class="ui-strong">{{ currentFeature.desc }}</text>
          </view>
          <view class="search-box feature-search-box">
            <app-icon name="search" :size="28" />
            <input v-model="resourceKeyword" placeholder="搜索资源..." />
          </view>
          <picker :range="resourceScopeNames" :value="resourceScopeIndex" @change="changeResourceScope">
            <view class="space-picker">{{ resourceScopes[resourceScopeIndex] ? resourceScopes[resourceScopeIndex].name : '系统空间' }}<text>⌄</text></view>
          </picker>
          <view class="resource-section-title">{{ resourceSectionTitle }}</view>
          <view class="resource-grid feature-resource-grid">
            <view class="upload-resource" @click="chooseReferenceImage">
              <app-icon name="upload" :size="42" />
              <text class="ui-strong">上传</text>
            </view>
            <view v-for="item in filteredResources" :key="item.id" :class="['resource-tile', selectedResource && selectedResource.id === item.id ? 'active' : '']" @click="selectFeatureResource(item)">
              <image v-if="item.image" :src="item.image" mode="aspectFill" />
              <view v-else class="resource-empty-thumb">图</view>
              <text class="ui-strong">{{ item.name }}</text>
              <text>{{ item.categoryText }}</text>
            </view>
          </view>
          <view v-if="!filteredResources.length" class="empty-drawer">暂无资产，切换空间或在资产库上传后再试</view>
        </view>
        <view v-else class="hint-line">当前参数：{{ optionsSummary }}</view>
        <view v-if="isPromotionSelected" class="option-stack promo-options">
          <view v-for="field in promotionFields" :key="field.key" class="option-row">
            <text class="icon-label">{{ field.label }}</text>
            <picker :range="field.choices" :value="field.choices.indexOf(promotionOptionValue(field.key))" @change="changePromotionOption(field.key, field.choices[$event.detail.value])">
              <view class="option-picker">{{ promotionOptionValue(field.key) }}</view>
            </picker>
          </view>
          <textarea v-if="selectedFeatureKey === 'promo_poster_image' && promotionOptionValue('posterTextMode') === '自定义文案'" class="promo-textarea" v-model="promotionOptions.promo_poster_image.posterText" placeholder="例如：舒适入座，自然木质" />
        </view>
        <view v-else-if="selectedFeatureKey === 'remove_bg'" class="option-stack">
          <label class="switch-row"><checkbox :checked="removeOpts.whiteBg" @click="removeOpts.whiteBg = !removeOpts.whiteBg" /> <text>白底图</text></label>
          <label class="switch-row"><checkbox :checked="removeOpts.mirror" @click="removeOpts.mirror = !removeOpts.mirror" /> <text>镜像产品</text></label>
        </view>
        <view v-else-if="selectedFeatureKey === 'enhance'" class="option-stack">
          <label class="switch-row"><checkbox :checked="enhanceOpts.focus" @click="enhanceOpts.focus = !enhanceOpts.focus" /> <text>产品聚焦</text></label>
          <view class="option-row"><text>角度</text><picker :range="enhanceAngles" :value="enhanceAngles.indexOf(enhanceOpts.angle)" @change="changeEnhanceAngle"><view class="option-picker">{{ enhanceOpts.angle }}</view></picker></view>
        </view>
        <view v-else-if="selectedFeatureKey === 'multiview'" class="mini-pills">
          <button v-for="item in multiViewOptions" :key="item" :class="multiView === item ? 'active' : ''" @click="multiView = item">{{ item }}</button>
        </view>
      </view>
    </view>

    <view :class="['resource-drawer', activeDrawer === 'resources' ? 'drawer-show' : '']">
      <view class="drawer-top compact-top">
        <view>
          <text>{{ resourceLabel }}</text>
          <text class="ui-strong">{{ resourceDrawerTitle }}</text>
        </view>
        <button class="drawer-close" @click="closeDrawer"><app-icon name="x" :size="28" /></button>
      </view>
      <view class="search-box">
        <app-icon name="search" :size="28" />
        <input v-model="resourceKeyword" placeholder="搜索资源..." />
      </view>
      <picker :range="resourceScopeNames" :value="resourceScopeIndex" @change="changeResourceScope">
        <view class="space-picker">{{ resourceScopes[resourceScopeIndex] ? resourceScopes[resourceScopeIndex].name : '全部空间' }}<text>⌄</text></view>
      </picker>
      <view class="resource-grid">
        <view class="upload-resource" @click="chooseResourceUpload">
          <app-icon name="upload" :size="42" />
          <text class="ui-strong">上传</text>
        </view>
        <view v-for="item in filteredResources" :key="item.id" :class="['resource-tile', resourceTileActive(item) ? 'active' : '']" @click="selectResource(item)">
          <image v-if="item.image" :src="item.image" mode="aspectFill" />
          <view v-else class="resource-empty-thumb">图</view>
          <text class="ui-strong">{{ item.name }}</text>
          <text>{{ item.categoryText }}</text>
        </view>
      </view>
      <view v-if="!filteredResources.length" class="empty-drawer">暂无资源</view>
    </view>

    <view :class="['recent-drawer', activeDrawer === 'recent' ? 'drawer-show' : '']">
      <view class="recent-top">
        <text class="ui-strong">最近图片</text>
        <view class="drawer-actions">
          <button @click="loadRecent"><app-icon name="refresh" :size="28" /></button>
          <button @click="closeDrawer"><app-icon name="x" :size="28" /></button>
        </view>
      </view>
      <view class="search-box">
        <app-icon name="search" :size="28" />
        <input v-model="recentKeyword" placeholder="搜索任务编号..." />
      </view>
      <view class="recent-list">
        <view v-for="task in filteredRecentTasks" :key="task.id" class="recent-card" @click="goHistory">
          <view class="recent-image">
            <image v-if="task.image" :src="task.image" mode="aspectFill" />
            <text v-else>{{ task.featureShort }}</text>
          </view>
          <view class="recent-copy">
            <view class="green-pill">{{ task.featureName }}</view>
            <text>{{ task.statusText === '失败' ? '失败，已退回算力' : task.createdAtText }}</text>
            <text class="ui-small">{{ task.id }}</text>
          </view>
        </view>
      </view>
      <button class="secondary-btn drawer-more" @click="goHistory">查看更多记录</button>
    </view>
  </view>
</template>

<script>
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { getCurrentUser } from '../../api/user.js';
import { uploadImage } from '../../api/upload.js';
import { createAiTask, getRecentAiTasks, getRecentImages } from '../../api/task.js';
import { getResources } from '../../api/resource.js';
import { normalizeFileUrl } from '../../utils/fileUrl.js';
import { get } from '../../utils/request.js';
import { requireLogin } from '../../utils/auth.js';
import { displayName, featureName, fmtTime, imageOf, statusText, unwrapList, unwrapUser, userQuota } from '../../utils/model.js';

const RESOURCE_KEY = 'miniapp_workbench_resource';
const FEATURE_KEY = 'miniapp_pending_feature_key';

const baseFeatures = [
  { key: 'material', group: 'base', name: '材质替换', tag: '材质', desc: '替换产品表面材质，快速预览 SKU 效果。', cost: 10 },
  { key: 'replace_bg', group: 'base', name: '场景融合', tag: '场景', desc: '将产品放入真实营销场景。', cost: 12 },
  { key: 'remove_bg', group: 'base', name: '背景净化', tag: '净化', desc: '清理背景并保留产品主体。', cost: 10 },
  { key: 'enhance', group: 'base', name: '摄影增强', tag: '增强', desc: '提升产品照片质感，同时保持真实效果。', cost: 8 },
  { key: 'lineart', group: 'base', name: '线稿图', tag: '线稿', desc: '根据图片生成干净的产品线稿。', cost: 8 },
  { key: 'multiview', group: 'base', name: '多角度视图', tag: '多角度', desc: '生成适合产品展示的多角度视图。', cost: 20 }
];
const promoFeatures = [
  { key: 'promo_main_image', group: 'promotion', name: '产品主图', tag: '主图', desc: '适合电商首图和产品封面。', cost: 12 },
  { key: 'promo_poster_image', group: 'promotion', name: '广告海报图', tag: '海报', desc: '带广告构图和文案留白。', cost: 14 },
  { key: 'promo_detail_image', group: 'promotion', name: '产品细节图', tag: '细节', desc: '突出材质、纹理和工艺细节。', cost: 12 }
];
const promotionOptionDefaults = {
  promo_main_image: { mainBackground: '暖灰渐变商业摄影背景', mainComposition: '主体居中', mainWhitespace: '少量留白' },
  promo_poster_image: { posterTextMode: '自动文案', posterText: '', posterCopyPlacement: '右侧留白', posterTone: '温暖家居' },
  promo_detail_image: { detailLayout: '四宫格', detailFocus: '材质纹理、边角工艺', detailTextMode: '留白不生成文字' }
};
const promotionOptionChoices = {
  mainBackground: ['暖灰渐变商业摄影背景', '浅米色高级背景', '米白色柔和光影', '极简空间背景'],
  mainComposition: ['主体居中', '左侧留白', '右侧留白', '主体偏下'],
  mainWhitespace: ['少量留白', '不留白', '顶部留白', '侧边留白'],
  posterTextMode: ['自动文案', '自定义文案', '不生成文字'],
  posterCopyPlacement: ['右侧留白', '左侧留白', '顶部留白', '下方留白'],
  posterTone: ['温暖家居', '现代简约', '高级质感', '自然木质'],
  detailLayout: ['四宫格', '三宫格', '拼合排版', '多区域细节'],
  detailFocus: ['材质纹理、边角工艺', '结构连接、坐垫厚度', '木纹质感、扶手造型', '布料纹理、靠背弧度'],
  detailTextMode: ['留白不生成文字', '完全不留文字区']
};
const promotionPrompts = {
  promo_main_image: '基于 Image A 中的家具生成一张产品主图。严格保留家具主体造型、结构比例、颜色、材质纹理和主要轮廓，背景干净高级，主体突出，不生成文字、水印、Logo 或人物。',
  promo_poster_image: '基于 Image A 中的家具生成一张广告海报图。严格保留家具主体，画面具有家具品牌广告感和高级商业宣传效果，预留干净文案区域，不生成文字、水印、Logo 或人物。',
  promo_detail_image: '基于 Image A 中的家具生成一张产品细节图。严格保留材质、颜色、纹理和结构，突出布料纹理、木纹、边角工艺、结构连接、坐垫厚度或靠背弧度等细节。'
};

export default {
  components: { AppTopbar },
  data() {
    return {
      user: {}, features: [...baseFeatures, ...promoFeatures],
      featureGroups: [{ key: 'base', name: '基础' }, { key: 'promotion', name: '宣传图' }, { key: 'video', name: '宣传短视频' }],
      featureGroup: 'base', resources: [], recentTasks: [], activeDrawer: '', selectedFeatureKey: 'material',
      inputImages: [], referenceImage: null, referenceOpen: false, selectedResource: null, custom: '', resolution: '2K', ratio: '自适应',
      removeOpts: { whiteBg: false, mirror: false }, enhanceOpts: { focus: false, angle: '不变' }, multiView: '三角度视图',
      resourceScopeIndex: 0, resourceKeyword: '', recentKeyword: '', uploadBusy: false, submitBusy: false, resourcePickTarget: 'reference',
      resourceScopes: [{ key: 'SYSTEM', name: '系统空间' }, { key: 'MERCHANT', name: '门店空间' }, { key: 'USER', name: '个人空间' }, { key: 'ALL', name: '全部空间' }],
      enhanceAngles: ['不变', '正面', '45度', '侧面'], multiViewOptions: ['三角度视图', '四角度视图'], errorText: '',
      costSettings: {},
      promotionOptions: JSON.parse(JSON.stringify(promotionOptionDefaults))
    };
  },
  computed: {
    quotaText() { return userQuota(this.user); },
    topbarAvatar() { return displayName(this.user).slice(0, 1) || '勋'; },
    currentFeature() { return this.features.find((item) => item.key === this.selectedFeatureKey) || this.features[0]; },
    isPromotionSelected() { return this.currentFeature.group === 'promotion'; },
    currentFeatureMode() { return this.isPromotionSelected ? '宣传图' : '生图功能'; },
    currentCost() {
      const opMap = { material: 'cost_material', replace_bg: 'cost_replace_bg', remove_bg: 'cost_remove_bg', enhance: 'cost_enhance', lineart: 'cost_lineart', multiview: 'cost_multiview', promo_main_image: 'cost_replace_bg', promo_poster_image: 'cost_replace_bg', promo_detail_image: 'cost_enhance' };
      const mulKeyMap = { '1K': 'resolution_multiplier_1k', '2K': 'resolution_multiplier_2k', '4K': 'resolution_multiplier_4k' };
      const defaultMul = { '1K': 1, '2K': 2, '4K': 4 };
      const base = Number(this.costSettings[opMap[this.selectedFeatureKey]] ?? this.currentFeature.cost ?? 0);
      const mul = Number(this.costSettings[mulKeyMap[this.resolution]] ?? defaultMul[this.resolution] ?? 2);
      return Math.max(0, Math.ceil(base * mul));
    },
    drawerFeatures() { return this.features.filter((item) => item.group === this.featureGroup); },
    needsResource() { return this.selectedFeatureKey === 'material' || this.selectedFeatureKey === 'replace_bg'; },
    resourceLabel() { if (this.resourcePickTarget === 'origin') return '产品原图'; return this.selectedFeatureKey === 'replace_bg' ? '场景模板（可选）' : '参考图（可选）'; },
    resourceDrawerTitle() { if (this.resourcePickTarget === 'origin') return '选择产品图'; return this.selectedFeatureKey === 'material' ? '选择材质' : this.selectedFeatureKey === 'replace_bg' ? '选择场景' : '选择参考素材'; },
    resourceSectionTitle() { return this.selectedFeatureKey === 'replace_bg' ? '场景融合资源' : '材质替换'; },
    originImage() { return this.inputImages[0] || null; },
    resolutionOptions() { return ['1K', '2K', '4K']; },
    ratioOptions() { return this.featureGroup === 'video' ? ['16:9', '9:16', '1:1', '4:3', '3:4'] : ['自适应', '1:1', '4:3', '3:4', '16:9']; },
    resourceScopeNames() { return this.resourceScopes.map((item) => item.name); },
    filteredResources() {
      const scope = this.resourceScopes[this.resourceScopeIndex]?.key || 'ALL';
      const kw = String(this.resourceKeyword || '').trim().toLowerCase();
      return this.resources.filter((item) => {
        if (scope !== 'ALL' && item.scope !== scope) return false;
        if (this.resourcePickTarget === 'origin' ? !this.originMatchesResource(item) : !this.featureMatchesResource(item)) return false;
        if (!kw) return true;
        return this.resourceSearchText(item).includes(kw);
      });
    },
    filteredRecentTasks() {
      const kw = String(this.recentKeyword || '').trim().toLowerCase();
      return this.recentTasks.filter((item) => !kw || String(item.id || '').toLowerCase().includes(kw) || String(item.featureName || '').toLowerCase().includes(kw));
    },
    promptPlaceholder() { return '选填：如有特殊要求，可以简短说明'; },
    generateLabel() { return this.isPromotionSelected ? '生成宣传图' : '生成效果'; },
    referenceStateText() { return this.referenceImage || this.selectedResource ? '已添加' : '未添加'; },
    promotionFields() {
      if (this.selectedFeatureKey === 'promo_main_image') return [
        { key: 'mainBackground', label: '背景风格', choices: promotionOptionChoices.mainBackground },
        { key: 'mainComposition', label: '主图构图', choices: promotionOptionChoices.mainComposition },
        { key: 'mainWhitespace', label: '留白要求', choices: promotionOptionChoices.mainWhitespace }
      ];
      if (this.selectedFeatureKey === 'promo_poster_image') return [
        { key: 'posterTextMode', label: '海报文字', choices: promotionOptionChoices.posterTextMode },
        { key: 'posterCopyPlacement', label: '文案区域', choices: promotionOptionChoices.posterCopyPlacement },
        { key: 'posterTone', label: '海报氛围', choices: promotionOptionChoices.posterTone }
      ];
      if (this.selectedFeatureKey === 'promo_detail_image') return [
        { key: 'detailLayout', label: '细节排版', choices: promotionOptionChoices.detailLayout },
        { key: 'detailFocus', label: '细节重点', choices: promotionOptionChoices.detailFocus },
        { key: 'detailTextMode', label: '文字策略', choices: promotionOptionChoices.detailTextMode }
      ];
      return [];
    },
    optionsSummary() {
      if (this.isPromotionSelected) return '按 Web 工作台宣传图固定要求生成';
      if (this.selectedFeatureKey === 'remove_bg') return `${this.removeOpts.whiteBg ? '白底图' : '原背景净化'}${this.removeOpts.mirror ? '，镜像' : ''}`;
      if (this.selectedFeatureKey === 'enhance') return `${this.enhanceOpts.focus ? '产品聚焦，' : ''}${this.enhanceOpts.angle}`;
      if (this.selectedFeatureKey === 'multiview') return this.multiView;
      return '按 Web 工作台默认参数生成';
    }
  },
  onShow() {
    if (!requireLogin()) return;
    this.applyPendingFeature(); this.applyPendingResource(); this.loadData();
  },
  methods: {
    async loadData() {
      this.errorText = '';
      try { this.user = unwrapUser(await getCurrentUser({ showLoading: false, showErrorToast: false })) || {}; } catch (e) {}
      try { this.costSettings = await get('/api/settings/public', {}, { showLoading: false, showErrorToast: false }) || {}; } catch (e) {}
      await Promise.all([this.loadResources(), this.loadRecent()]);
    },
    async loadResources() {
      try { this.resources = unwrapList(await getResources({ pageSize: 80 }, { showLoading: false, showErrorToast: false })).map(this.normalizeResource); } catch (error) { this.resources = []; }
    },
    async loadRecent() {
      try {
        const [tasksPayload, imagesPayload] = await Promise.all([
          getRecentAiTasks({ pageSize: 20 }, { showLoading: false, showErrorToast: false }).catch(() => null),
          getRecentImages({ pageSize: 20 }, { showLoading: false, showErrorToast: false }).catch(() => null)
        ]);
        this.recentTasks = [...unwrapList(tasksPayload).map(this.normalizeTask), ...unwrapList(imagesPayload).map(this.normalizeTask)].slice(0, 20);
      } catch (error) { this.recentTasks = []; }
    },
    normalizeResource(item = {}) {
      const scope = String(item.scope || item.space || '').toUpperCase();
      const type = String(item.resourceType || item.resource_type || item.type || '').toLowerCase();
      return { ...item, id: item.id, name: item.name || item.title || '未命名资源', image: normalizeFileUrl(imageOf(item)), imageUrl: normalizeFileUrl(imageOf(item)), scope, resourceType: type, typeText: type || '素材', categoryText: [item.mainCategoryName || item.objectName, item.subCategoryName || item.colorName].filter(Boolean).join(' / ') || '未分类' };
    },
    normalizeTask(item = {}) {
      const key = item.featureKey || item.operation || item.kind || item.type || '';
      const name = featureName(key, item.featureName || item.operationName || item.kindName || '生成记录');
      return { ...item, id: item.id || item.taskId, featureName: name, featureShort: name.slice(0, 2), statusText: statusText(item.status || 'success'), createdAtText: fmtTime(item.createdAt || item.created_at), image: normalizeFileUrl(imageOf(item)) };
    },
    openDrawer(name) { this.activeDrawer = name; },
    openResourceDrawer(target = 'reference') { this.resourcePickTarget = target; this.openDrawer('resources'); },
    closeDrawer() { this.activeDrawer = ''; },
    selectFeatureGroup(key) {
      if (key === 'video') {
        uni.showToast({ title: '宣传短视频开发中', icon: 'none' });
        return;
      }
      this.featureGroup = key;
      if (key === 'base' && this.isPromotionSelected) this.selectedFeatureKey = 'material';
      if (key === 'promotion' && !this.isPromotionSelected) this.selectedFeatureKey = 'promo_main_image';
      this.selectedResource = null;
    },
    selectFeature(key) { this.selectedFeatureKey = key; const feature = this.features.find((item) => item.key === key); this.featureGroup = feature?.group || this.featureGroup; this.selectedResource = null; },
    resourceSearchText(item = {}) { return [item.name, item.objectName, item.colorName, item.description, item.mainCategoryName, item.subCategoryName, item.categoryText, item.typeText, item.resourceType].filter(Boolean).join(' ').toLowerCase(); },
    originMatchesResource(item = {}) {
      const type = String(item.resourceType || item.type || '').toLowerCase();
      const text = this.resourceSearchText(item);
      return type === 'user_reference' || type === 'image' || text.includes('产品') || text.includes('原图') || text.includes('参考');
    },
    featureMatchesResource(item = {}) {
      const type = String(item.resourceType || item.type || '').toLowerCase();
      const text = this.resourceSearchText(item);
      if (this.selectedFeatureKey === 'material') return type === 'material' || text.includes('材质') || text.includes('软体') || text.includes('布料') || text.includes('皮革') || text.includes('皮质') || text.includes('木纹');
      if (this.selectedFeatureKey === 'replace_bg') return type === 'scene' || text.includes('场景') || text.includes('空间') || text.includes('客厅') || text.includes('卧室') || text.includes('餐厅') || text.includes('室内') || text.includes('背景');
      return this.referenceOpen;
    },
    resourceTileActive(item = {}) { return this.resourcePickTarget === 'origin' ? !!(this.originImage && this.originImage.id === item.id) : !!(this.selectedResource && this.selectedResource.id === item.id); },
    selectOriginResource(item = {}) { this.inputImages = [{ ...item, imageUrl: item.imageUrl || item.image, name: item.name || '资源图片' }]; this.selectedResource = null; this.referenceImage = null; },
    selectFeatureResource(item) { this.selectedResource = item; },
    selectResource(item) { if (this.resourcePickTarget === 'origin') this.selectOriginResource(item); else this.selectedResource = item; this.closeDrawer(); },
    promotionOptionValue(key) { return this.promotionOptions[this.selectedFeatureKey]?.[key] || promotionOptionDefaults[this.selectedFeatureKey]?.[key] || ''; },
    changePromotionOption(key, value) { this.promotionOptions = { ...this.promotionOptions, [this.selectedFeatureKey]: { ...(promotionOptionDefaults[this.selectedFeatureKey] || {}), ...(this.promotionOptions[this.selectedFeatureKey] || {}), [key]: value } }; },
    changeResourceScope(e) { this.resourceScopeIndex = Number(e.detail.value) || 0; },
    applyPendingFeature() { const key = uni.getStorageSync(FEATURE_KEY); if (key && this.features.some((item) => item.key === key)) { this.selectedFeatureKey = key; const feature = this.features.find((item) => item.key === key); this.featureGroup = feature.group || 'base'; uni.removeStorageSync(FEATURE_KEY); } },
    applyPendingResource() { const resource = uni.getStorageSync(RESOURCE_KEY); if (resource && resource.id) { this.selectedResource = resource; uni.removeStorageSync(RESOURCE_KEY); } },
    chooseResourceUpload() { if (this.resourcePickTarget === 'origin') return this.chooseInputImage(); return this.chooseReferenceImage(); },
    chooseInputImage() { if (this.uploadBusy) return; uni.chooseImage({ count: Math.max(1, 4 - this.inputImages.length), sizeType: ['compressed'], sourceType: ['album', 'camera'], success: async (res) => { for (const path of (res.tempFilePaths || [])) await this.uploadOne(path, 'source'); } }); },
    chooseReferenceImage() { if (this.uploadBusy) return; uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: async (res) => { const path = (res.tempFilePaths || [])[0]; if (path) await this.uploadOne(path, 'reference'); } }); },
    async uploadOne(filePath, target = 'source') { this.uploadBusy = true; try { const response = await uploadImage(filePath, { source: target === 'reference' ? 'miniapp_workbench_reference' : 'miniapp_workbench' }); const image = response.image || response.data?.image || response.item || response.data || response; const next = { ...image, id: image.id || image.imageId, name: image.originalName || image.name || '上传图片', imageUrl: normalizeFileUrl(imageOf(image)) }; if (target === 'reference') this.referenceImage = next; else this.inputImages.push(next); } catch (error) { this.errorText = error.message || '上传失败'; } finally { this.uploadBusy = false; } },
    changeRatio(e) { this.ratio = this.ratioOptions[Number(e.detail.value)] || this.ratio; },
    changeEnhanceAngle(e) { this.enhanceOpts.angle = this.enhanceAngles[Number(e.detail.value)] || '不变'; },
    buildOptions() { const base = { resolution: this.resolution, ratio: this.ratio }; if (this.isPromotionSelected) return { taskType: this.selectedFeatureKey === 'promo_main_image' ? 'PROMO_MAIN_IMAGE' : this.selectedFeatureKey === 'promo_poster_image' ? 'PROMO_POSTER_IMAGE' : 'PROMO_DETAIL_IMAGE', promotionType: this.currentFeature.name, ...base, ...(promotionOptionDefaults[this.selectedFeatureKey] || {}), ...(this.promotionOptions[this.selectedFeatureKey] || {}), promptTemplate: promotionPrompts[this.selectedFeatureKey], keepSubject: true, forbidGeneratedText: true, forbidLogo: true, forbidPeople: true }; if (this.selectedFeatureKey === 'material') { const tpl = this.selectedResource || {}; return { ...base, materialName: tpl.name || '', materialColor: tpl.colorName || '', materialCategory: tpl.subCategoryName || tpl.mainCategoryName || tpl.objectName || tpl.category || '', resourceName: tpl.name || '', templateName: tpl.name || '', keepStructure: true, keepAngle: true, keepProportion: true }; } if (this.selectedFeatureKey === 'replace_bg') { const tpl = this.selectedResource || {}; return { ...base, sceneType: tpl.name || tpl.subCategoryName || tpl.mainCategoryName || tpl.category || '真实室内商业场景', sceneName: tpl.name || '', sceneDesc: tpl.description || '', resourceName: tpl.name || '', templateName: tpl.name || '', keepLighting: true, keepPerspective: true }; } if (this.selectedFeatureKey === 'remove_bg') return { ...base, whiteBg: !!this.removeOpts.whiteBg, mirror: !!this.removeOpts.mirror, backgroundTone: this.removeOpts.whiteBg ? 'Pure white' : 'Warm white', shadowStyle: '柔和阴影' }; if (this.selectedFeatureKey === 'enhance') return { ...base, focus: !!this.enhanceOpts.focus, angle: this.enhanceOpts.angle, enhanceSharpness: true, enhanceLight: true, enhanceTexture: true, enhanceColor: true, commercialStyle: true }; if (this.selectedFeatureKey === 'lineart') return { ...base, lineStyle: 'Simple line art', lineColor: '黑色', keepDetailLevel: '中等', withShadow: false }; if (this.selectedFeatureKey === 'multiview') { const viewCount = this.multiView === '三角度视图' ? 3 : 4; return { ...base, view: this.multiView, viewCount, layoutType: viewCount === 3 ? '横排' : '宫格', backgroundStyle: '纯白' }; } return base; },
    async submitTask() { if (!this.originImage) return uni.showToast({ title: '请先上传家具原图', icon: 'none' }); this.submitBusy = true; this.errorText = ''; try { const tpl = this.selectedResource; const referenceIds = this.referenceImage?.id ? [this.referenceImage.id] : []; const result = await createAiTask({ originImageId: this.originImage.id || this.originImage.imageId, featureKey: this.selectedFeatureKey, selectedResourceId: tpl?.id || null, selectedResourceSnapshot: tpl ? { id: tpl.id, imageId: tpl.id, name: tpl.name, resourceType: tpl.resourceType, mainCategoryName: tpl.mainCategoryName || tpl.objectName || '', subCategoryName: tpl.subCategoryName || tpl.colorName || '', imageUrl: tpl.imageUrl || tpl.image || tpl.url || '' } : null, functionalReferenceImageId: null, templatePrompt: tpl ? (tpl.description || tpl.name) : '', userPrompt: this.custom.trim(), userReferenceImageIds: referenceIds, referenceImageIds: referenceIds, resolution: this.resolution, ratio: this.ratio, options: this.buildOptions() }); if (result?.user) this.user = result.user; uni.showToast({ title: '任务已提交，正在生成', icon: 'success' }); await this.loadRecent(); this.openDrawer('recent'); } catch (error) { this.errorText = error.message || '任务提交失败'; } finally { this.submitBusy = false; } },
    goHistory() { uni.reLaunch({ url: '/pages/tasks/index' }); },
    goMine() { uni.reLaunch({ url: '/pages/mine/index' }); }
  }
};
</script>

<style scoped>
.workbench-page { padding-bottom: 40rpx; }
.metric-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin: 22rpx 0 18rpx; }
.metric-card { min-height: 80rpx; display: flex; align-items: center; gap: 14rpx; padding: 14rpx 18rpx; border-radius: 22rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.045); }
.metric-card:first-child { border-color: rgba(var(--xg-color-primary-rgb), .34); background: linear-gradient(135deg, rgba(var(--xg-color-primary-rgb), .16), rgba(255,255,255,.035)); }
.metric-icon { width: 42rpx; display: flex; align-items: center; justify-content: center; color: var(--xg-color-primary); }
.metric-copy { min-width: 0; }
.metric-copy text { display: block; color: var(--xg-text-muted); font-size: 21rpx; font-weight: 800; }
.metric-copy .ui-strong { display: block; margin-top: 2rpx; color: var(--xg-text-main); font-size: 27rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.work-card, .ref-card, .requirement-input { border-radius: 28rpx; border: 1rpx solid rgba(255,255,255,.09); background: var(--xg-bg-card); }
.upload-card { padding: 22rpx; }
.block-title { display: flex; align-items: center; gap: 10rpx; color: var(--xg-text-main); font-size: 32rpx; font-weight: 900; margin-bottom: 18rpx; }
.upload-zone { min-height: 408rpx; border-radius: 24rpx; border: 2rpx dashed rgba(var(--xg-color-primary-rgb), .4); background: rgba(255,255,255,.018); overflow: hidden; }
.upload-empty { height: 408rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14rpx; color: var(--xg-text-main); }
.upload-plus { width: 92rpx; height: 92rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(var(--xg-color-primary-rgb), .18); color: var(--xg-color-primary); font-size: 56rpx; font-weight: 900; }
.upload-empty .ui-strong { font-size: 34rpx; font-weight: 900; }
.upload-empty text { color: var(--xg-text-muted); font-size: 24rpx; }
.resource-select-btn { min-width: 236rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; border: 1rpx solid rgba(255,255,255,.18); color: var(--xg-text-main); font-size: 26rpx; }
.upload-preview { position: relative; height: 408rpx; }
.upload-preview image { width: 100%; height: 100%; }
.upload-preview-meta { position: absolute; left: 20rpx; right: 20rpx; bottom: 20rpx; padding: 18rpx; border-radius: 20rpx; color: #fff; background: rgba(0,0,0,.62); }
.upload-preview-meta .ui-strong, .upload-preview-meta text { display: block; }
.ref-card { margin-top: 28rpx; overflow: hidden; }
.ref-header { min-height: 118rpx; padding: 0 28rpx; display: flex; align-items: center; justify-content: space-between; }
.fold-title { display: flex; align-items: center; gap: 10rpx; color: var(--xg-text-main); font-size: 34rpx; font-weight: 900; }
.fold-state { display: flex; align-items: center; gap: 16rpx; color: var(--xg-text-muted); font-size: 28rpx; }
.fold-state text { max-width: 300rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fold-arrow { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; color: var(--xg-color-primary); border: 1rpx solid rgba(var(--xg-color-primary-rgb), .32); background: rgba(var(--xg-color-primary-rgb), .08); font-size: 32rpx; }
.ref-body { display: grid; grid-template-columns: 1fr; gap: 18rpx; padding: 0 28rpx 28rpx; }
.ref-upload { min-height: 178rpx; border-radius: 24rpx; border: 2rpx dashed rgba(var(--xg-color-primary-rgb), .32); background: rgba(255,255,255,.02); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10rpx; overflow: hidden; color: var(--xg-text-main); }
.ref-upload image { width: 100%; height: 260rpx; display: block; }
.ref-upload .app-icon { color: var(--xg-color-primary); }
.ref-upload .ui-strong { color: var(--xg-text-main); font-size: 28rpx; font-weight: 900; }
.ref-resource-btn { width: 100%; }
.selected-tip { padding: 16rpx 18rpx; border-radius: 18rpx; color: var(--xg-color-primary); background: rgba(var(--xg-color-primary-rgb), .09); font-size: 24rpx; }
.requirement-input { box-sizing: border-box; width: 100%; min-height: 148rpx; padding: 22rpx; margin-top: 22rpx; color: var(--xg-text-main); font-size: 28rpx; }
.param-block { margin-top: 22rpx; }
.param-title { color: var(--xg-text-main); font-size: 28rpx; font-weight: 900; margin-bottom: 14rpx; }
.resolution-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12rpx; }
.resolution-grid button { height: 78rpx; border-radius: 20rpx; color: var(--xg-text-main); background: rgba(255,255,255,.05); border: 1rpx solid rgba(255,255,255,.1); font-size: 28rpx; }
.resolution-grid button.active { color: var(--xg-text-inverse); background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); border-color: transparent; }
.ratio-cost-row { display: grid; grid-template-columns: 1fr; gap: 14rpx; align-items: stretch; }
.ratio-picker, .cost-box { height: 82rpx; box-sizing: border-box; border-radius: 20rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); }
.ratio-picker { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; color: var(--xg-text-main); font-size: 28rpx; }
.cost-box { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 0 22rpx; color: var(--xg-text-muted); font-size: 23rpx; }
.cost-box .ui-strong { color: var(--xg-color-primary); font-size: 26rpx; }
.generate-button { margin-top: 24rpx; }
.drawer-mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 78; background: rgba(0,0,0,.58); backdrop-filter: blur(8px); }
.feature-drawer, .resource-drawer, .recent-drawer { position: fixed; top: 0; bottom: 0; z-index: 80; box-sizing: border-box; padding: calc(var(--status-bar-height) + 32rpx) 28rpx 40rpx; background: linear-gradient(180deg, var(--xg-bg-card) 0%, var(--xg-bg-card-soft) 100%); border-right: 1rpx solid rgba(var(--xg-color-primary-rgb), .22); overflow-y: auto; transition: transform .22s ease; }
.feature-drawer, .resource-drawer { left: 0; width: 86vw; max-width: 660rpx; transform: translateX(-104%); }
.recent-drawer { right: 0; width: 86vw; max-width: 660rpx; transform: translateX(104%); border-right: 0; border-left: 1rpx solid rgba(var(--xg-color-primary-rgb), .22); }
.drawer-show { transform: translateX(0); }
.drawer-top, .recent-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.drawer-top text { display: block; color: var(--xg-text-muted); font-size: 24rpx; font-weight: 800; }
.drawer-top .ui-strong, .recent-top .ui-strong { display: block; color: var(--xg-text-main); font-size: 34rpx; font-weight: 900; }
.drawer-close, .drawer-actions button { width: 72rpx; height: 72rpx; padding: 0; border-radius: 22rpx; color: var(--xg-color-primary); background: rgba(255,255,255,.055); border: 1rpx solid rgba(255,255,255,.13); font-size: 30rpx; }
.group-tabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 10rpx; margin-bottom: 20rpx; }
.group-tabs text { height: 60rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; color: var(--xg-text-main); background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.09); font-size: 24rpx; font-weight: 800; }
.group-tabs text.active { color: var(--xg-text-inverse); background: linear-gradient(135deg,var(--xg-color-primary),var(--xg-color-accent)); }
.group-tabs text.is-coming { color: var(--xg-text-muted); }
.feature-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14rpx; }
.feature-btn { min-height: 102rpx; padding: 14rpx 16rpx; border-radius: 16rpx; background: rgba(255,255,255,.045); border: 1rpx solid rgba(255,255,255,.1); }
.feature-btn.active { border-color: rgba(var(--xg-color-primary-rgb), .65); background: rgba(var(--xg-color-primary-rgb), .11); }
.feature-tag { display: inline-flex; padding: 3rpx 10rpx; border-radius: 999rpx; color: var(--xg-text-inverse); background: var(--xg-color-primary); font-size: 18rpx; font-weight: 900; }
.feature-btn .ui-strong { display: block; margin-top: 8rpx; color: var(--xg-text-main); font-size: 26rpx; font-weight: 900; }
.drawer-section { margin-top: 26rpx; }
.hint-line, .empty-drawer { padding: 18rpx; border-radius: 16rpx; color: var(--xg-text-muted); background: rgba(255,255,255,.04); font-size: 24rpx; }
.feature-resource-panel { display: grid; gap: 16rpx; }
.feature-desc-row { display: flex; align-items: flex-start; gap: 14rpx; color: var(--xg-text-muted); font-size: 26rpx; line-height: 1.55; }
.feature-desc-row text { color: var(--xg-color-primary); font-size: 30rpx; font-weight: 900; }
.feature-desc-row .ui-strong { flex: 1; font-weight: 500; }
.feature-search-box { margin-bottom: 0; }
.resource-section-title { color: var(--xg-text-main); font-size: 27rpx; font-weight: 900; }
.feature-resource-grid { margin-top: 0; }
.switch-row, .option-row { min-height: 70rpx; display: flex; align-items: center; justify-content: space-between; color: var(--xg-text-main); font-size: 26rpx; }
.option-picker { min-width: 180rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 16rpx; color: var(--xg-text-main); background: rgba(255,255,255,.055); }
.promo-options { display: grid; gap: 12rpx; margin-top: 16rpx; }
.promo-options .option-row { padding: 0 18rpx; border-radius: 18rpx; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.08); }
.promo-textarea { width: 100%; min-height: 136rpx; box-sizing: border-box; padding: 20rpx; border-radius: 18rpx; color: var(--xg-text-main); background: rgba(255,255,255,.05); border: 1rpx solid rgba(255,255,255,.1); font-size: 26rpx; }
.mini-pills { display: flex; gap: 12rpx; }
.mini-pills button { flex: 1; height: 66rpx; border-radius: 16rpx; background: rgba(255,255,255,.055); color: var(--xg-text-main); }
.mini-pills button.active { color: var(--xg-text-inverse); background: var(--xg-color-primary); }
.search-box { height: 72rpx; display: flex; align-items: center; gap: 14rpx; padding: 0 22rpx; margin-bottom: 16rpx; border-radius: 18rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: var(--xg-text-muted); }
.search-box input { flex: 1; color: var(--xg-text-main); }
.space-picker { height: 68rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 22rpx; margin-bottom: 18rpx; border-radius: 16rpx; color: var(--xg-text-main); background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.1); }
.resource-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16rpx; }
.upload-resource, .resource-tile { min-height: 172rpx; border-radius: 18rpx; overflow: hidden; background: rgba(255,255,255,.04); border: 1rpx solid rgba(255,255,255,.1); }
.upload-resource { display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--xg-text-main); font-size: 24rpx; }
.upload-resource .app-icon { color: var(--xg-color-primary); }
.resource-tile.active { border-color: rgba(var(--xg-color-primary-rgb), .75); }
.resource-tile image, .resource-empty-thumb { width: 100%; height: 112rpx; display: flex; align-items: center; justify-content: center; color: var(--xg-color-primary); background: rgba(var(--xg-color-primary-rgb), .08); }
.resource-tile .ui-strong { display: block; padding: 9rpx 10rpx 0; color: var(--xg-text-main); font-size: 20rpx; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resource-tile text { display: block; padding: 2rpx 10rpx 10rpx; color: var(--xg-text-muted); font-size: 17rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer-actions { display: flex; gap: 12rpx; }
.recent-list { display: flex; flex-direction: column; gap: 18rpx; }
.recent-card { display: flex; gap: 16rpx; padding: 16rpx; border-radius: 20rpx; border: 1rpx solid rgba(255,255,255,.1); background: rgba(255,255,255,.045); }
.recent-image { width: 130rpx; height: 130rpx; flex: 0 0 130rpx; border-radius: 16rpx; overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(var(--xg-color-primary-rgb), .1); color: var(--xg-color-primary); }
.recent-image image { width: 100%; height: 100%; }
.recent-copy { flex: 1; min-width: 0; }
.green-pill { height: 42rpx; display: flex; align-items: center; padding: 0 18rpx; border-radius: 999rpx; color: #fff; background: #06c968; font-size: 23rpx; font-weight: 900; }
.recent-copy text, .recent-copy .ui-small { display: block; margin-top: 11rpx; color: var(--xg-text-muted); font-size: 23rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer-more { margin-top: 20rpx; }
.error-card { margin: 18rpx 0; padding: 18rpx; border-radius: 18rpx; background: rgba(255,112,112,.08); color: #ffb4a8; border: 1rpx solid rgba(255,112,112,.22); font-size: 24rpx; }
</style>
