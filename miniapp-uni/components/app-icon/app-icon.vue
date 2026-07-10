<template>
  <view :class="iconClasses" :style="iconStyle">
    <image class="app-icon-image" :src="iconSrc" mode="aspectFit" />
  </view>
</template>

<script>
const iconFiles = {
  menu: 'menu', x: 'x', wallet: 'wallet', brush: 'paintbrush', layers: 'layers-3',
  users: 'users', image: 'image', ticket: 'ticket', message: 'message-circle', mail: 'mail',
  search: 'search', plus: 'plus', refresh: 'refresh-cw', eye: 'eye', upload: 'upload',
  download: 'download', trash: 'trash-2', check: 'check', bell: 'bell', droplet: 'droplets',
  'arrow-left': 'chevron-left'
};

export default {
  name: 'AppIcon',
  props: {
    name: { type: String, default: 'brush' },
    tone: { type: String, default: 'gold' },
    size: { type: [String, Number], default: 36 }
  },
  computed: {
    iconClasses() {
      return ['app-icon', 'app-icon-' + this.tone];
    },
    iconSrc() {
      return '/static/icons/' + (iconFiles[this.name] || 'image') + '.svg';
    },
    iconStyle() {
      const value = String(this.size).replace(/rpx|px/g, '');
      return 'width:' + value + 'rpx;height:' + value + 'rpx;';
    }
  }
};
</script>

<style scoped>
.app-icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; line-height: 1; }
.app-icon-image { width: 100%; height: 100%; display: block; }
.app-icon-gold .app-icon-image { filter: none; }
.app-icon-dark .app-icon-image { filter: brightness(0) invert(1); }
.app-icon-light .app-icon-image { filter: brightness(0) saturate(100%) invert(13%) sepia(19%) saturate(1676%) hue-rotate(178deg) brightness(96%) contrast(92%); }
.app-icon-muted .app-icon-image { opacity: .58; }
</style>
