# 真实生图工作流设计

## 1. 目标

修正管理员工作流创建页，使工作流不再是无法执行的视频流程演示，而是能够编排并调用现有 9 个生图功能的真实串行工作流。

本期目标：

- 点击“新建工作流”后进入空白画布。
- 节点库只展示实际需要、具有明确执行语义的节点。
- 9 个生图节点复用现有 AI 任务参数、模型配置、提示词、扣费、存储和任务记录逻辑。
- 多个生图节点串联时，上一个节点的结果图片自动成为下一个节点的 Image A。
- 工作流执行过程和每个节点结果可以持久化、查询和定位失败原因。

## 2. 范围

本期支持：

- 单一开始节点。
- 单一图片输入节点。
- 9 种真实生图节点。
- 单一保存结果节点。
- 有向无环图。
- 按拓扑顺序串行执行。
- 一个节点只有一个主结果图片。
- 节点失败后终止整次执行。
- 已发布工作流执行。

本期不支持：

- 视频生成。
- 图片分析、视频方案规划、提示词生成等独立虚拟节点。
- 条件分支、循环、并行执行和节点跳过。
- 一个节点生成多张图片。
- 工作流历史版本和回滚。
- 自动重试整个工作流。

## 3. 节点模型

节点库共 12 类。

### 3.1 控制和数据节点

1. `START`
   - 工作流唯一入口。
   - 不调用外部服务。

2. `IMAGE_INPUT`
   - 接收用户选择或上传的家具原图。
   - 执行时必须提供有效 `originImageId`。

3. `SAVE_OUTPUT`
   - 标记工作流最终输出。
   - 默认使用直接上游节点的结果图片。
   - 不重复保存图片；现有 AI 任务完成时已保存图片和资源关系。

### 3.2 真实生图节点

每种节点直接映射现有 `featureKey`：

| 节点类型 | 中文名称 | featureKey |
| --- | --- | --- |
| `MATERIAL_GENERATE` | 材质替换 | `material` |
| `SCENE_GENERATE` | 场景融合 | `replace_bg` |
| `BACKGROUND_CLEAN` | 背景净化 | `remove_bg` |
| `PHOTO_ENHANCE` | 摄影增强 | `enhance` |
| `LINEART_GENERATE` | 线稿图 | `lineart` |
| `MULTIVIEW_GENERATE` | 多角度视图 | `multiview` |
| `PROMO_MAIN_GENERATE` | 产品主图 | `promo_main_image` |
| `PROMO_POSTER_GENERATE` | 广告海报图 | `promo_poster_image` |
| `PROMO_DETAIL_GENERATE` | 产品细节图 | `promo_detail_image` |

节点不得复制模型调用实现。执行器必须复用现有 AI 任务服务。

## 4. 新建和编辑行为

### 4.1 新建

进入 `/admin/workflows/create` 时：

- `canvasJson.nodes` 为空数组。
- `canvasJson.edges` 为空数组。
- `configJson.entryNodeId` 为 `null`。
- 工作流名称默认为“未命名工作流”。
- 类型固定为 `IMAGE`。
- 不显示任何预置示例链路。
- 画布展示空状态提示，引导管理员从左侧拖入节点。

### 4.2 编辑

- 节点可以拖入、移动、连接、选择和删除。
- 点击真实生图节点后，右侧显示该功能实际需要的参数。
- 通用参数包括分辨率、比例、用户提示词和失败策略。
- 功能专属参数复用工作台已有选项结构。
- 不允许添加当前执行器不支持的节点。

### 4.3 示例数据兼容

数据库中现有旧视频示例工作流不自动迁移为新节点。

- 旧节点仍可读取和删除。
- 旧工作流不能发布或执行。
- 校验结果明确提示“包含已停用的旧版节点，请重新创建图片工作流”。
- 后续数据库初始化不再创建旧视频示例。

## 5. 图结构约束

可执行工作流必须满足：

1. 有且只有一个 `START`。
2. 有且只有一个 `IMAGE_INPUT`。
3. 有且只有一个 `SAVE_OUTPUT`。
4. 至少包含一个真实生图节点。
5. 所有节点都能从 `START` 到达。
6. `START` 没有入边。
7. `IMAGE_INPUT` 只有一个入边，且上游必须是 `START`。
8. 每个真实生图节点只有一个主入边。
9. `SAVE_OUTPUT` 只有一个入边且没有出边。
10. 不允许自连接、重复边、孤立节点和循环。
11. 当前阶段不允许一个节点连接多个下游节点，确保执行语义为严格串行。

推荐链路：

`START → IMAGE_INPUT → 一个或多个生图节点 → SAVE_OUTPUT`

## 6. 节点配置

每个真实生图节点保存：

```js
{
  featureKey: string,
  resolution: '1K' | '2K' | '4K',
  ratio: '自适应' | '1:1' | '4:3' | '3:4' | '16:9',
  userPrompt: string,
  options: object,
  failurePolicy: 'STOP'
}
```

功能专属 `options` 必须沿用工作台现有参数含义：

- 材质替换：材质资源、保持结构、角度和比例。
- 场景融合：场景资源、保持光照和透视。
- 背景净化：纯白背景、镜面和阴影设置。
- 摄影增强：清晰度、光线、纹理和角度设置。
- 线稿图：线条风格、颜色、细节等级和阴影。
- 多角度视图：三视图或四视图、布局和背景。
- 产品主图、广告海报图、产品细节图：复用 `buildPromotionOptions` 对应字段。

资源型节点配置只保存资源 ID 和必要快照；执行时仍需校验当前用户是否有权使用该资源。

## 7. 执行入口

新增：

