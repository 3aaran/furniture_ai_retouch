# 小程序图标与图片质量优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变后端或页面路由的前提下，使小程序使用 Web 同源图标、安全顶部布局，以及按浏览或细看场景选择缩略图或原图的分页图片体验。

**Architecture:** 在 `utils/model.js` 集中区分浏览缩略图与原图，业务页只消费明确的 `thumbnail` 与 `original` 字段。`app-icon` 从静态 Lucide SVG 映射资源，不再用 CSS 子元素绘制图标。分页状态保留在各页面，预览始终传原图地址。

**Tech Stack:** uni-app Vue 2 options API、微信小程序 `image`/`scroll-view`、Lucide SVG 静态资源、Node 内置测试、HBuilderX mp-weixin 编译。

---

## 文件边界

- `miniapp-uni/utils/model.js`：提供 `thumbnailOf`、`originalOf`，保留现有 `imageOf` 作为浏览缩略图兼容入口。
- `miniapp-uni/components/app-icon/app-icon.vue`：将名称映射为本地 SVG，而不是 CSS 图形层。
- `miniapp-uni/static/icons/*.svg`：Web 同源 Lucide 线框资源。
- `miniapp-uni/components/app-topbar/app-topbar.vue`：右侧安全区与紧凑状态。
- `miniapp-uni/pages/{tasks,resources,workbench}/index.vue`：缩略图、原图预览、懒加载和逐页加载。
- `miniapp-uni/tests/miniapp-contract.test.mjs`：静态回归测试。

### Task 1: 建立图片用途选择契约

**Files:**
- Modify: `miniapp-uni/utils/model.js:92-94`
- Modify: `miniapp-uni/tests/miniapp-contract.test.mjs`

- [ ] **Step 1: 写入失败测试，要求浏览和细看地址分离**

```js
const model = read('utils/model.js');
assert.match(model, /export function thumbnailOf\(item = \{\}\)/);
assert.match(model, /export function originalOf\(item = \{\}\)/);
assert.match(model, /thumbUrl \|\| item\.thumbnailUrl/);
assert.match(model, /item\.url \|\| item\.imageUrl \|\| item\.resultUrl/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: FAIL，缺少 `thumbnailOf` / `originalOf`。

- [ ] **Step 3: 最小实现图片选择函数**

```js
export function thumbnailOf(item = {}) {
  return item.thumbUrl || item.thumbnailUrl || originalOf(item);
}

export function originalOf(item = {}) {
  return item.url || item.imageUrl || item.resultUrl || item.originalUrl || item.storageUrl || '';
}

