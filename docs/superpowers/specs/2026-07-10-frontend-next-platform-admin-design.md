# frontend-next 平台管理员与角色访问设计

## 目标

在不修改 `backend` 的前提下，为 `frontend-next` 补齐平台管理员控制台，并以同一套门店工作台服务门店管理员、门店人员和体验账户。界面优先信息清晰、操作直接，不新增复杂视觉系统。

## 范围

- 仅修改 `frontend-next`；不覆盖、移动或改写旧 `frontend`。
- 直接调用现有 `/api/admin/*`、`/api/merchant/*` 接口；不新增、变更或绕过后端权限。
- 平台管理员页面以旧 `frontend` 的功能清单为准：运营概况、申请审核、商家管理、AI 日志、问题反馈、系统资源、模型配置、系统配置、公告、兑换码和工作流。
- 已存在的门店工作台、资产库、历史任务、额度与个人中心不复制实现；所有非平台用户直接复用当前 `frontend-next` 页面。

## 路由与角色

| 角色 | 登录后默认页 | 可访问页面 |
| --- | --- | --- |
| `SYSTEM_ADMIN` | `/admin/dashboard` | 全部 `/admin/*` 页面 |
| `MERCHANT_OWNER`、`MERCHANT_ADMIN` | `/studio` | 工作台、资产库、用户、历史任务、邀请共创、额度、个人中心 |
| `STAFF`、`TRIAL` | `/studio` | 工作台、历史任务、额度、个人中心 |

- `SYSTEM_ADMIN` 访问普通门店路由时重定向至后台概况；非平台管理员访问 `/admin/*` 时重定向至工作台。
- `STAFF` 与 `TRIAL` 不显示、也不能通过直接输入路径进入 `/resources`、`/promotion`、`/users`；这些路径均重定向至 `/studio`。
- 门店主账号和门店管理员的现有功能、请求和页面保持不变。

## 平台管理员控制台

使用独立的 `AdminShell`：桌面端固定左侧分组导航，窄屏时折叠为顶部菜单；主体为列表、筛选表单和必要的确认弹窗。页面按旧版功能对接已有接口：

| 页面 | 主要接口 | 关键操作 |
| --- | --- | --- |
| 运营概况 | `GET /api/admin/overview` | 查看商家、任务、额度等统计 |
| 申请审核 | `/api/admin/applications` | 查询、通过、驳回商家申请 |
| 商家管理 | `/api/admin/merchants` | 查询、详情、启停、调整额度 |
| AI 日志 | `/api/admin/task-images` | 筛选、查看任务与下载 |
| 问题反馈 | `/api/admin/feedbacks` | 筛选与更新处理状态 |
| 系统资源 | `/api/admin/resources` | 查询、上传、启停、删除 |
| 模型配置 | `/api/admin/ai/config` | 读取并保存模型选择 |
| 系统配置 | `/api/admin/settings` | 读取并保存平台参数 |
| 公告管理 | `/api/admin/announcements` | 查询、发布公告 |
| 兑换码 | `/api/admin/redeem-codes` | 批量生成与查询 |
| 工作流管理 | `/api/admin/workflows` | 新建、列表、JSON 配置编辑、校验、发布、停用、复制、删除 |

## 代码组织

- 新建 `pages/admin/`，按页面拆分，复用现有分页、状态展示、图标和简单表格能力；不复制门店页面代码。
- 新建 `services/admin.api.ts`，集中封装管理员 API；普通门店 API 保持在现有服务内。
- 在路由层实现声明式角色守卫，在 `AppShell` 中按角色过滤现有普通用户导航；不为门店人员或体验账户新建重复页面。
- 工作流使用表单与 JSON 配置编辑器直接覆盖现有接口能力，不迁移旧版的流程画布。

## 错误处理与验证

- 每个请求保留加载、空状态、错误提示和操作完成后的列表刷新。
- 对受限路由同时验证菜单隐藏和直接访问重定向。
- 使用现有后端返回结构，不以模拟数据替代真实请求。
- 完成后运行 `pnpm --dir frontend-next typecheck`、`pnpm --dir frontend-next run build`，以及新增或更新的路由/API/角色约束测试。

## 非目标

- 不改后端、数据库、接口权限或登录协议。
- 不重做门店工作台的视觉样式。
- 不为门店人员或体验账户开放资产库、邀请共创、用户管理权限。
