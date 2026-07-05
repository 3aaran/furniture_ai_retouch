# Web 与小程序样式边界

## 核心原则

PC Web 和手机 H5 使用同一套 React 页面和同一套基础视觉样式，不拆成两套前端。

```txt
PC Web   = shared base + 少量 desktop 修正
手机 H5  = shared base + 少量 mobile 修正
小程序   = miniapp-uni 独立项目
```

## Web 样式入口

`src/App.jsx` 只导入：

```jsx
import './styles/index.css';
```

`styles/index.css` 只导入：

```css
@import './platforms/web/index.css';
```

`styles/platforms/web/index.css` 的加载顺序是：

```css
@import './base.css';
@import './desktop.css' screen and (min-width:861px);
@import './mobile.css' screen and (max-width:860px);
```

## Web 分层职责

```txt
styles/platforms/web/
├─ index.css    # Web 样式总入口
├─ base.css     # PC 和手机 H5 共用的完整基础视觉系统
├─ desktop.css  # 只放必须限制在 PC 的少量规则
└─ mobile.css   # 只放手机 H5 的少量覆盖规则
```

修改规则：

- 大部分页面样式放在页面自己的 CSS，并由 `base.css` 引入。
- PC 和手机都需要的视觉修复，放在 `base.css` 引入的页面或覆盖文件中。
- 只有 PC 才能生效的布局，放在 `desktop.css`。
- 只有手机 H5 才能生效的布局，放在 `mobile.css`。
- 手机端不要重新写一整套页面样式，只覆盖布局、间距、滚动、底部导航、弹窗高度等差异。

## 页面样式规则

页面 CSS 必须优先挂页面根类，例如：

```css
.wbScreen .xxx {}
.resourcePageV3 .xxx {}
.storeUsersV2 .xxx {}
.quotaPageV2 .xxx {}
.workflowEditorPage .xxx {}
```

不要继续新增宽泛全局选择器，例如：

```css
.panel {}
.card {}
.toolbar {}
.modalMask {}
.tableWrap {}
```

如果必须做公共组件样式，应放在 `styles/components/` 或组件自己的文件中，并使用组件专属类名。

## 小程序端

小程序样式属于独立项目：

```txt
miniapp-uni/
├─ App.vue
├─ uni.scss
├─ pages/**/*.vue
└─ components/**/*.vue
```

小程序端不共享 `frontend/src/styles` 的 CSS 文件。需要同步视觉时，只同步颜色、字号、间距、圆角、布局思路，不直接复制 Web CSS。

## 后续迁移方向

不要一次性重写全部样式。按页面逐步把 `legacy` 和 `overrides` 中的规则迁回页面 CSS：

```txt
工作台 -> 资源库 -> 用户管理 -> 额度明细 -> 历史任务 -> 管理员页面
```

每迁一个页面，保持这个目标：

```txt
页面默认样式 PC 和手机共用
手机端只在 @media(max-width:860px) 或 mobile.css 中做少量覆盖
```