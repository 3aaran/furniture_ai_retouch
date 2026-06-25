<template>
	<view class="page generate-page">
		<view class="top-card">
			<text class="top-title">选择生成类型</text>
			<text class="top-desc">第一阶段仅使用 mock 上传与 mock 任务状态，不调用真实接口。</text>
		</view>

		<view class="type-list">
			<view v-for="item in types" :key="item.key" class="type-card" :class="{ active: currentType === item.key }" @click="currentType = item.key">
				<view>
					<text class="type-title">{{ item.title }}</text>
					<text class="type-desc">{{ item.desc }}</text>
				</view>
				<text class="type-cost">{{ item.cost }} 额度</text>
			</view>
		</view>

		<view class="section-title"><text>上传素材</text><text class="muted">{{ uploadStatusText }}</text></view>
		<view class="upload-box" @click="mockChooseImage">
			<view class="upload-preview" :class="{ done: uploadStatus === 'success' }"><text>{{ uploadStatus === 'success' ? '已选' : '上传' }}</text></view>
			<view class="upload-info">
				<text class="upload-title">{{ uploadFileName }}</text>
				<text class="upload-desc">点击模拟选择家具图片，不会访问相册或上传后端。</text>
			</view>
		</view>

		<view class="form-card">
			<view class="field">
				<text>画面比例</text>
				<view class="segmented">
					<text v-for="item in ratios" :key="item" :class="{ selected: ratio === item }" @click="ratio = item">{{ item }}</text>
				</view>
			</view>
			<view class="field">
				<text>补充要求</text>
				<textarea v-model="prompt" maxlength="120" placeholder="例如：保留沙发靠枕，背景更明亮。" />
			</view>
		</view>

		<button class="primary-btn submit-btn" @click="mockSubmit">{{ submitText }}</button>
	</view>
</template>

<script>
	import { generationTypes } from '../../mock/data.js';

	export default {
		data() {
			return {
				types: generationTypes,
				currentType: 'main',
				uploadStatus: 'idle',
				uploadFileName: '选择一张家具原图',
				ratio: '自适应',
				ratios: ['自适应', '1:1', '4:3', '16:9'],
				prompt: ''
			}
		},
		computed: {
			uploadStatusText() {
				return { idle: '未选择', uploading: '模拟上传中', success: '模拟上传成功' }[this.uploadStatus] || '未选择';
			},
			submitText() {
				return this.uploadStatus === 'uploading' ? '素材处理中' : '提交 mock 任务';
			}
		},
		onLoad(query) {
			if (query.type && this.types.some(item => item.key === query.type)) this.currentType = query.type;
		},
		onShow() {
			const cachedType = uni.getStorageSync('mock_generate_type');
			if (cachedType && this.types.some(item => item.key === cachedType)) {
				this.currentType = cachedType;
				uni.removeStorageSync('mock_generate_type');
			}
		},
		methods: {
			mockChooseImage() {
				if (this.uploadStatus === 'uploading') return;
				this.uploadStatus = 'uploading';
				this.uploadFileName = 'mock-furniture-source.jpg';
				setTimeout(() => { this.uploadStatus = 'success'; }, 700);
			},
			mockSubmit() {
				if (this.uploadStatus !== 'success') {
					uni.showToast({ title: '请先模拟上传素材', icon: 'none' });
					return;
				}
				uni.showToast({ title: 'mock 任务已提交', icon: 'success' });
				setTimeout(() => { uni.switchTab({ url: '/pages/tasks/tasks' }); }, 500);
			}
		}
	}
</script>

<style>
	.generate-page { padding-bottom: 48rpx; }
	.top-card { padding: 34rpx; border-radius: 28rpx; background: #172033; color: #fff; }
	.top-title, .top-desc, .type-title, .type-desc, .type-cost, .upload-title, .upload-desc, .field > text { display: block; }
	.top-title { font-size: 42rpx; font-weight: 900; }
	.top-desc { margin-top: 14rpx; font-size: 25rpx; line-height: 1.55; color: rgba(255,255,255,.76); }
	.type-list { margin-top: 22rpx; display: grid; gap: 16rpx; }
	.type-card { padding: 24rpx; border-radius: 22rpx; background: #fff; border: 2rpx solid transparent; display: flex; justify-content: space-between; align-items: center; }
	.type-card.active { border-color: #1f6feb; background: #eef5ff; }
	.type-title { font-size: 30rpx; font-weight: 900; color: #172033; }
	.type-desc { margin-top: 8rpx; max-width: 430rpx; font-size: 24rpx; line-height: 1.45; color: #748198; }
	.type-cost { padding: 10rpx 14rpx; border-radius: 999rpx; background: #fff; color: #1f6feb; font-size: 23rpx; font-weight: 800; }
	.upload-box { padding: 24rpx; border-radius: 22rpx; background: #fff; display: flex; align-items: center; gap: 22rpx; }
	.upload-preview { width: 138rpx; height: 138rpx; border-radius: 22rpx; background: linear-gradient(135deg,#eaf1ff,#f5f8ff); border: 2rpx dashed #b9c9e8; display: flex; align-items: center; justify-content: center; color: #1f6feb; font-size: 28rpx; font-weight: 900; }
	.upload-preview.done { background: linear-gradient(135deg,#e8fbf5,#f4fffb); border-color: #36c2a0; color: #168567; }
	.upload-info { flex: 1; }
	.upload-title { font-size: 30rpx; font-weight: 900; color: #172033; }
	.upload-desc { margin-top: 10rpx; font-size: 24rpx; line-height: 1.5; color: #748198; }
	.form-card { margin-top: 22rpx; padding: 24rpx; border-radius: 22rpx; background: #fff; }
	.field { margin-bottom: 28rpx; }
	.field:last-child { margin-bottom: 0; }
	.field > text { margin-bottom: 14rpx; font-size: 26rpx; font-weight: 800; color: #172033; }
	.segmented { display: flex; gap: 12rpx; flex-wrap: wrap; }
	.segmented text { padding: 14rpx 20rpx; border-radius: 999rpx; background: #f1f4f8; color: #5e6a7f; font-size: 24rpx; font-weight: 700; }
	.segmented text.selected { background: #1f6feb; color: #fff; }
	textarea { width: 100%; min-height: 150rpx; box-sizing: border-box; border-radius: 16rpx; padding: 18rpx; background: #f6f8fc; font-size: 26rpx; color: #172033; }
	.submit-btn { margin-top: 28rpx; }
</style>
