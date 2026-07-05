# 小程序端样式边界

小程序端样式只允许放在 `miniapp-uni` 内：

```txt
miniapp-uni/App.vue
miniapp-uni/uni.scss
miniapp-uni/pages/**/index.vue
miniapp-uni/components/**/*.vue
```

不要从 `frontend/src/styles` 直接复制整份 CSS 到小程序。

需要保持 Web 和小程序视觉一致时，只同步这些内容：

- 颜色变量
- 间距规则
- 字号规则
- 卡片圆角
- 页面布局参考

不要同步这些内容：

- Web 的 `.topApp` 样式
- Web 的 `position: fixed` 弹窗层级规则
- Web 的 `hover` 样式
- Web 的浏览器滚动条样式
- Web 的 PC/mobile overrides

小程序页面样式优先写在对应页面 `.vue` 的 scoped style 中，公共变量写入 `uni.scss`。
