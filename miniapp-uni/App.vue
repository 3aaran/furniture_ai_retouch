<script>
	export default {
		onLaunch() {
			console.log('Furniture miniapp launched')
		}
	}
</script>

<style>
	page {
		--xg-color-primary: #3040a0;
		--xg-color-primary-rgb: 48, 64, 160;
		--xg-color-primary-deep: #26358f;
		--xg-color-accent: #00bcd4;
		--xg-color-accent-rgb: 0, 188, 212;
		--xg-bg-page: #eef4fb;
		--xg-bg-surface: #f6f9fc;
		--xg-bg-card: #ffffff;
		--xg-bg-card-soft: #f7faff;
		--xg-bg-card-strong: #edf4ff;
		--xg-text-main: #16223a;
		--xg-text-muted: #60708c;
		--xg-text-dim: #8a98ad;
		--xg-text-inverse: #ffffff;
		--xg-border-soft: rgba(86, 110, 145, 0.18);
		--xg-shadow-soft: 0 16rpx 44rpx rgba(50, 80, 120, 0.08);
		--xg-radius-lg: 32rpx;
		--xg-radius-md: 24rpx;
		--xg-menu-button-safe-width: 176rpx;
		background: var(--xg-bg-page);
		color: var(--xg-text-main);
		font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	.page {
		min-height: 100vh;
		box-sizing: border-box;
		padding: 0 24rpx 48rpx;
		background: var(--xg-bg-page);
	}

	.page-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18rpx;
		margin: 24rpx 0 18rpx;
	}

	.page-head-main {
		display: flex;
		align-items: center;
		gap: 16rpx;
		min-width: 0;
	}

	.page-icon {
		width: 70rpx;
		height: 70rpx;
		flex: 0 0 70rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 22rpx;
		color: var(--xg-text-inverse);
		background: linear-gradient(135deg, var(--xg-color-primary), var(--xg-color-accent));
		font-size: 32rpx;
		font-weight: 900;
	}

	.page-icon .app-icon {
		color: var(--xg-text-inverse);
	}

	.page-title-text {
		min-width: 0;
	}

	.page-title-text .ui-strong {
		display: block;
		color: var(--xg-text-main);
		font-size: 36rpx;
		font-weight: 900;
		line-height: 1.18;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.page-title-text text {
		display: block;
		margin-top: 5rpx;
		color: var(--xg-text-muted);
		font-size: 23rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.icon-label {
		display: inline-flex;
		align-items: center;
		gap: 8rpx;
	}

	.section-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 34rpx 0 16rpx;
		font-size: 32rpx;
		font-weight: 900;
		color: var(--xg-text-main);
	}

	.muted {
		color: var(--xg-text-muted);
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
		background: linear-gradient(135deg, var(--xg-color-primary), var(--xg-color-accent));
		color: var(--xg-text-inverse);
		font-size: 31rpx;
		box-shadow: var(--xg-shadow-soft);
	}

	.primary-btn[disabled],
	.secondary-btn[disabled] {
		opacity: 0.55;
	}

	.secondary-btn {
		height: 76rpx;
		border-radius: 24rpx;
		border: 1rpx solid rgba(var(--xg-color-accent-rgb), 0.36);
		background: rgba(var(--xg-color-accent-rgb), 0.12);
		color: var(--xg-color-primary);
		font-size: 28rpx;
	}

	.primary-btn::after,
	.secondary-btn::after {
		border: 0;
	}
</style>
