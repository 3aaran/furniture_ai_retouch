<template>
	<view class="page tasks-page">
		<view class="page-head">
			<text class="page-title">任务</text>
			<text class="page-subtitle">展示等待中、生成中、成功、失败四类 mock 任务。</text>
		</view>

		<view class="status-tabs">
			<text v-for="item in filters" :key="item.key" :class="{ active: filter === item.key }" @click="filter = item.key">{{ item.label }}</text>
		</view>

		<view class="task-list">
			<view v-for="item in filteredTasks" :key="item.id" class="task-card">
				<view class="task-cover" :class="'cover-' + item.status"><text>{{ item.coverText }}</text></view>
				<view class="task-body">
					<view class="task-line">
						<text class="task-title">{{ item.title }}</text>
						<text class="task-status" :class="'status-' + item.status">{{ item.statusText }}</text>
					</view>
					<text class="task-meta">{{ item.type }} · {{ item.time }}</text>
					<view class="progress"><view :style="{ width: item.progress + '%' }" :class="'bar-' + item.status"></view></view>
					<text class="task-id">编号 {{ item.id }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { mockTasks } from '../../mock/data.js';

	export default {
		data() {
			return {
				filter: 'all',
				tasks: mockTasks,
				filters: [
					{ key: 'all', label: '全部' },
					{ key: 'waiting', label: '等待中' },
					{ key: 'running', label: '生成中' },
					{ key: 'success', label: '成功' },
					{ key: 'failed', label: '失败' }
				]
			}
		},
		computed: {
			filteredTasks() {
				if (this.filter === 'all') return this.tasks;
				return this.tasks.filter(item => item.status === this.filter);
			}
		}
	}
</script>

<style>
	.page-head { margin-bottom: 22rpx; }
	.page-title, .page-subtitle, .task-title, .task-meta, .task-id { display: block; }
	.page-title { font-size: 44rpx; font-weight: 900; color: #172033; }
	.page-subtitle { margin-top: 8rpx; font-size: 25rpx; line-height: 1.5; color: #748198; }
	.status-tabs { display: flex; gap: 12rpx; overflow-x: auto; padding-bottom: 10rpx; }
	.status-tabs text { flex: 0 0 auto; padding: 14rpx 22rpx; border-radius: 999rpx; background: #fff; color: #5e6a7f; font-size: 25rpx; font-weight: 800; }
	.status-tabs text.active { background: #172033; color: #fff; }
	.task-list { margin-top: 18rpx; display: grid; gap: 18rpx; }
	.task-card { padding: 20rpx; border-radius: 22rpx; background: #fff; display: flex; gap: 20rpx; }
	.task-cover { width: 154rpx; height: 154rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; text-align: center; color: #fff; font-size: 24rpx; font-weight: 900; }
	.cover-waiting { background: linear-gradient(135deg,#8b97a8,#c3cad6); }
	.cover-running { background: linear-gradient(135deg,#1f6feb,#36c2a0); }
	.cover-success { background: linear-gradient(135deg,#168567,#7ed9bd); }
	.cover-failed { background: linear-gradient(135deg,#c2413b,#f3a09d); }
	.task-body { flex: 1; min-width: 0; }
	.task-line { display: flex; align-items: flex-start; justify-content: space-between; gap: 12rpx; }
	.task-title { flex: 1; font-size: 29rpx; font-weight: 900; color: #172033; line-height: 1.35; }
	.task-status { flex: 0 0 auto; padding: 7rpx 12rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 800; }
	.status-waiting { background: #eef1f5; color: #667084; }
	.status-running { background: #eaf1ff; color: #1f6feb; }
	.status-success { background: #e8fbf5; color: #168567; }
	.status-failed { background: #fff0ef; color: #c2413b; }
	.task-meta, .task-id { margin-top: 8rpx; font-size: 23rpx; color: #748198; }
	.progress { height: 12rpx; border-radius: 999rpx; background: #edf1f7; overflow: hidden; margin-top: 16rpx; }
	.progress view { height: 100%; border-radius: 999rpx; }
	.bar-waiting { background: #8b97a8; }
	.bar-running { background: #1f6feb; }
	.bar-success { background: #36c2a0; }
	.bar-failed { background: #c2413b; }
</style>
