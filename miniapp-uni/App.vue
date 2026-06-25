<script>
	export default {
		onLaunch() {
			console.log('Furniture miniapp mock launched')
		}
	}
</script>

<style>
	page {
		background: #f5f7fb;
		color: #172033;
		font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	.page {
		min-height: 100vh;
		box-sizing: border-box;
		padding: 28rpx;
		background: #f5f7fb;
	}

	.section-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 34rpx 0 18rpx;
		font-size: 32rpx;
		font-weight: 800;
		color: #172033;
	}

	.muted {
		color: #748198;
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
		border-radius: 16rpx;
		background: #1f6feb;
		color: #fff;
		font-size: 30rpx;
	}

	.secondary-btn {
		height: 76rpx;
		border-radius: 14rpx;
		border: 1rpx solid #d9e1ef;
		background: #fff;
		color: #1f6feb;
		font-size: 28rpx;
	}
</style>
