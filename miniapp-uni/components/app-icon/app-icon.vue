<template>
  <view :class="iconClasses" :style="iconStyle">
    <view class="i i1"></view>
    <view class="i i2"></view>
    <view class="i i3"></view>
    <view class="i i4"></view>
    <view class="i i5"></view>
  </view>
</template>

<script>
export default {
  name: 'AppIcon',
  props: {
    name: { type: String, default: 'brush' },
    tone: { type: String, default: 'gold' },
    size: { type: [String, Number], default: 36 }
  },
  computed: {
    iconClasses() {
      return ['app-icon', `app-icon-${this.name}`, `app-icon-${this.tone}`];
    },
    iconStyle() {
      const value = String(this.size).replace(/rpx|px/g, '');
      return `width:${value}rpx;height:${value}rpx;`;
    }
  }
};
</script>

<style>
.app-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--xg-color-primary);
}
.app-icon-gold { color: var(--xg-color-primary); }
.app-icon-dark { color: var(--xg-text-inverse); }
.app-icon-light { color: var(--xg-text-main); }
.app-icon-muted { color: var(--xg-text-muted); }
.app-icon .i {
  position: absolute;
  box-sizing: border-box;
  border-color: currentColor;
  background: transparent;
}

/* Brush */
.app-icon-brush .i1 { width: 58%; height: 16%; left: 28%; top: 16%; border-radius: 999rpx; background: currentColor; transform: rotate(-38deg); transform-origin: center; }
.app-icon-brush .i2 { width: 30%; height: 28%; left: 10%; top: 52%; border-radius: 45% 45% 58% 58%; border: 4rpx solid currentColor; transform: rotate(-38deg); }
.app-icon-brush .i3 { width: 34%; height: 4rpx; left: 46%; top: 48%; border-radius: 999rpx; background: currentColor; transform: rotate(-38deg); }

/* Layers */
.app-icon-layers .i1,
.app-icon-layers .i2,
.app-icon-layers .i3 { left: 15%; width: 70%; height: 44%; border: 4rpx solid currentColor; border-radius: 8rpx; }
.app-icon-layers .i1 { top: 7%; background: rgba(255,255,255,.02); }
.app-icon-layers .i2 { top: 27%; opacity: .8; }
.app-icon-layers .i3 { top: 47%; opacity: .58; }

/* Users */
.app-icon-users .i1 { width: 28%; height: 28%; left: 36%; top: 12%; border: 4rpx solid currentColor; border-radius: 50%; }
.app-icon-users .i2 { width: 58%; height: 34%; left: 21%; top: 55%; border: 4rpx solid currentColor; border-radius: 999rpx 999rpx 14rpx 14rpx; }
.app-icon-users .i3 { width: 20%; height: 20%; left: 9%; top: 27%; border: 4rpx solid currentColor; border-radius: 50%; opacity: .72; }
.app-icon-users .i4 { width: 20%; height: 20%; right: 9%; top: 27%; border: 4rpx solid currentColor; border-radius: 50%; opacity: .72; }

/* Image */
.app-icon-image .i1 { width: 78%; height: 68%; left: 11%; top: 16%; border: 4rpx solid currentColor; border-radius: 10rpx; }
.app-icon-image .i2 { width: 14%; height: 14%; right: 25%; top: 28%; border-radius: 50%; background: currentColor; }
.app-icon-image .i3 { width: 40%; height: 34%; left: 17%; bottom: 18%; border-left: 4rpx solid currentColor; border-bottom: 4rpx solid currentColor; transform: rotate(-45deg); }
.app-icon-image .i4 { width: 28%; height: 24%; right: 16%; bottom: 22%; border-left: 4rpx solid currentColor; border-bottom: 4rpx solid currentColor; transform: rotate(-45deg); opacity: .8; }

/* Ticket */
.app-icon-ticket .i1 { width: 82%; height: 54%; left: 9%; top: 23%; border: 4rpx solid currentColor; border-radius: 10rpx; }
.app-icon-ticket .i2 { width: 16%; height: 16%; left: 2%; top: 42%; border-radius: 50%; background: var(--xg-bg-card); border: 4rpx solid currentColor; }
.app-icon-ticket .i3 { width: 16%; height: 16%; right: 2%; top: 42%; border-radius: 50%; background: var(--xg-bg-card); border: 4rpx solid currentColor; }
.app-icon-ticket .i4 { height: 44%; left: 50%; top: 28%; border-left: 4rpx dashed currentColor; opacity: .7; }

/* Message square */
.app-icon-message .i1 { width: 76%; height: 58%; left: 12%; top: 15%; border: 4rpx solid currentColor; border-radius: 12rpx; }
.app-icon-message .i2 { width: 18%; height: 18%; left: 24%; bottom: 11%; border-left: 4rpx solid currentColor; border-bottom: 4rpx solid currentColor; transform: rotate(-18deg); }
.app-icon-message .i3 { width: 44%; height: 4rpx; left: 28%; top: 38%; border-radius: 999rpx; background: currentColor; opacity: .75; }
.app-icon-message .i4 { width: 30%; height: 4rpx; left: 28%; top: 54%; border-radius: 999rpx; background: currentColor; opacity: .75; }

