<template>
	<view class="page login-page">
		<view class="login-hero">
			<text class="login-title">登录</text>
			<text class="login-desc">第一阶段使用 mock 登录，不连接真实账号系统。</text>
		</view>

		<view class="login-form">
			<view class="field"><text>账号</text><input v-model="form.account" placeholder="请输入手机号或账号" /></view>
			<view class="field"><text>密码</text><input v-model="form.password" password placeholder="请输入密码" /></view>
			<button class="primary-btn" @click="login">mock 登录</button>
			<button class="secondary-btn" @click="back">返回</button>
		</view>

		<view class="demo-account">
			<text>演示账号</text>
			<text>13800000000 / 123456</text>
		</view>
	</view>
</template>

<script>
	import { mockLogin } from '../../utils/mockSession.js';

	export default {
		data() {
			return {
				form: {
					account: '13800000000',
					password: '123456'
				}
			}
		},
		methods: {
			login() {
				if (!this.form.account || !this.form.password) {
					uni.showToast({ title: '请输入账号和密码', icon: 'none' });
					return;
				}
				mockLogin();
				uni.showToast({ title: 'mock 登录成功', icon: 'success' });
				setTimeout(() => { uni.navigateBack(); }, 500);
			},
			back() {
				uni.navigateBack();
			}
		}
	}
</script>

<style>
	.login-hero { padding: 42rpx 32rpx; border-radius: 28rpx; background: linear-gradient(135deg,#172033,#1f6feb); color: #fff; }
	.login-title, .login-desc, .field text, .demo-account text { display: block; }
	.login-title { font-size: 48rpx; font-weight: 900; }
	.login-desc { margin-top: 12rpx; font-size: 26rpx; color: rgba(255,255,255,.78); line-height: 1.5; }
	.login-form { margin-top: 24rpx; padding: 28rpx; border-radius: 22rpx; background: #fff; display: grid; gap: 22rpx; }
	.field text { margin-bottom: 12rpx; font-size: 26rpx; font-weight: 800; color: #172033; }
	input { height: 82rpx; border-radius: 16rpx; background: #f6f8fc; padding: 0 20rpx; font-size: 27rpx; color: #172033; }
	.demo-account { margin-top: 22rpx; padding: 22rpx; border-radius: 18rpx; background: #eef5ff; }
	.demo-account text:first-child { font-size: 24rpx; font-weight: 800; color: #1f6feb; }
	.demo-account text:last-child { margin-top: 8rpx; font-size: 26rpx; color: #172033; }
</style>
