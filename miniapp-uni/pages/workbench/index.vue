<template>
  <view class="page workbench-page">
    <view class="hero-card">
      <view>
        <view class="kicker">工作台</view>
        <view class="title">{{ currentFeature.name || '家具生图' }}</view>
      </view>
      <view class="quota">{{ currentFeature.cost || 0 }} 算力</view>
    </view>

    <view class="group-tabs">
      <view
        v-for="group in groups"
        :key="group.key"
        :class="['group-tab', activeGroup === group.key ? 'active' : '']"
        @click="switchGroup(group.key)"
      >
        {{ group.name }}
      </view>
    </view>

    <scroll-view scroll-x class="feature-scroll">
      <view
        v-for="item in groupFeatures"
        :key="item.key"
        :class="['feature-card', selectedFeatureKey === item.key ? 'active' : '']"
        @click="selectFeature(item)"
      >
        <view class="feature-name">{{ item.name }}</view>
        <view class="feature-use">{{ item.scene }}</view>
      </view>
    </scroll-view>

    <view class="panel">
      <view class="panel-head">
        <text>{{ activeGroup === 'video' ? '分镜图片' : '家具原图' }}</text>
        <text class="count">{{ inputImages.length }}/{{ maxImageCount }}</text>
      </view>
      <view class="upload-actions">
        <button class="secondary-btn action-btn" @click="mockUpload">上传</button>
        <button class="secondary-btn action-btn" @click="clearInputs">清空</button>
      </view>
      <view class="image-list" v-if="inputImages.length">
        <view v-for="image in inputImages" :key="image.id" class="image-item">
          <view class="image-thumb"><view class="furniture-shape"></view></view>
          <text>{{ image.name }}</text>
        </view>
      </view>
    </view>

    <view class="panel compact" v-if="sourceResources.length">
      <view class="panel-head">
        <text>资源库</text>
        <text class="count">可选</text>
      </view>
      <scroll-view scroll-x class="resource-scroll">
        <view
          v-for="item in sourceResources"
          :key="item.id"
          :class="['resource-item', inputResource && inputResource.id === item.id ? 'active' : '']"
          @click="useResourceAsInput(item)"
        >
          <view class="mini-thumb"><view class="furniture-shape small"></view></view>
          <text>{{ item.name }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="panel" v-if="needsReference">
      <view class="panel-head">
        <text>{{ selectedFeatureKey === 'material_replace' ? '材质' : '场景' }}</text>
        <text class="count">参考</text>
      </view>
      <view
        v-for="item in referenceResources"
        :key="item.id"
        :class="['ref-row', selectedReference && selectedReference.id === item.id ? 'active' : '']"
        @click="selectedReference = item"
      >
        <view class="mini-thumb"><view class="furniture-shape small"></view></view>
        <view>
          <view class="ref-name">{{ item.name }}</view>
          <view class="muted">{{ item.subCategoryName }}</view>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="panel-head">
        <text>参数</text>
        <text class="count">{{ currentFeature.shortName }}</text>
      </view>

      <view class="param-list">
        <view v-for="row in paramRows" :key="row.key" class="param-row">
          <text>{{ row.label }}</text>
          <view class="pill-row">
            <text
              v-for="item in row.items"
              :key="item"
              :class="params[row.key] === item ? 'active' : ''"
              @click="setParam(row.key, item)"
            >{{ item }}</text>
          </view>
        </view>
      </view>

      <input v-if="selectedFeatureKey === 'material_replace'" class="input" v-model="params.materialName" placeholder="材质" />
      <input v-if="selectedFeatureKey === 'promo_poster_image' && params.posterTextMode === '自定义'" class="input" v-model="params.posterText" placeholder="海报文案" />

      <textarea class="textarea" v-model="prompt" placeholder="补充需求" />
    </view>

    <button class="primary-btn submit-btn" @click="submitTask">{{ activeGroup === 'video' ? '生成视频' : '生成图片' }}</button>
  </view>
</template>

<script>
import {
  consumeWorkbenchResource,
  createMockTask,
  getFeatureTypes,
  getMockResources
} from '../../utils/mockStore.js';

const FEATURE_KEY = 'miniapp_pending_feature_key';

export default {
  data() {
    return {
      groups: [
        { key: 'base', name: '基础' },
        { key: 'promotion', name: '宣传图' },
        { key: 'video', name: '短视频' }
      ],
      activeGroup: 'base',
      features: [],
      resources: [],
      selectedFeatureKey: 'background_clean',
      inputImages: [],
      inputResource: null,
      selectedReference: null,
      prompt: '',
      params: {
        cleanBg: '白底',
        shadow: '柔和',
        keep: '严格',
        materialName: '',
        sceneMood: '现代',
        composition: '主体居中',
        enhanceFocus: '质感',
        angle: '不变',
        detailLevel: '标准',
        viewMode: '四视图',
        mainBackground: '暖灰',
        mainComposition: '居中',
        posterTextMode: '自动',
        posterText: '',
        posterTone: '温暖',
        detailLayout: '四宫格',
        detailFocus: '材质',
        duration: '5秒',
        ratio: '16:9',
        camera: '推进'
      }
    };
  },
  computed: {
    currentFeature() {
      const found = this.features.find((item) => item.key === this.selectedFeatureKey);
      return found || {};
    },
    groupFeatures() {
      return this.features.filter((item) => (item.group || 'base') === this.activeGroup);
    },
    maxImageCount() {
      return this.activeGroup === 'video' ? 12 : 4;
    },
    needsReference() {
      return this.selectedFeatureKey === 'material_replace' || this.selectedFeatureKey === 'scene_fusion';
    },
    sourceResources() {
      return this.resources.filter((item) => ['original', 'generated', 'personal'].indexOf(item.type) >= 0);
    },
    referenceResources() {
      const target = this.selectedFeatureKey === 'material_replace' ? 'material' : 'scene';
      return this.resources.filter((item) => item.resourceType === target);
    },
    paramRows() {
      const map = {
        background_clean: [
          { label: '背景', key: 'cleanBg', items: ['白底', '浅灰'] },
          { label: '阴影', key: 'shadow', items: ['柔和', '无'] }
        ],
        material_replace: [
          { label: '保留', key: 'keep', items: ['严格', '优化'] }
        ],
        scene_fusion: [
          { label: '风格', key: 'sceneMood', items: ['现代', '温馨', '高级'] },
          { label: '构图', key: 'composition', items: ['主体居中', '左留白', '右留白'] }
        ],
        photo_enhance: [
          { label: '重点', key: 'enhanceFocus', items: ['质感', '光影', '清晰'] },
          { label: '角度', key: 'angle', items: ['不变', '正面', '45度'] }
        ],
        line_drawing: [
          { label: '线稿', key: 'detailLevel', items: ['标准', '精细'] }
        ],
        multi_view: [
          { label: '视图', key: 'viewMode', items: ['三视图', '四视图'] }
        ],
        promo_main_image: [
          { label: '背景', key: 'mainBackground', items: ['暖灰', '米白', '极简'] },
          { label: '构图', key: 'mainComposition', items: ['居中', '左留白', '右留白'] }
        ],
        promo_poster_image: [
          { label: '文案', key: 'posterTextMode', items: ['自动', '不生成', '自定义'] },
          { label: '氛围', key: 'posterTone', items: ['温暖', '简约', '高级'] }
        ],
        promo_detail_image: [
          { label: '排版', key: 'detailLayout', items: ['四宫格', '三宫格', '拼合'] },
          { label: '重点', key: 'detailFocus', items: ['材质', '工艺', '结构'] }
        ],
        video_generate: [
          { label: '时长', key: 'duration', items: ['5秒', '10秒', '15秒'] },
          { label: '比例', key: 'ratio', items: ['16:9', '9:16', '1:1'] },
          { label: '运镜', key: 'camera', items: ['推进', '环绕', '平移'] }
        ]
      };
      return map[this.selectedFeatureKey] || map.background_clean;
    }
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    this.loadData();
    const pendingFeature = uni.getStorageSync(FEATURE_KEY);
    if (pendingFeature) {
      const feature = this.features.find((item) => item.key === pendingFeature);
      if (feature) this.selectFeature(feature);
      uni.removeStorageSync(FEATURE_KEY);
    }
    const resource = consumeWorkbenchResource();
    if (resource) this.applyIncomingResource(resource);
  },
  methods: {
    loadData() {
      this.features = getFeatureTypes();
      this.resources = getMockResources();
      if (!this.groupFeatures.length && this.features.length) {
        this.selectFeature(this.features[0]);
      }
    },
    switchGroup(key) {
      this.activeGroup = key;
      const first = this.features.find((item) => (item.group || 'base') === key);
      if (first) this.selectedFeatureKey = first.key;
      this.selectedReference = null;
    },
    selectFeature(item) {
      if (!item) return;
      this.activeGroup = item.group || 'base';
      this.selectedFeatureKey = item.key;
      this.selectedReference = null;
    },
    setParam(key, value) {
      this.params[key] = value;
    },
    mockUpload() {
      if (this.inputImages.length >= this.maxImageCount) {
        uni.showToast({ title: `最多 ${this.maxImageCount} 张`, icon: 'none' });
        return;
      }
      const index = this.inputImages.length + 1;
      this.inputImages.push({
        id: `upload_${Date.now()}_${index}`,
        name: this.activeGroup === 'video' ? `分镜 ${index}` : `原图 ${index}`,
        status: 'success'
      });
    },
    clearInputs() {
      this.inputImages = [];
      this.inputResource = null;
    },
    useResourceAsInput(resource) {
      this.inputResource = resource;
      if (!this.inputImages.find((item) => item.id === resource.id)) {
        this.inputImages.unshift({
          id: resource.id,
          name: resource.name,
          status: 'resource'
        });
      }
      if (this.inputImages.length > this.maxImageCount) this.inputImages = this.inputImages.slice(0, this.maxImageCount);
    },
    applyIncomingResource(resource) {
      if (resource.resourceType === 'material') {
        this.selectFeature(this.features.find((item) => item.key === 'material_replace'));
        this.selectedReference = resource;
        return;
      }
      if (resource.resourceType === 'scene') {
        this.selectFeature(this.features.find((item) => item.key === 'scene_fusion'));
        this.selectedReference = resource;
        return;
      }
      this.useResourceAsInput(resource);
    },
    submitTask() {
      if (!this.inputImages.length) {
        uni.showToast({ title: '请先上传图片', icon: 'none' });
        return;
      }
      if (this.needsReference && !this.selectedReference) {
        uni.showToast({ title: '请选择参考', icon: 'none' });
        return;
      }
      createMockTask({
        title: this.inputImages[0].name,
        featureKey: this.selectedFeatureKey,
        originImage: this.inputImages[0],
        selectedResource: this.selectedReference,
        userPrompt: this.prompt,
        params: this.params
      });
      uni.showToast({ title: '已创建', icon: 'success' });
      setTimeout(() => {
        uni.switchTab({ url: '/pages/tasks/index' });
      }, 350);
    }
  }
};
</script>

<style>
.hero-card,
.panel {
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 10rpx 28rpx rgba(23, 32, 51, 0.05);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx;
}

.kicker {
  color: #1f6feb;
  font-size: 23rpx;
  font-weight: 800;
}

.title {
  margin-top: 8rpx;
  color: #172033;
  font-size: 38rpx;
  font-weight: 900;
}

.quota {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #edf3ff;
  color: #1f6feb;
  font-size: 24rpx;
  font-weight: 900;
}

.group-tabs {
  display: flex;
  gap: 12rpx;
  margin: 22rpx 0;
}

.group-tab {
  flex: 1;
  height: 64rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #526176;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  font-weight: 900;
}

.group-tab.active {
  background: #1f6feb;
  color: #fff;
}

.feature-scroll,
.resource-scroll {
  width: 100%;
  white-space: nowrap;
}

.feature-card {
  display: inline-block;
  width: 210rpx;
  min-height: 116rpx;
  margin-right: 14rpx;
  padding: 18rpx;
  border: 2rpx solid transparent;
  border-radius: 18rpx;
  background: #fff;
  vertical-align: top;
}

.feature-card.active {
  border-color: #1f6feb;
  background: #f2f7ff;
}

.feature-name {
  color: #172033;
  font-size: 28rpx;
  font-weight: 900;
}

.feature-use {
  margin-top: 10rpx;
  color: #748198;
  font-size: 22rpx;
  white-space: normal;
}

.panel {
  margin-top: 22rpx;
  padding: 24rpx;
}

.panel.compact {
  padding-bottom: 18rpx;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18rpx;
  color: #172033;
  font-size: 30rpx;
  font-weight: 900;
}

.count {
  color: #748198;
  font-size: 23rpx;
}

.upload-actions {
  display: flex;
  gap: 14rpx;
}

.action-btn {
  flex: 1;
}

.image-list {
  display: flex;
  gap: 14rpx;
  flex-wrap: wrap;
  margin-top: 18rpx;
}

.image-item {
  width: 150rpx;
}

.image-item text,
.resource-item text {
  display: block;
  margin-top: 8rpx;
  color: #526176;
  font-size: 22rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-thumb,
.mini-thumb {
  position: relative;
  overflow: hidden;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #e8eef8, #d8e5f7);
}

.image-thumb {
  height: 118rpx;
}

.mini-thumb {
  width: 96rpx;
  height: 76rpx;
  flex-shrink: 0;
}

.furniture-shape {
  position: absolute;
  left: 18rpx;
  right: 18rpx;
  bottom: 18rpx;
  height: 26rpx;
  border-radius: 999rpx 999rpx 10rpx 10rpx;
  background: rgba(82, 97, 118, 0.22);
}

.furniture-shape.small {
  left: 14rpx;
  right: 14rpx;
  bottom: 14rpx;
  height: 20rpx;
}

.resource-item {
  display: inline-block;
  width: 136rpx;
  margin-right: 14rpx;
  padding: 12rpx;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  background: #f7f9fd;
  vertical-align: top;
}

.resource-item.active,
.ref-row.active {
  border-color: #1f6feb;
  background: #f2f7ff;
}

.ref-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 16rpx;
  border: 2rpx solid #edf1f7;
}

.ref-name {
  color: #172033;
  font-size: 26rpx;
  font-weight: 900;
}

.param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
  color: #172033;
  font-size: 26rpx;
  font-weight: 900;
}

.pill-row {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pill-row text {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #edf1f7;
  color: #526176;
  font-size: 23rpx;
  font-weight: 800;
}

.pill-row text.active {
  background: #1f6feb;
  color: #fff;
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  margin-top: 12rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  background: #f5f7fb;
  color: #172033;
  font-size: 26rpx;
}

.textarea {
  min-height: 128rpx;
}

.submit-btn {
  margin-top: 28rpx;
}
</style>
