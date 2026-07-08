# Furniture AI Retouch Frontend Next

这是全新的 Web 前端，只负责 PC Web 与手机 Web。

旧前端目录 `frontend` 暂时保留，仅作为回退，不作为新视觉和新响应式的继续修改基础。

## 当前阶段

已完成基础框架：

- Vite + React + TypeScript
- 路由系统
- AppShell 顶部导航与手机底部导航
- 全局设计变量 `src/styles/tokens.css`
- 首页、登录页、AI 工作室静态响应式页面
- API 层、类型层、hooks、stores 目录
- PC 与手机共用页面，通过 CSS 响应式适配

## 本地运行

根目录默认启动新前端：

```bash
npm run dev
```

只启动新前端：

```bash
npm --prefix frontend-next run dev
```

如果首次运行，需要先安装依赖：

```bash
npm --prefix frontend-next install --legacy-peer-deps --no-audit --no-fund
```

## 接口代理

`vite.config.ts` 默认把 `/api` 和 `/uploads` 代理到：

```text
http://localhost:3001
```

可以通过环境变量修改：

```bash
VITE_API_PROXY_TARGET=http://localhost:3001 npm --prefix frontend-next run dev
```

## 开发规则

详见：

```text
FRONTEND_RULES.md
```

核心原则：

- 真实颜色只在 `src/styles/tokens.css`
- 不新增覆盖层
- 不写大范围 `!important`
- PC 与手机共用页面，不重复写两套页面
- 手机 Web 与未来小程序端保持同一套交互流程和视觉规范
