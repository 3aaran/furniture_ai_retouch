<template>
	<view class="page home-page">
		<view class="hero">
			<view>
				<text class="hero-title">家具 AI 创作台</text>
				<text class="hero-subtitle">用 mock 流程预览小程序第一阶段体验。</text>
			</view>
			<view class="hero-mark">AI</view>
		</view>

		<view class="quick-panel">
			<view>
				<text class="quick-label">今日可用额度</text>
				<text class="quick-value">860</text>
			</view>
			<button class="quick-btn" @click="goGenerate('main')">立即生成</button>
		</view>

		<view class="section-title">
			<text>创作入口</text>
			<text class="muted">4 个 mock 入口</text>
		</view>

		<view class="entry-grid">
			<view v-for="item in entries" :key="item.key" class="entry-card" :class="'entry-' + item.key" @click="goGenerate(item.key)">
				<view class="entry-visual"><text>{{ item.title.slice(0, 2) }}</text></view>
				<text class="entry-title">{{ item.title }}</text>
				<text class="entry-desc">{{ item.desc }}</text>
				<text class="entry-action">{{ item.action }}</text>
			</view>
		</view>

		<view class="section-title"><text>第一阶段范围</text></view>
		<view class="scope-card">
			<view class="scope-row"><text>前端页面</text><text>已使用 mock 数据</text></view>
			<view class="scope-row"><text>上传流程</text><text>仅模拟状态</text></view>
			<view class="scope-row"><text>后端接口</text><text>暂不接入</text></view>
		</view>
	</view>
</template>

<script>
	import { homeEntries } from '../../mock/data.js';

	export default {
		data() {
			return { entries: homeEntries }
		},
		methods: {
			goGenerate(key) {
				const typeMap = { retouch: 'main', main: 'main', poster: 'poster', video: 'video' };
				uni.setStorageSync('mock_generate_type', typeMap[key] || 'main');
				uni.switchTab({ url: '/pages/generate/generate' });
			}
		}
	}
</script>

<style>
	.home-page { padding-bottom: 44rpx; }

	.hero {
		min-height: 260rpx;
		border-radius: 28rpx;
		padding: 34rpx;
		background: linear-gradient(135deg, #14213d 0%, #1f6feb 58%, #36c2a0 100%);
		color: #fff;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 18rpx 44rpx rgba(31, 111, 235, .22);
	}

	.hero-title, .hero-subtitle, .quick-label, .quick-value, .entry-title, .entry-desc, .entry-action { display: block; }

	.hero-title { font-size: 48rpx; font-weight: 900; line-height: 1.18; }
	.hero-subtitle { margin-top: 18rpx; width: 420rpx; font-size: 26rpx; line-height: 1.55; color: rgba(255,255,255,.82); }

	.hero-mark {
		width: 116rpx;
		height: 116rpx;
		border-radius: 26rpx;
		background: rgba(255,255,255,.16);
		border: 1rpx solid rgba(255,255,255,.32);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 38rpx;
		font-weight: 900;
	}

	.quick-panel {
		margin: -34rpx 24rpx 0;
		padding: 26rpx;
		border-radius: 22rpx;
		background: #fff;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-shadow: 0 14rpx 36rpx rgba(18,31,54,.08);
	}

	.quick-label { font-size: 24rpx; color: #748198; }
	.quick-value { margin-top: 6rpx; font-size: 44rpx; font-weight: 900; color: #172033; }

	.quick-btn {
		width: 188rpx;
		height: 72rpx;
		border-radius: 999rpx;
		background: #172033;
		color: #fff;
		font-size: 26rpx;
		font-weight: 800;
	}

	.entry-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18rpx;
	}

	.entry-card {
		min-height: 286rpx;
		padding: 22rpx;
		border-radius: 22rpx;
		background: #fff;
		box-shadow: 0 8rpx 26rpx rgba(18,31,54,.06);
	}

	.entry-visual {
		width: 84rpx;
		height: 84rpx;
		border-radius: 22rpx;
		background: #eef4ff;
		color: #1f6feb;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
		font-size: 26rpx;
	}

	.entry-poster .entry-visual { background: #fff3df; color: #bb6400; }
	.entry-video .entry-visual { background: #e8fbf5; color: #168567; }
	.entry-retouch .entry-visual { background: #f1ecff; color: #6a48c9; }
	.entry-title { margin-top: 20rpx; font-size: 30rpx; font-weight: 900; color: #172033; }
	.entry-desc { margin-top: 10rpx; min-height: 72rpx; font-size: 23rpx; line-height: 1.55; color: #748198; }
	.entry-action { margin-top: 14rpx; font-size: 24rpx; font-weight: 800; color: #1f6feb; }

	.scope-card { border-radius: 22rpx; background: #fff; overflow: hidden; }
	.scope-row {
		height: 86rpx;
		padding: 0 24rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1rpx solid #edf1f7;
		font-size: 26rpx;
		color: #172033;
	}
	.scope-row:last-child { border-bottom: 0; }
	.scope-row text:last-child { color: #748198; }
</style>
