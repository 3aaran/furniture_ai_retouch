# frontend-next 开发规则

## 目标

`frontend-next` 是家具 AI 修图平台的新 Web 前端。它只负责 PC Web 和手机 Web；旧 `frontend` 暂时保留，不再作为新视觉和新响应式的修改基础。

## 不允许

1. 不引入 `legacy`、`overrides`、`final-fixes`、`mobile-app`、`mobile-shell` 这类覆盖层目录。
2. 不通过新增大范围选择器覆盖样式，例如 `.app :is(...)`、`.topApp .xxx` 这类兜底覆盖。
3. 不使用 `!important` 做常规样式控制。
4. 不在页面或组件样式里写散落真实颜色值，例如 `#050506`、`#f0d68a`、`rgba(240,214,138,.12)`。
5. 不为 PC 和手机重复开发两套完全独立页面。

## 必须

1. 真实颜色只允许定义在 `src/styles/tokens.css`。
2. 页面和组件只能引用全局变量或模块局部语义变量。
3. PC 与手机共用同一个页面组件，通过 CSS Grid/Flex 和少量交互组件响应式适配。
4. 手机 Web 的页面顺序、功能命名、交互逻辑要和未来小程序端保持一致。
5. API 字段、任务状态、额度逻辑沿用现有后端，不修改后端接口。
6. 列表、资产、任务、用户、日志、记录等超过一屏或可能大量增长的数据，默认必须设计分页、懒加载、虚拟滚动或展开/收起，不等用户单独提醒。
7. 图片列表默认优先使用后端返回的缩略图或压缩图；只有详情页、预览弹窗、下载入口才加载高清图。
8. 前端图标必须从统一图标入口调用，不在页面里散落使用 emoji、特殊字符或临时符号。当前入口为 `src/components/icons/AppIcon.tsx`，后续可替换为外部图标库实现。

## 样式分层

```text
styles/tokens.css   唯一设计变量源
styles/reset.css    浏览器默认样式重置
styles/global.css   全局基础样式和通用布局
pages/*/*.css       页面局部样式
components/*/*.css  组件局部样式
```

## 响应式断点

```text
mobile  <= 767px
tablet  768px - 1023px
desktop >= 1024px
wide    >= 1440px
```

## 本地运行

根目录默认运行新前端：

```bash
npm run dev
```

只运行新前端：

```bash
npm --prefix frontend-next run dev
```

旧前端仅作为回退：

```bash
npm run dev:old
```