export function imageOf(item = {}) {
  return thumbnailOf(item);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: PASS。

### Task 2: 替换 CSS 拼装图标

**Files:**
- Create: `miniapp-uni/static/icons/{menu,arrow-left,x,wallet,brush,layers,users,image,ticket,message,mail,search,plus,refresh,eye,upload,download,trash,check}.svg`
- Modify: `miniapp-uni/components/app-icon/app-icon.vue`
- Modify: `miniapp-uni/tests/miniapp-contract.test.mjs`

- [ ] **Step 1: 写入失败测试，约束静态 SVG 映射与移除绘图层**

```js
const icon = read('components/app-icon/app-icon.vue');
assert.match(icon, /\/static\/icons\//);
assert.match(icon, /<image[^>]+:src="iconSrc"/);
assert.doesNotMatch(icon, /class="i i\d"/);
assert.doesNotMatch(icon, /\.app-icon-[\w-]+\s+\.i\d/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: FAIL，当前组件含 CSS 绘图层。

- [ ] **Step 3: 添加从 Web Lucide 名称导出的 SVG 并改写图标组件**

```vue
<template><view :class="classes"><image class="app-icon-image" :src="iconSrc" mode="aspectFit" /></view></template>
<script>
const iconFiles = { menu: 'menu', x: 'x', wallet: 'wallet', brush: 'paintbrush', layers: 'layers-3', users: 'users', image: 'image', ticket: 'ticket', message: 'message-circle', mail: 'mail', search: 'search', plus: 'plus', refresh: 'refresh-cw', eye: 'eye', upload: 'upload', download: 'download', trash: 'trash-2', check: 'check', 'arrow-left': 'chevron-left' };
export default { computed: { iconSrc() { return `/static/icons/${iconFiles[this.name] || 'image'}.svg`; } } };
</script>
```

SVG 均保持 `viewBox="0 0 24 24"`、`fill="none"`、`stroke="currentColor"` 的 Lucide 线框定义；组件用 CSS `filter` 或主题资源变体保持语义颜色，不在页面内复制 SVG 路径。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: PASS。

### Task 3: 修复顶栏系统胶囊与头像冲突

**Files:**
- Modify: `miniapp-uni/components/app-topbar/app-topbar.vue:2-24, 143-205`
- Modify: `miniapp-uni/tests/miniapp-contract.test.mjs`

- [ ] **Step 1: 写入失败测试，约束顶部安全区与紧凑配额**

```js
const topbar = read('components/app-topbar/app-topbar.vue');
assert.match(topbar, /--xg-menu-button-safe-width/);
assert.match(topbar, /topbar-right/);
assert.match(topbar, /quota-chip-compact/);
assert.match(topbar, /padding-right:\s*var\(--xg-menu-button-safe-width\)/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: FAIL，当前右侧项目直接并列，未保留小程序胶囊区域。

- [ ] **Step 3: 给右侧控件建立安全容器**

将配额与头像包进 `.topbar-right`，使用固定头像触控区、`min-width: 0` 标题和 `padding-right: var(--xg-menu-button-safe-width)`。通过 `quota-chip-compact` 在空间紧张时只显示图标，避免覆盖头像；按钮容器保持可见边框与至少 `72rpx` 点击面积。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: PASS。

### Task 4: 资产库与历史记录使用缩略图、原图预览和分页

**Files:**
- Modify: `miniapp-uni/pages/resources/index.vue`
- Modify: `miniapp-uni/pages/tasks/index.vue`
- Modify: `miniapp-uni/tests/miniapp-contract.test.mjs`

- [ ] **Step 1: 写入失败测试，要求列表懒加载与分页，预览用原图**

```js
for (const file of ['pages/resources/index.vue', 'pages/tasks/index.vue']) {
  const source = read(file);
  assert.match(source, /lazy-load/);
  assert.match(source, /page:\s*1/);
  assert.match(source, /hasMore/);
}
const tasks = read('pages/tasks/index.vue');
assert.match(tasks, /uni\.previewImage\(\{ urls: \[task\.original\]/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: FAIL，页面一次性重载固定数量，预览误用列表图片。

- [ ] **Step 3: 实施增量分页与无裁切缩略图**

每页维护 `page`、`pageSize`、`hasMore`、`loadingMore`。`reload()` 清空并请求第 1 页，`loadNextPage()` 仅在有下一页且未加载时追加结果；页面使用 `@scrolltolower="loadNextPage"` 或底部“加载更多”。

```vue
<image v-if="item.thumbnail" :src="item.thumbnail" mode="aspectFit" lazy-load />
```

标准化对象加入 `thumbnail: normalizeFileUrl(thumbnailOf(item))` 与 `original: normalizeFileUrl(originalOf(item))`。任务预览、下载和资源详情跳转传 `original`，卡片只使用 `thumbnail`。将图片容器改为比例框，去除 `overflow: hidden` 和 `aspectFill` 裁切。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: PASS。

### Task 5: 工作台浏览缩略图与细看原图

**Files:**
- Modify: `miniapp-uni/pages/workbench/index.vue`
- Modify: `miniapp-uni/tests/miniapp-contract.test.mjs`

- [ ] **Step 1: 写入失败测试，约束工作台图片策略**

```js
const workbench = read('pages/workbench/index.vue');
assert.match(workbench, /thumbnailOf/);
assert.match(workbench, /originalOf/);
assert.match(workbench, /lazy-load/);
assert.match(workbench, /mode="aspectFit"/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: FAIL，工作台共用 `imageOf` 和裁切式图片容器。

- [ ] **Step 3: 分离资源/最近记录的缩略图与上传/预览原图**

资源磁贴和最近生成记录保存 `thumbnail` 供浏览，上传产品原图与参考图保存 `original`。所有浏览用图片标注 `lazy-load`，展示容器使用 `aspectFit`；新增点击预览方法时调用 `uni.previewImage({ urls: [item.original], current: item.original })`。不改变任务提交的 `originImageId`、`referenceImageIds` 或抽屉流程。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: PASS。

### Task 6: 完整验证与小程序产物检查

**Files:**
- Verify: `miniapp-uni/tests/miniapp-contract.test.mjs`
- Verify: `miniapp-uni/unpackage/dist/dev/mp-weixin/**`

- [ ] **Step 1: 运行小程序契约测试**

Run: `node --test miniapp-uni/tests/miniapp-contract.test.mjs`

Expected: 全部 PASS。

- [ ] **Step 2: 编译微信小程序**

Run: `& 'E:\备份\HBuilderX\HBuilderX\cli.exe' launch mp-weixin --project "$PWD\miniapp-uni" --compile true --continue-on-error false`

Expected: 命令退出码为 0，且无 `b`/`small` 选择器或 WXML 属性换行错误。

- [ ] **Step 3: 检查编译产物的图片与图标引用**

Run: `rg -n "lazy-load|/static/icons/|aspectFit" miniapp-uni/unpackage/dist/dev/mp-weixin/pages miniapp-uni/unpackage/dist/dev/mp-weixin/components`

Expected: 目标页面含懒加载与无裁切模式，图标引用指向本地静态目录。