/* Mail */
.app-icon-mail .i1 { width: 82%; height: 62%; left: 9%; top: 19%; border: 4rpx solid currentColor; border-radius: 9rpx; }
.app-icon-mail .i2 { width: 37%; height: 37%; left: 13%; top: 20%; border-left: 4rpx solid currentColor; border-bottom: 4rpx solid currentColor; transform: rotate(-45deg); }
.app-icon-mail .i3 { width: 37%; height: 37%; right: 13%; top: 20%; border-right: 4rpx solid currentColor; border-bottom: 4rpx solid currentColor; transform: rotate(45deg); }

/* Wallet cards */
.app-icon-wallet .i1 { width: 78%; height: 58%; left: 11%; top: 24%; border: 4rpx solid currentColor; border-radius: 12rpx; }
.app-icon-wallet .i2 { width: 64%; height: 34%; left: 15%; top: 13%; border: 4rpx solid currentColor; border-radius: 10rpx; opacity: .72; }
.app-icon-wallet .i3 { width: 15%; height: 15%; right: 19%; top: 47%; border-radius: 50%; background: currentColor; }

/* Eye */
.app-icon-eye .i1 { width: 84%; height: 48%; left: 8%; top: 26%; border: 4rpx solid currentColor; border-radius: 50%; }
.app-icon-eye .i2 { width: 26%; height: 26%; left: 37%; top: 37%; border-radius: 50%; background: currentColor; }

/* Droplet */
.app-icon-droplet .i1 { width: 48%; height: 64%; left: 26%; top: 14%; border: 4rpx solid currentColor; border-radius: 50% 50% 50% 10%; transform: rotate(-45deg); }
.app-icon-droplet .i2 { width: 16%; height: 16%; left: 43%; top: 54%; border-radius: 50%; background: currentColor; opacity: .68; }

/* Search */
.app-icon-search .i1 { width: 54%; height: 54%; left: 12%; top: 10%; border: 4rpx solid currentColor; border-radius: 50%; }
.app-icon-search .i2 { width: 38%; height: 5rpx; right: 7%; bottom: 18%; border-radius: 999rpx; background: currentColor; transform: rotate(45deg); transform-origin: center; }

/* Plus */
.app-icon-plus .i1 { width: 64%; height: 5rpx; left: 18%; top: 48%; border-radius: 999rpx; background: currentColor; }
.app-icon-plus .i2 { width: 5rpx; height: 64%; left: 48%; top: 18%; border-radius: 999rpx; background: currentColor; }

/* Bell */
.app-icon-bell .i1 { width: 56%; height: 56%; left: 22%; top: 16%; border: 4rpx solid currentColor; border-radius: 50% 50% 14rpx 14rpx; }
.app-icon-bell .i2 { width: 70%; height: 4rpx; left: 15%; top: 70%; border-radius: 999rpx; background: currentColor; }
.app-icon-bell .i3 { width: 16%; height: 16%; left: 42%; top: 77%; border-radius: 50%; background: currentColor; }

/* Check */
.app-icon-check .i1 { width: 52%; height: 28%; left: 23%; top: 32%; border-left: 5rpx solid currentColor; border-bottom: 5rpx solid currentColor; transform: rotate(-45deg); }

/* Upload */
.app-icon-upload .i1 { width: 5rpx; height: 58%; left: 48%; top: 16%; border-radius: 999rpx; background: currentColor; }
.app-icon-upload .i2 { width: 34%; height: 34%; left: 32%; top: 15%; border-left: 5rpx solid currentColor; border-top: 5rpx solid currentColor; transform: rotate(45deg); }
.app-icon-upload .i3 { width: 72%; height: 5rpx; left: 14%; bottom: 14%; border-radius: 999rpx; background: currentColor; }

/* Close */
.app-icon-x .i1 { width: 72%; height: 5rpx; left: 14%; top: 48%; border-radius: 999rpx; background: currentColor; transform: rotate(45deg); }
.app-icon-x .i2 { width: 72%; height: 5rpx; left: 14%; top: 48%; border-radius: 999rpx; background: currentColor; transform: rotate(-45deg); }

/* Refresh */
.app-icon-refresh .i1 { width: 62%; height: 62%; left: 19%; top: 19%; border: 4rpx solid currentColor; border-right-color: transparent; border-radius: 50%; }
.app-icon-refresh .i2 { width: 22%; height: 22%; right: 10%; top: 16%; border-top: 5rpx solid currentColor; border-right: 5rpx solid currentColor; transform: rotate(20deg); }

/* Menu */
.app-icon-menu .i1,
.app-icon-menu .i2,
.app-icon-menu .i3 { height: 5rpx; border-radius: 999rpx; background: currentColor; }
.app-icon-menu .i1 { width: 74%; left: 13%; top: 25%; }
.app-icon-menu .i2 { width: 52%; left: 24%; top: 47%; }
.app-icon-menu .i3 { width: 74%; left: 13%; top: 69%; }
</style>