```text
POST /api/workflows/:id/runs
GET /api/workflow-runs/:runId
```

提交请求：

```js
{
  originImageId: string
}
```

仅允许执行状态为 `PUBLISHED` 且校验通过的工作流。

执行权限沿用普通 AI 生图任务权限：

- 用户必须已登录、状态正常并绑定有效门店。
- 用户只能使用自己或所属门店有权访问的原图和资源。
- 每个生图节点按现有规则独立计算并扣除算力。
- 节点失败时沿用现有失败退款逻辑。

## 8. 执行数据流

执行器按拓扑顺序处理节点：

1. `START` 创建运行上下文。
2. `IMAGE_INPUT` 将请求中的 `originImageId` 写入当前图片。
3. 第一个生图节点以当前图片作为 Image A，调用现有 AI 任务服务。
4. 节点成功后，将其 `resultImageId` 写入当前图片。
5. 下一个生图节点自动使用新的当前图片作为 Image A。
6. `SAVE_OUTPUT` 将当前图片记为工作流最终输出。

节点参数转换为现有任务输入：

```js
{
  originImageId: currentImageId,
  featureKey: node.config.featureKey,
  selectedResourceId,
  selectedResourceSnapshot,
  templatePrompt,
  userPrompt: node.config.userPrompt,
  resolution: node.config.resolution,
  ratio: node.config.ratio,
  options: node.config.options
}
```

执行器直接调用提取后的共享 AI 任务提交服务，不通过内部 HTTP 请求调用 `/api/ai/tasks`。

## 9. 异步等待

现有 `submitAiTask` 提交后异步执行。工作流执行器需要可等待单个 AI 任务进入终态的服务接口。

实现方式：

- 将现有任务执行逻辑整理为可复用服务。
- 工作流节点提交任务后等待该任务变为 `succeeded` 或 `failed`。
- 使用有上限的状态轮询或任务完成 Promise，不无限等待。
- 超时按节点失败处理，记录明确失败阶段。

不得在工作流执行器中复制提示词、模型调用、图片保存、扣费或退款代码。

## 10. 持久化

新增运行表：

### `workflow_runs`

- `id`
- `workflow_template_id`
- `user_id`
- `merchant_id`
- `status`: `queued`、`running`、`succeeded`、`failed`
- `origin_image_id`
- `result_image_id`
- `current_node_id`
- `error_message`
- `started_at`
- `finished_at`
- `created_at`

### `workflow_run_nodes`

- `id`
- `workflow_run_id`
- `node_id`
- `node_type`
- `feature_key`
- `status`
- `input_image_id`
- `output_image_id`
- `ai_task_id`
- `error_message`
- `started_at`
- `finished_at`
- `sort_order`

工作流运行记录保存实际执行的节点顺序和 AI 任务 ID，便于任务详情、排错和审计。

## 11. 状态和失败处理

- 工作流提交后返回 `runId`。
- 运行状态依次为 `queued → running → succeeded|failed`。
- 节点状态依次为 `pending → running → succeeded|failed`。
- 任一真实生图节点失败后：
  - 当前节点记录失败原因。
  - 后续节点保持 `pending` 或标记 `skipped`。
  - 整个运行标记为 `failed`。
  - 不删除之前已经成功生成的图片和 AI 任务记录。
- 工作流执行失败不重复扣除已退款节点的算力。

## 12. 前端运行入口

本期在工作流编辑器增加“测试运行”：

- 仅已保存且已发布工作流可运行。
- 管理员选择一张有权限访问的原图。
- 提交后展示运行 ID、整体状态和逐节点状态。
- 成功后展示最终图片并允许进入已有任务详情或资源详情。
- 失败时定位到失败节点并展示后端错误信息。

普通用户使用工作流的产品入口不在本期实现。

## 13. API 和服务边界

建议拆分：

- `workflowExecutionService`：校验、拓扑排序、运行状态推进。
- `workflowRunStore`：运行和节点记录持久化。
- `aiTaskService`：现有单次生图任务提交和执行。
- `workflowNodeAdapter`：把节点配置转换为现有 AI 任务参数。

工作流模块只负责编排，不负责模型细节。

## 14. 测试和验收

自动测试：

- 新建工作流节点和连线均为空。
- 节点库准确包含 3 个基础节点和 9 个真实生图节点。
- 9 个节点与 `featureKey` 一一对应。
- 旧视频节点被校验拒绝。
- 图结构只接受严格串行链路。
- 拓扑排序稳定。
- 第二个生图节点收到第一个节点的 `resultImageId`。
- 节点配置正确转换为 AI 任务参数。
- 节点失败后不会执行后续节点。
- 运行和节点状态正确持久化。
- 未发布工作流、无权限图片和余额不足均被拒绝。

浏览器验收：

1. 点击“新建工作流”进入空白画布。
2. 左侧展示 12 个真实节点，不再展示视频演示节点。
3. 拖入并连接 `START → IMAGE_INPUT → 摄影增强 → 产品主图 → SAVE_OUTPUT`。
4. 配置两个真实生图节点并保存。
5. 校验和发布成功。
6. 选择原图执行测试运行。
7. 第二个节点自动使用第一个节点结果。
8. 最终结果可见，运行详情包含两个 AI 任务 ID。
9. 页面无新增控制台错误。

## 15. 完成标准

只有同时满足以下条件才算完成：

- 新建画布为空。
- 节点名称和配置对应真实 9 个生图能力。
- 工作流能够在后端真实执行。
- 串联节点能传递上一节点结果。
- 执行复用现有 AI 任务逻辑而非复制实现。
- 自动测试、构建和浏览器验收通过。
