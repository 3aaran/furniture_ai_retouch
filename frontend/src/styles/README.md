# 前端样式模块化说明

当前项目样式入口已改为：

```jsx
import './styles/index.css';
```

## 目录结构

```txt
frontend/src/styles/
├─ index.css
├─ base/
│  ├─ variables.css
│  └─ reset.css
├─ layout/
│  ├─ top-nav.css
│  └─ page-layout.css
├─ components/
│  ├─ modal.css
│  ├─ table.css
│  ├─ pagination.css
│  └─ upload.css
├─ pages/
│  ├─ workbench.css
│  ├─ resources.css
│  ├─ task-detail.css
│  ├─ admin-logs.css
│  ├─ users.css
│  └─ history.css
├─ overrides/
│  └─ final-fixes.css
└─ legacy/
   ├─ style.css
   └─ workbench-fixes.css
```

## 当前迁移策略

为了保证你最新项目的页面内容和视觉不被破坏，原来的两个 CSS 文件已经原样放入：

```txt
styles/legacy/style.css
styles/legacy/workbench-fixes.css
```

后续改页面时建议逐步拆分：

- 改工作台：`styles/pages/workbench.css`
- 改资源库：`styles/pages/resources.css`
- 改任务详情弹窗：`styles/pages/task-detail.css`
- 改管理员 AI 日志：`styles/pages/admin-logs.css`
- 临时修复：`styles/overrides/final-fixes.css`

确认稳定后，再从 `legacy/` 中逐步剪切到对应页面 CSS。
