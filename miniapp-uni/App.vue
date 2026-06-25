<script>
	export default {
		onLaunch() {
			console.log('Furniture miniapp mock launched')
		}
	}
</script>

<style>
	page {
		background: #07090c;
		color: #f5f0e6;
		font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	.page {
		min-height: 100vh;
		box-sizing: border-box;
		padding: 0 24rpx 150rpx;
		background: radial-gradient(circle at 72% -18%, rgba(242, 213, 140, 0.13), transparent 32%), #07090c;
	}

	.section-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 34rpx 0 16rpx;
		font-size: 30rpx;
		font-weight: 800;
		color: #fff5dc;
	}

	.muted {
		color: rgba(255, 244, 223, 0.58);
		font-size: 24rpx;
		line-height: 1.6;
	}

	.primary-btn,
	.secondary-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
	}

	.primary-btn {
		height: 84rpx;
		border: 0;
		border-radius: 18rpx;
		background: linear-gradient(135deg, #f3da94, #c79b3b);
		color: #181207;
		font-size: 30rpx;
		box-shadow: 0 14rpx 34rpx rgba(242, 213, 140, 0.18);
	}

	.secondary-btn {
		height: 76rpx;
		border-radius: 16rpx;
		border: 1rpx solid rgba(242, 213, 140, 0.18);
		background: rgba(255, 255, 255, 0.04);
		color: #f0d68a;
		font-size: 28rpx;
	}

	.primary-btn::after,
	.secondary-btn::after {
		border: 0;
	}
</style>
