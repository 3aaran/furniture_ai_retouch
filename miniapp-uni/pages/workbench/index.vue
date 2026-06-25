<template>
  <view class="page workbench-page">
    <app-topbar
      title="勋港家具 AI"
      subtitle="智能家具修图平台"
      :quota="topbarQuota"
      :avatar-text="topbarAvatar"
      @profile="goMine"
    />

    <view class="mobile-rail">
      <view class="rail-card primary" @click="chooseInputImage">
        <text class="rail-icon">＋</text>
        <view>
          <text>上传图片</text>
          <b>{{ inputImages.length }}/{{ maxImageCount }}</b>
        </view>
      </view>
      <view class="rail-card" @click="focusResources">
        <text class="rail-icon">◎</text>
        <view>
          <text>资源库</text>
          <b>选择素材</b>
        </view>
      </view>
      <view class="rail-card" @click="goHistory">
        <text class="rail-icon">↻</text>
        <view>
          <text>最近生成</text>
          <b>{{ recentTasks.length }}</b>
        </view>
      </view>
    </view>

    <view class="workbench-stage">
      <view class="stage-head">
        <view>
          <text>当前功能</text>
          <b>{{ currentFeature.name }}</b>
        </view>
        <text class="cost-pill">{{ currentFeature.cost || 0 }} 算力</text>
      </view>

      <view class="upload-card" @click="chooseInputImage">
        <view v-if="!inputImages.length" class="upload-empty">
          <view class="upload-circle">＋</view>
          <b>上传家具图片</b>
          <text>最多 4 张，支持从资源库带入</text>
        </view>
        <view v-else class="thumb-strip">
          <view v-for="image in inputImages" :key="image.id" class="thumb-item">
            <image v-if="image.imageUrl || image.url" class="real-thumb" :src="image.imageUrl || image.url" mode="aspectFill" />
            <view v-else class="mock-thumb"><view class="furniture-shape"></view></view>
            <text>{{ image.name }}</text>
          </view>
        </view>
      </view>

      <view class="stage-actions">
        <button class="secondary-btn compact-btn" @click.stop="chooseInputImage">继续上传</button>
        <button class="secondary-btn compact-btn" @click.stop="clearInputs">清空图片</button>
      </view>
    </view>

    <view class="section-tabs">
      <text
        v-for="group in featureGroups"
        :key="group.key"
        :class="activeGroup === group.key ? 'active' : ''"
        @click="selectGroup(group.key)"
      >
        {{ group.name }}
      </text>
    </view>

    <view class="feature-grid">
      <view
        v-for="item in groupFeatures"
        :key="item.key"
        :class="['feature-card', selectedFeatureKey === item.key ? 'active' : '']"
        @click="selectFeature(item)"
      >
        <view class="feature-tag">{{ item.shortName }}</view>
        <view class="feature-name">{{ item.name }}</view>
        <view class="feature-scene">{{ item.scene }}</view>
      </view>
    </view>

    <view class="panel" v-if="sourceResources.length">
      <view class="panel-head" id="resource-anchor">
        <text>素材带入</text>
        <text>系统 / 门店 / 个人</text>
      </view>
      <scroll-view scroll-x class="resource-scroll">
        <view
          v-for="item in sourceResources"
          :key="item.id"
          :class="['resource-chip', inputResource && inputResource.id === item.id ? 'active' : '']"
          @click="useResourceAsInput(item)"
        >
          <image v-if="item.thumbUrl || item.imageUrl || item.url" class="chip-thumb real-chip-thumb" :src="item.thumbUrl || item.imageUrl || item.url" mode="aspectFill" />
          <view v-else class="chip-thumb"><view class="furniture-shape small"></view></view>
          <view>
            <b>{{ item.name }}</b>
            <text>{{ item.typeText }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="panel" v-if="selectedFeatureKey === 'material_replace'">
      <view class="panel-head">
        <text>材质参考</text>
        <text>必选或填写</text>
      </view>
      <view
        v-for="item in referenceResources"
        :key="item.id"
        :class="['ref-row', selectedReference && selectedReference.id === item.id ? 'active' : '']"
        @click="selectedReference = item"
      >
        <view>
          <view class="ref-name">{{ item.name }}</view>
          <view class="muted">{{ item.subCategoryName }}</view>
        </view>
        <text>{{ item.typeText }}</text>
      </view>
    </view>

    <view class="panel">
      <view class="panel-head">
        <text>生成参数</text>
        <text>{{ currentFeature.shortName }}</text>
      </view>
      <view class="param-row" v-for="row in paramRows" :key="row.key">
        <text>{{ row.label }}</text>
        <view class="pill-row">
          <text
            v-for="item in row.items"
            :key="item"
            :class="params[row.key] === item ? 'active' : ''"
            @click="setParam(row.key, item)"
          >
            {{ item }}
          </text>
        </view>
      </view>
      <input v-if="selectedFeatureKey === 'material_replace'" class="input" v-model="params.materialName" placeholder="填写材质要求，例如深胡桃木、米白布艺" />
      <input v-if="selectedFeatureKey === 'scene_fusion'" class="input" v-model="params.sceneType" placeholder="填写场景，例如客厅、展厅、卧室" />
      <textarea class="textarea" v-model="prompt" placeholder="补充要求，如保留扶手结构、右侧留白、不要文字" />
    </view>

    <view class="recent-panel" v-if="recentTasks.length">
      <view class="panel-head">
        <text>最近生成</text>
        <text @click="goHistory">查看更多</text>
      </view>
      <view class="recent-row" v-for="task in recentTasks.slice(0, 3)" :key="task.id">
        <view class="recent-thumb"><view class="furniture-shape small"></view></view>
        <view>
          <b>{{ task.featureName }}</b>
          <text>{{ task.createdAt }}</text>
        </view>
        <text :class="['status-mini', task.status]">{{ task.statusText }}</text>
      </view>
    </view>

    <button class="primary-btn submit-btn" @click="submitTask">提交生成</button>
  </view>
</template>

<script>
import {
  consumeWorkbenchResource,
  createMockTask,
  getFeatureGroups,
  getFeatureTypes,
  getMockUser,
  getMockResources,
  getMockTasks
} from '../../utils/mockStore.js';
import AppTopbar from '../../components/app-topbar/app-topbar.vue';
import { useMockApi } from '../../utils/request.js';
import { uploadImage } from '../../api/upload.js';
import { createAiTask } from '../../api/task.js';
import { getResources } from '../../api/resource.js';

const FEATURE_KEY = 'miniapp_pending_feature_key';

export default {
  components: {
    AppTopbar
  },
  data() {
    return {
      features: [],
      featureGroups: [],
      activeGroup: 'base',
      resources: [],
      tasks: [],
      user: getMockUser(),
      useMock: true,
      uploadBusy: false,
      submitBusy: false,
      selectedFeatureKey: 'material_replace',
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
        sceneType: '',
        composition: '主体居中',
        enhanceFocus: '质感',
        angle: '不变',
        detailLevel: '标准',
        viewMode: '四角度视图',
        mainBackground: '暖灰渐变',
        mainComposition: '主体居中',
        mainWhitespace: '少量留白',
        posterTextMode: '自动短文案',
        posterTone: '温暖家居',
        detailLayout: '四宫格',
        detailFocus: '材质纹理',
        duration: '10秒',
        ratio: '9:16',
        quality: '高清'
      }
    };
  },
  computed: {
    currentFeature() {
      return this.features.find((item) => item.key === this.selectedFeatureKey) || {};
    },
    groupFeatures() {
      return this.features.filter((item) => item.group === this.activeGroup);
    },
    maxImageCount() {
      return 4;
    },
    sourceResources() {
      return this.resources.filter((item) => ['original', 'generated', 'personal', 'merchant', 'system'].indexOf(item.type) >= 0);
    },
    referenceResources() {
      return this.resources.filter((item) => item.resourceType === 'material');
    },
    recentTasks() {
      return this.tasks;
    },
    topbarQuota() {
      return this.user && this.user.quota !== undefined ? this.user.quota : '';
    },
    topbarAvatar() {
      const name = this.user.displayName || this.user.username || this.user.phone || '用';
      return String(name).slice(0, 1);
    },
    paramRows() {
      const map = {
        background_clean: [
          { label: '背景', key: 'cleanBg', items: ['白底', '浅灰', '透明'] },
          { label: '阴影', key: 'shadow', items: ['柔和', '保留', '无'] }
        ],
        material_replace: [
          { label: '保留', key: 'keep', items: ['严格', '优化'] },
          { label: '清晰度', key: 'quality', items: ['标准', '高清', '超清'] }
        ],
        scene_fusion: [
          { label: '风格', key: 'sceneMood', items: ['现代', '温馨', '高级'] },
          { label: '构图', key: 'composition', items: ['主体居中', '左侧留白', '右侧留白'] }
        ],
        photo_enhance: [
          { label: '重点', key: 'enhanceFocus', items: ['质感', '光影', '清晰'] },
          { label: '角度', key: 'angle', items: ['不变', '正面', '45度'] }
        ],
        line_drawing: [
          { label: '线稿', key: 'detailLevel', items: ['标准', '精细'] }
        ],
        multi_view: [
          { label: '视图', key: 'viewMode', items: ['三角度视图', '四角度视图'] }
        ],
        promo_main_image: [
          { label: '背景', key: 'mainBackground', items: ['暖灰渐变', '米白空间', '极简背景'] },
          { label: '构图', key: 'mainComposition', items: ['主体居中', '左侧留白', '右侧留白'] },
          { label: '留白', key: 'mainWhitespace', items: ['少量留白', '顶部留白', '侧边留白'] }
        ],
        promo_poster_image: [
          { label: '文字', key: 'posterTextMode', items: ['自动短文案', '自定义', '不生成'] },
          { label: '氛围', key: 'posterTone', items: ['温暖家居', '现代简约', '高级质感'] }
        ],
        promo_detail_image: [
          { label: '排版', key: 'detailLayout', items: ['四宫格', '三宫格', '拼合排版'] },
          { label: '重点', key: 'detailFocus', items: ['材质纹理', '结构连接', '工艺细节'] }
        ],
        video_generate: [
          { label: '时长', key: 'duration', items: ['6秒', '10秒', '15秒'] },
          { label: '比例', key: 'ratio', items: ['9:16', '1:1', '16:9'] },
          { label: '质量', key: 'quality', items: ['标准', '高清'] }
        ]
      };
      return map[this.selectedFeatureKey] || map.material_replace;
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
      this.useMock = useMockApi();
      this.features = getFeatureTypes();
      this.featureGroups = getFeatureGroups();
      this.tasks = getMockTasks();
      if (this.useMock) {
        this.resources = getMockResources();
      } else {
        this.loadRealResources();
      }
      if (!this.groupFeatures.length && this.featureGroups.length) this.activeGroup = this.featureGroups[0].key;
    },
    async loadRealResources() {
      try {
        const data = await getResources({ pageSize: 50 }, { showLoading: false, showErrorToast: false });
        const items = Array.isArray(data?.items) ? data.items : [];
        this.resources = items.map((item) => ({
          ...item,
          type: item.scope === 'SYSTEM' ? 'system' : item.scope === 'MERCHANT' ? 'merchant' : 'personal',
          typeText: item.scope === 'SYSTEM' ? '系统素材' : item.scope === 'MERCHANT' ? '门店素材' : '个人素材',
          thumbText: item.name || '素材',
          imageId: item.id
        }));
      } catch (error) {
        this.resources = getMockResources();
        uni.showToast({ title: error.message || '资源读取失败，已显示 mock 素材', icon: 'none' });
      }
    },
    selectGroup(key) {
      this.activeGroup = key;
      const first = this.features.find((item) => item.group === key);
      if (first) this.selectFeature(first);
    },
    selectFeature(item) {
      if (!item) return;
      this.selectedFeatureKey = item.key;
      this.activeGroup = item.group || this.activeGroup;
      this.selectedReference = null;
    },
    setParam(key, value) {
      this.params[key] = value;
    },
    focusResources() {
      uni.showToast({ title: '可从下方素材带入', icon: 'none' });
    },
    chooseInputImage() {
      if (this.useMock) {
        this.mockUpload();
        return;
      }
      if (this.uploadBusy) return;
      const remain = this.maxImageCount - this.inputImages.length;
      if (remain <= 0) {
        uni.showToast({ title: `最多 ${this.maxImageCount} 张`, icon: 'none' });
        return;
      }
      uni.chooseImage({
        count: remain,
        sizeType: ['compressed', 'original'],
        sourceType: ['album', 'camera'],
        success: async (result) => {
          const paths = result.tempFilePaths || [];
          if (!paths.length) return;
          this.uploadBusy = true;
          try {
            for (let index = 0; index < paths.length; index += 1) {
              const uploaded = await uploadImage(paths[index], {});
              this.inputImages.push({
                id: uploaded.id,
                name: uploaded.originalName || uploaded.fileName || `家具原图 ${this.inputImages.length + 1}`,
                imageUrl: uploaded.thumbUrl || uploaded.url,
                url: uploaded.url,
                status: 'success',
                source: 'upload'
              });
            }
            uni.showToast({ title: '图片已上传', icon: 'success' });
          } catch (error) {
            uni.showToast({ title: error.message || '上传失败', icon: 'none' });
          } finally {
            this.uploadBusy = false;
          }
        }
      });
    },
    mockUpload() {
      if (this.inputImages.length >= this.maxImageCount) {
        uni.showToast({ title: `最多 ${this.maxImageCount} 张`, icon: 'none' });
        return;
      }
      const index = this.inputImages.length + 1;
      this.inputImages.push({
        id: `upload_${Date.now()}_${index}`,
        name: `家具原图 ${index}`,
        thumbText: `原图${index}`,
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
          id: resource.imageId || resource.id,
          name: resource.name,
          thumbText: resource.thumbText,
          status: 'resource',
          resourceId: resource.id,
          imageUrl: resource.thumbUrl || resource.imageUrl || resource.url,
          url: resource.imageUrl || resource.url
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
      this.useResourceAsInput(resource);
    },
    validateTask() {
      if (!this.inputImages.length) return '请先上传或选择家具图片';
      if (!this.selectedFeatureKey) return '请选择处理功能';
      if (this.selectedFeatureKey === 'material_replace' && !this.selectedReference && !String(this.params.materialName || '').trim()) {
        return '请选择材质参考或填写材质要求';
      }
      if (this.selectedFeatureKey === 'scene_fusion' && !String(this.params.sceneType || '').trim()) {
        return '请填写场景类型';
      }
      return '';
    },
    submitTask() {
      if (this.useMock) {
        this.submitMockTask();
      } else {
        this.submitRealTask();
      }
    },
    submitMockTask() {
      const message = this.validateTask();
      if (message) {
        uni.showToast({ title: message, icon: 'none' });
        return;
      }
      // 后续替换真实接口：这里调用上传图片接口和创建 AI 任务接口。
      createMockTask({
        title: this.inputImages[0].name,
        featureKey: this.selectedFeatureKey,
        inputImages: this.inputImages,
        selectedResource: this.selectedReference,
        userPrompt: this.prompt,
        params: this.params
      });
      uni.showToast({ title: '已创建任务', icon: 'success' });
      setTimeout(() => {
        uni.switchTab({ url: '/pages/tasks/index' });
      }, 350);
    },
    async submitRealTask() {
      const message = this.validateTask();
      if (message) {
        uni.showToast({ title: message, icon: 'none' });
        return;
      }
      if (this.selectedFeatureKey === 'video_generate') {
        uni.showToast({ title: '宣传视频真实接口后续接入', icon: 'none' });
        return;
      }
      if (this.submitBusy) return;
      const featureKey = this.currentFeature.apiFeatureKey || this.selectedFeatureKey;
      const origin = this.inputImages[0];
      const reference = this.selectedReference;
      const payload = {
        originImageId: origin.id,
        featureKey,
        selectedResourceId: reference?.id || null,
        selectedResourceSnapshot: reference ? {
          id: reference.id,
          imageId: reference.imageId || reference.id,
          name: reference.name,
          resourceType: reference.resourceType,
          mainCategoryName: reference.mainCategoryName || reference.objectName || '',
          subCategoryName: reference.subCategoryName || reference.colorName || '',
          imageUrl: reference.imageUrl || reference.url || ''
        } : null,
        functionalReferenceImageId: null,
        templatePrompt: reference ? (reference.description || reference.name) : '',
        userPrompt: [this.params.materialName, this.params.sceneType, this.prompt].filter(Boolean).join('；'),
        userReferenceImageIds: reference ? [reference.imageId || reference.id] : [],
        referenceImageIds: reference ? [reference.imageId || reference.id] : [],
        resolution: this.params.quality === '超清' ? '4K' : this.params.quality === '标准' ? '1K' : '2K',
        ratio: this.params.ratio || '自适应',
        options: this.buildRealOptions()
      };
      this.submitBusy = true;
      try {
        // 后续若后端字段扩展，只需要调整这里的 payload 映射。
        await createAiTask(payload);
        uni.showToast({ title: '已提交生成', icon: 'success' });
        setTimeout(() => {
          uni.switchTab({ url: '/pages/tasks/index' });
        }, 350);
      } catch (error) {
        uni.showToast({ title: error.message || '任务提交失败', icon: 'none' });
      } finally {
        this.submitBusy = false;
      }
    },
    buildRealOptions() {
      const p = this.params;
      if (this.selectedFeatureKey === 'background_clean') return { whiteBg: p.cleanBg === '白底', shadow: p.shadow };
      if (this.selectedFeatureKey === 'scene_fusion') return { sceneType: p.sceneType, mood: p.sceneMood, composition: p.composition };
      if (this.selectedFeatureKey === 'photo_enhance') return { focus: p.enhanceFocus === '质感', angle: p.angle };
      if (this.selectedFeatureKey === 'multi_view') return { view: p.viewMode, viewCount: p.viewMode === '三角度视图' ? 3 : 4 };
      return { ...p };
    },
    goHistory() {
      uni.switchTab({ url: '/pages/tasks/index' });
    },
    goMine() {
      uni.switchTab({ url: '/pages/mine/index' });
    }
  }
};
</script>

<style>
.workbench-page {
  padding-top: 18rpx;
}

.mobile-rail {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
  padding: 0 0 8rpx;
  background: #07090c;
}

.rail-card {
  flex: 1;
  min-width: 0;
  min-height: 92rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 14rpx;
  border: 1rpx solid rgba(240, 214, 138, 0.42);
  border-radius: 18rpx;
  background: rgba(240, 214, 138, 0.06);
  color: #f0d68a;
}

.rail-card.primary {
  background: linear-gradient(135deg, rgba(240, 214, 138, 0.18), rgba(18, 20, 22, 0.96));
}

.rail-icon {
  flex: 0 0 34rpx;
  width: 34rpx;
  height: 34rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f0d68a;
  font-size: 26rpx;
  font-weight: 900;
}

.rail-card text,
.rail-card b {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-card view text {
  color: rgba(240, 214, 138, 0.72);
  font-size: 21rpx;
  font-weight: 800;
}

.rail-card b {
  margin-top: 5rpx;
  color: #f8e5a8;
  font-size: 25rpx;
  line-height: 1.1;
}

.workbench-stage,
.panel,
.recent-panel {
  border: 1rpx solid rgba(242, 213, 140, 0.12);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 24rpx 70rpx rgba(0, 0, 0, 0.32);
}

.workbench-stage {
  padding: 20rpx;
}

.stage-head,
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.stage-head view text,
.panel-head text:last-child {
  display: block;
  color: rgba(255, 244, 223, 0.58);
  font-size: 23rpx;
  font-weight: 800;
}

.stage-head b {
  display: block;
  margin-top: 5rpx;
  color: #fff5dc;
  font-size: 34rpx;
  line-height: 1.15;
  font-weight: 900;
}

.cost-pill {
  flex: 0 0 auto;
  padding: 9rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(242, 213, 140, 0.13);
  color: #f0d68a;
  font-size: 23rpx;
  font-weight: 900;
}

.upload-card {
  margin-top: 18rpx;
  min-height: 260rpx;
  border: 1rpx dashed rgba(242, 213, 140, 0.22);
  border-radius: 24rpx;
  background: radial-gradient(circle at 70% -20%, rgba(242, 213, 140, 0.13), transparent 45%), rgba(8, 10, 13, 0.8);
  overflow: hidden;
}

.upload-empty {
  min-height: 260rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.upload-circle {
  width: 82rpx;
  height: 82rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f3da94, #c79b3b);
  color: #181207;
  font-size: 44rpx;
  font-weight: 900;
}

.upload-empty b {
  margin-top: 16rpx;
  color: #fff5dc;
  font-size: 31rpx;
}

.upload-empty text {
  margin-top: 8rpx;
  color: rgba(255, 244, 223, 0.56);
  font-size: 24rpx;
}

.thumb-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  padding: 16rpx;
}

.thumb-item {
  width: calc(50% - 7rpx);
}

.thumb-item text {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 244, 223, 0.64);
  font-size: 22rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mock-thumb,
.real-thumb,
.chip-thumb,
.recent-thumb {
  position: relative;
  overflow: hidden;
  border: 1rpx solid rgba(242, 213, 140, 0.14);
  border-radius: 18rpx;
  background: linear-gradient(135deg, #202731, #11161d);
}

.mock-thumb {
  height: 152rpx;
}

.real-thumb {
  width: 100%;
  height: 152rpx;
  display: block;
}

.furniture-shape {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  height: 34rpx;
  border-radius: 999rpx 999rpx 12rpx 12rpx;
  background: rgba(242, 213, 140, 0.26);
}

.furniture-shape.small {
  left: 12rpx;
  right: 12rpx;
  bottom: 13rpx;
  height: 18rpx;
}

.stage-actions {
  display: flex;
  gap: 14rpx;
  margin-top: 16rpx;
}

.compact-btn {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
}

.section-tabs {
  display: flex;
  gap: 12rpx;
  margin: 22rpx 0 16rpx;
}

.section-tabs text {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.035);
  color: #cfc8b8;
  font-size: 25rpx;
  font-weight: 900;
}

.section-tabs text.active {
  border-color: transparent;
  background: linear-gradient(135deg, #f3da94, #c79b3b);
  color: #181207;
}

.feature-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.feature-card {
  width: calc(50% - 7rpx);
  min-height: 146rpx;
  box-sizing: border-box;
  padding: 17rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.045);
}

.feature-card.active {
  border-color: rgba(242, 213, 140, 0.5);
  background: rgba(242, 213, 140, 0.1);
}

.feature-tag {
  display: inline-flex;
  max-width: 100%;
  padding: 5rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(242, 213, 140, 0.12);
  color: #f0d68a;
  font-size: 20rpx;
  font-weight: 900;
}

.feature-name {
  margin-top: 10rpx;
  color: #fff5dc;
  font-size: 29rpx;
  line-height: 1.15;
  font-weight: 900;
}

.feature-scene {
  margin-top: 10rpx;
  color: rgba(255, 244, 223, 0.58);
  font-size: 22rpx;
  line-height: 1.35;
}

.panel,
.recent-panel {
  margin-top: 20rpx;
  padding: 20rpx;
}

.panel-head {
  margin-bottom: 16rpx;
  color: #fff5dc;
  font-size: 29rpx;
  font-weight: 900;
}

.resource-scroll {
  width: 100%;
  white-space: nowrap;
}

.resource-chip {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  width: 300rpx;
  margin-right: 12rpx;
  padding: 12rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.035);
  color: #f5f0e6;
  vertical-align: top;
}

.resource-chip.active,
.ref-row.active {
  border-color: rgba(242, 213, 140, 0.5);
  background: rgba(242, 213, 140, 0.1);
}

.chip-thumb {
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
}

.real-chip-thumb {
  display: block;
}

.resource-chip b,
.resource-chip text {
  display: block;
  max-width: 198rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-chip b {
  color: #fff5dc;
  font-size: 24rpx;
}

.resource-chip text {
  margin-top: 4rpx;
  color: rgba(255, 244, 223, 0.54);
  font-size: 21rpx;
}

.ref-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 12rpx;
  padding: 16rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  color: rgba(255, 244, 223, 0.62);
}

.ref-name {
  color: #fff5dc;
  font-size: 26rpx;
  font-weight: 900;
}

.param-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
  color: #fff5dc;
  font-size: 26rpx;
  font-weight: 900;
}

.param-row > text {
  flex: 0 0 112rpx;
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8rpx;
}

.pill-row text {
  padding: 9rpx 15rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.07);
  color: #cfc8b8;
  font-size: 23rpx;
  font-weight: 800;
}

