<template>
	<view class="page resources-page">
		<view class="page-head">
			<text class="page-title">资源库</text>
			<text class="page-subtitle">mock 图片和视频卡片，可作为生成页资源选择的前端雏形。</text>
		</view>

		<view class="resource-tabs">
			<text :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</text>
			<text :class="{ active: filter === 'image' }" @click="filter = 'image'">图片</text>
			<text :class="{ active: filter === 'video' }" @click="filter = 'video'">视频</text>
		</view>

		<view class="resource-grid">
			<view v-for="item in filteredItems" :key="item.id" class="resource-card">
				<view class="media" :class="item.type">
					<text class="media-type">{{ item.typeText }}</text>
					<text class="media-title">{{ item.title.slice(0, 4) }}</text>
				</view>
				<view class="resource-body">
					<text class="resource-tag">{{ item.tag }}</text>
					<text class="resource-title">{{ item.title }}</text>
					<text class="resource-desc">{{ item.desc }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { resourceItems } from '../../mock/data.js';

	export default {
		data() {
			return {
				filter: 'all',
				items: resourceItems
			}
		},
		computed: {
			filteredItems() {
				if (this.filter === 'all') return this.items;
				return this.items.filter(item => item.type === this.filter);
			}
		}
	}
</script>

<style>
	.page-title, .page-subtitle, .media-type, .media-title, .resource-tag, .resource-title, .resource-desc { display: block; }
	.page-title { font-size: 44rpx; font-weight: 900; color: #172033; }
	.page-subtitle { margin-top: 8rpx; font-size: 25rpx; line-height: 1.5; color: #748198; }
	.resource-tabs { margin-top: 24rpx; display: flex; gap: 12rpx; }
	.resource-tabs text { padding: 14rpx 26rpx; border-radius: 999rpx; background: #fff; color: #5e6a7f; font-size: 25rpx; font-weight: 800; }
	.resource-tabs text.active { background: #1f6feb; color: #fff; }
	.resource-grid { margin-top: 22rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 18rpx; }
	.resource-card { border-radius: 22rpx; overflow: hidden; background: #fff; box-shadow: 0 8rpx 26rpx rgba(18,31,54,.06); }
	.media { height: 176rpx; padding: 18rpx; box-sizing: border-box; color: #fff; display: flex; flex-direction: column; justify-content: space-between; }
	.media.image { background: linear-gradient(135deg,#1f6feb,#9bbcff); }
	.media.video { background: linear-gradient(135deg,#172033,#36c2a0); }
	.media-type { align-self: flex-start; padding: 6rpx 12rpx; border-radius: 999rpx; background: rgba(255,255,255,.18); font-size: 21rpx; font-weight: 800; }
	.media-title { font-size: 32rpx; font-weight: 900; }
	.resource-body { padding: 18rpx; }
	.resource-tag { font-size: 22rpx; font-weight: 800; color: #1f6feb; }
	.resource-title { margin-top: 8rpx; font-size: 27rpx; font-weight: 900; color: #172033; line-height: 1.35; }
	.resource-desc { margin-top: 8rpx; font-size: 23rpx; line-height: 1.45; color: #748198; }
</style>
