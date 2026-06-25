<template>
	<view class="page me-page">
		<view class="profile-card">
			<view class="avatar">{{ loggedIn ? user.name.slice(0, 1) : '未' }}</view>
			<view class="profile-info">
				<text class="profile-name">{{ loggedIn ? user.name : '未登录用户' }}</text>
				<text class="profile-desc">{{ loggedIn ? user.company : '登录后查看额度和任务记录' }}</text>
			</view>
			<button class="login-btn" @click="handleLogin">{{ loggedIn ? '退出' : '登录' }}</button>
		</view>

		<view class="metric-grid">
			<view class="metric-card"><text>剩余额度</text><text>{{ loggedIn ? user.quota : '--' }}</text></view>
			<view class="metric-card"><text>今日使用</text><text>{{ loggedIn ? user.usedToday : '--' }}</text></view>
		</view>

		<view class="info-list">
			<view class="info-row"><text>角色</text><text>{{ loggedIn ? user.role : '游客' }}</text></view>
			<view class="info-row"><text>手机号</text><text>{{ loggedIn ? user.phone : '--' }}</text></view>
			<view class="info-row"><text>存储空间</text><text>{{ loggedIn ? user.storage : '--' }}</text></view>
			<view class="info-row"><text>数据来源</text><text>mock 数据</text></view>
		</view>
	</view>
</template>

<script>
	import { getMockUser, isMockLoggedIn, mockLogout } from '../../utils/mockSession.js';

	export default {
		data() {
			return {
				loggedIn: false,
				user: getMockUser()
			}
		},
		onShow() {
			this.loggedIn = isMockLoggedIn();
			this.user = getMockUser();
		},
		methods: {
			handleLogin() {
				if (!this.loggedIn) {
					uni.navigateTo({ url: '/pages/login/login' });
					return;
				}
				mockLogout();
				this.loggedIn = false;
				uni.showToast({ title: '已退出 mock 登录', icon: 'none' });
			}
		}
	}
</script>

<style>
	.profile-card { padding: 30rpx; border-radius: 28rpx; background: #172033; color: #fff; display: flex; align-items: center; gap: 22rpx; }
	.avatar { width: 104rpx; height: 104rpx; border-radius: 30rpx; background: #1f6feb; display: flex; align-items: center; justify-content: center; font-size: 38rpx; font-weight: 900; }
	.profile-info { flex: 1; min-width: 0; }
	.profile-name, .profile-desc, .metric-card text, .info-row text { display: block; }
	.profile-name { font-size: 34rpx; font-weight: 900; }
	.profile-desc { margin-top: 8rpx; font-size: 24rpx; color: rgba(255,255,255,.72); }
	.login-btn { width: 122rpx; height: 64rpx; border-radius: 999rpx; background: #fff; color: #172033; font-size: 25rpx; font-weight: 900; }
	.metric-grid { margin-top: 22rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 18rpx; }
	.metric-card { padding: 28rpx; border-radius: 22rpx; background: #fff; }
	.metric-card text:first-child { font-size: 24rpx; color: #748198; }
	.metric-card text:last-child { margin-top: 10rpx; font-size: 42rpx; font-weight: 900; color: #1f6feb; }
	.info-list { margin-top: 22rpx; border-radius: 22rpx; background: #fff; overflow: hidden; }
	.info-row { height: 90rpx; padding: 0 24rpx; display: flex; align-items: center; justify-content: space-between; border-bottom: 1rpx solid #edf1f7; font-size: 26rpx; }
	.info-row:last-child { border-bottom: 0; }
	.info-row text:first-child { color: #172033; font-weight: 800; }
	.info-row text:last-child { color: #748198; }
</style>
