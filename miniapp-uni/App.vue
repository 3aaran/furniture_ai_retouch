<script>
	export default {
		onLaunch() {
			console.log('Furniture miniapp launched')
		}
	}
</script>

<style>
	page {
		background: #07080a;
		color: #f7f1de;
		font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	.page {
		min-height: 100vh;
		box-sizing: border-box;
		padding: 0 24rpx 48rpx;
		background: radial-gradient(circle at 74% -12%, rgba(239, 206, 124, 0.16), transparent 34%), linear-gradient(180deg, #08090b 0%, #0d0f12 100%);
	}

	.section-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 34rpx 0 16rpx;
		font-size: 32rpx;
		font-weight: 900;
		color: #fff6dc;
	}

	.muted {
		color: rgba(255, 246, 220, 0.56);
		font-size: 24rpx;
		line-height: 1.6;
	}

	.primary-btn,
	.secondary-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
		box-sizing: border-box;
	}

	.primary-btn {
		height: 92rpx;
		border: 0;
		border-radius: 28rpx;
		background: linear-gradient(135deg, #fff1b8 0%, #e7bd52 44%, #c99731 100%);
		color: #171208;
		font-size: 31rpx;
		box-shadow: 0 20rpx 42rpx rgba(215, 172, 68, 0.18);
	}

	.secondary-btn {
		height: 76rpx;
		border-radius: 24rpx;
		border: 1rpx solid rgba(239, 206, 124, 0.2);
		background: rgba(255, 255, 255, 0.045);
		color: #f0d98d;
		font-size: 28rpx;
	}

	.primary-btn::after,
	.secondary-btn::after {
		border: 0;
	}
</style>