.pill-row text.active {
  background: #f0d68a;
  color: #181207;
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  margin-top: 12rpx;
  padding: 18rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.2);
  color: #f5f0e6;
  font-size: 26rpx;
}

.textarea {
  min-height: 132rpx;
}

.recent-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 0;
  border-top: 1rpx solid rgba(255, 255, 255, 0.08);
}

.recent-thumb {
  width: 70rpx;
  height: 70rpx;
  flex: 0 0 70rpx;
}

.recent-row view:nth-child(2) {
  flex: 1;
  min-width: 0;
}

.recent-row b,
.recent-row view:nth-child(2) text {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-row b {
  color: #fff5dc;
  font-size: 25rpx;
}

.recent-row view:nth-child(2) text {
  margin-top: 4rpx;
  color: rgba(255, 244, 223, 0.5);
  font-size: 21rpx;
}

.status-mini {
  flex: 0 0 auto;
  padding: 7rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(242, 213, 140, 0.12);
  color: #f0d68a;
  font-size: 21rpx;
  font-weight: 900;
}

.status-mini.succeeded {
  background: rgba(30, 125, 75, 0.32);
  color: #9af0b5;
}

.status-mini.failed {
  background: rgba(150, 55, 55, 0.36);
  color: #ffb2b2;
}

.submit-btn {
  margin-top: 24rpx;
  margin-bottom: 10rpx;
}
</style>
