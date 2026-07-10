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

## 入口规则

- 小程序不提供独立首页，不注册 `pages/index/index`。
- `pages.json` 第一项固定为 `pages/login/index`。
- 已存在登录态时，登录页直接 `reLaunch` 到 `pages/workbench/index`。
- 未登录用户访问业务页时，由 `utils/auth.js` 统一重定向到登录页。

## 样式职责

- `App.vue` 只保留运行时 CSS 变量和真正跨页面的基础类。
- `uni.scss` 维护 uni-app/第三方组件使用的编译期主题变量。
- 页面与业务组件的 `<style>` 必须使用 `scoped`，避免 `.error-card`、`.empty-card`、`.search-box` 等同名类跨页面覆盖。
- 页面私有布局不要继续追加到 `App.vue`，需要复用时再提取为明确命名的公共组件。
