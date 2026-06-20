# 管理员工作流后端接入设计

## 目标

将工作流管理从浏览器 `localStorage` 切换到 MySQL 和真实管理员 API。

## 简化决策

- 仅保存当前工作流，不保存不可变版本快照。
- 使用单表 `workflow_templates`。
- 发布只执行校验并把状态改为 `PUBLISHED`。
- 已发布工作流仍可直接编辑和覆盖。
- `version` 仅作为发布次数显示；发布时加一，不对应历史快照。
- 删除为物理删除，示例工作流也可删除。
- 不迁移浏览器本地数据。
- 数据库首次初始化两条示例工作流；初始化标记写入 `app_settings`，删除后不会因重启再次创建。

## 数据表

`workflow_templates` 保存名称、唯一 code、描述、类型、场景、状态、发布次数、画布 JSON、配置 JSON、创建人、更新人和时间。

## API

- `GET /api/admin/workflows`
- `POST /api/admin/workflows`
- `GET /api/admin/workflows/:id`
- `PUT /api/admin/workflows/:id`
- `POST /api/admin/workflows/:id/validate`
- `POST /api/admin/workflows/:id/publish`
- `POST /api/admin/workflows/:id/disable`
- `POST /api/admin/workflows/:id/duplicate`
- `DELETE /api/admin/workflows/:id`

所有接口必须通过登录鉴权和 `SYSTEM_ADMIN` 权限检查。

## 校验与错误

前后端使用相同规则：唯一开始节点、视频生成节点、保存结果节点、节点连通、无循环、无重复边、无自连接、必填配置完整。后端是最终可信校验方。

## 前端切换

`workflowRepository` 保持现有方法签名，但实现改为调用 API。页面不再展示“本地演示数据”，请求失败时显示真实错误，不回退到本地数据。

## 不在本期实现

- 工作流历史版本和回滚 API。
- 工作流执行引擎。
- 视频模板绑定。
- 多管理员协作和审计日志。
