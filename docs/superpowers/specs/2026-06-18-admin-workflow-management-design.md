# 管理员工作流管理前端设计

## 1. 目标与本期范围

本期在家具 AI 项目的平台管理员后台新增“工作流管理”，用于创建和维护后续视频模板可绑定的可视化工作流模板。

本期只实现完整、可操作、可持久化演示的前端效果：

- 工作流列表、新建、编辑、复制、发布、停用、删除。
- 固定节点库、节点拖拽、连线、删除、参数配置。
- 前端工作流校验、JSON 预览、草稿和发布版本快照。
- 使用浏览器 `localStorage` 保存模拟数据。
- 建立与未来后端接口一致的前端仓储和数据契约。

本期不实现：

- MySQL 表和真实管理员工作流 API。
- 视频模板数据库及真实绑定接口。
- 调用图片分析、视频模型、后处理和存储服务的执行引擎。
- 用户自定义工作流、自定义代码节点、条件分支和循环节点。

后续阶段将用真实 API 替换本地仓储，并按本设计中的版本快照执行工作流。

## 2. 已确认的产品决策

- 仅 `SYSTEM_ADMIN` 可以访问工作流管理。
- 编辑器采用已选定的“平衡三栏”桌面布局。
- 视觉风格沿用现有后台的深色黑金体系。
- 工作流画布采用 `@xyflow/react`。
- 工作流页面使用真实路径 URL，同时保留现有哈希页面。
- 本期发布操作在前端生成不可变版本快照。
- 用户前台未来只选择视频模板，不直接看到或编辑工作流。

## 3. 页面与路由

新增真实路径：

- `/admin/workflows`
- `/admin/workflows/create`
- `/admin/workflows/:id/edit`

现有 `#/dashboard`、`#/resources` 等哈希页面继续工作，不整体迁移到 React Router。

在 `App.jsx` 增加轻量路径解析：

1. 先识别 `window.location.pathname` 是否匹配工作流页面。
2. 工作流路径命中时进入管理员工作流模块。
3. 其他路径继续使用当前哈希路由。
4. 未登录用户显示登录页。
5. 已登录但不是 `SYSTEM_ADMIN` 的用户跳回现有工作台或显示无权限状态。

后台导航中的“管理”分组新增“工作流管理”。点击后使用 History API 跳转到 `/admin/workflows`。

## 4. 工作流列表页

### 4.1 页面结构

列表页保持现有后台页面布局：

- 顶部后台导航。
- 页面标题、工作流数量和“新建工作流”按钮。
- 搜索和筛选工具栏。
- 数据表格。
- 分页或前端分页区域。

### 4.2 展示字段

- 名称
- code
- 类型
- 场景
- 状态
- 版本
- 创建时间
- 更新时间
- 操作

### 4.3 筛选条件

- 关键词：匹配名称、code、描述和场景。
- 状态：全部、草稿、已发布、已停用。
- 类型：全部、图片、视频、混合。

### 4.4 操作

- 新建：进入 `/admin/workflows/create`。
- 编辑：进入 `/admin/workflows/:id/edit`。
- 复制：创建新的草稿，名称增加“副本”，code 生成不冲突的后缀。
- 发布：先校验，通过后生成新版本快照。
- 停用：把模板状态改为 `DISABLED`，不删除历史版本。
- 删除：二次确认；前端演示阶段允许删除任意模板。

为避免误导，列表页明确显示“本地演示数据”提示。

## 5. 工作流编辑页

### 5.1 整体布局

编辑页使用已选定的“平衡三栏”布局：

- 顶部操作栏。
- 左侧约 240px 节点库。
- 中间自适应画布。
- 右侧约 340px 节点配置面板。

桌面端优先。窄屏时左右面板改为抽屉，画布保留最小可用宽度；本功能不以手机端复杂编辑为主要使用场景。

### 5.2 顶部操作栏

展示：

- 返回
- 工作流名称
- 状态
- 当前版本
- 节点数和连线数
- 预览 JSON
- 校验
- 保存草稿
- 发布

新建工作流第一次保存后生成 ID，并将 URL 替换为 `/admin/workflows/:id/edit`。

### 5.3 工作流基本信息

编辑页顶部或右侧“工作流设置”区域维护：

- 名称
- code
- 描述
- 类型：`IMAGE`、`VIDEO`、`MIXED`
- 场景

code 只允许大写字母、数字和下划线，并在本地仓储中保持唯一。

### 5.4 左侧节点库

固定节点类型：

1. `START`
2. `IMAGE_INPUT`
3. `IMAGE_ANALYSIS`
4. `VIDEO_PLAN`
5. `PROMPT_GENERATE`
6. `VIDEO_GENERATE`
7. `POST_PROCESS`
8. `SAVE_OUTPUT`

节点按“输入”“AI 处理”“视频”“输出”分组。节点项展示图标、中文名称和简短说明，可拖入画布。

第一版不提供自定义节点入口。

### 5.5 中间画布

使用 `@xyflow/react` 提供：

- 拖放创建节点。
- 拖动节点位置。
- 节点间连线。
- 删除节点和连线。
- 单击节点选中并打开右侧配置。
- 画布缩放、平移、适配视图。
- 小地图、缩放控制和点状背景。
- 选中节点高亮。
- 校验错误节点显示红色状态标记。

新建视频工作流默认生成一条完整示例链路，管理员可以继续调整：

`START → IMAGE_INPUT → IMAGE_ANALYSIS → VIDEO_PLAN → PROMPT_GENERATE → VIDEO_GENERATE → POST_PROCESS → SAVE_OUTPUT`

### 5.6 右侧配置面板

未选择节点时显示工作流基本信息和校验摘要。

选择节点时显示通用字段：

- 节点名称
- 节点说明

不同节点的业务配置如下。

#### IMAGE_ANALYSIS

- 模型
- 提示词模板
- 失败重试次数
- 输出格式

#### VIDEO_PLAN

- 视频用途
- 默认时长
- 默认比例
- 是否允许用户修改

#### PROMPT_GENERATE

- 提示词语言
- 提示词模板
- 是否加入安全限制

#### VIDEO_GENERATE

- 视频模型
- 输入图片来源
- 时长
- 比例
- 分辨率
- 失败重试次数
- 扣费规则

#### POST_PROCESS

- 是否加字幕
- 是否加水印
- 是否生成封面
- 是否压缩
- 是否裁剪比例

#### SAVE_OUTPUT

- 是否保存资源库
- 是否保存历史任务
- 是否允许发布商品
- 是否生成下载链接

`START` 和 `IMAGE_INPUT` 只提供必要的名称、说明及输入来源配置，不增加用户未要求的复杂参数。

## 6. 前端数据模型

### 6.1 WorkflowTemplate

```js
{
  id: string,
  name: string,
  code: string,
  description: string,
  type: 'IMAGE' | 'VIDEO' | 'MIXED',
  scene: string,
  status: 'DRAFT' | 'PUBLISHED' | 'DISABLED',
  version: number,
  canvasJson: {
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    viewport: { x: number, y: number, zoom: number }
  },
  configJson: {
    schemaVersion: 1,
    executionMode: 'SEQUENTIAL',
    entryNodeId: string | null
  },
  versions: WorkflowTemplateVersion[],
  createdBy: string,
  updatedBy: string,
  createdAt: string,
  updatedAt: string
}
```

### 6.2 WorkflowNode

```js
{
  id: string,
  type: string,
  position: { x: number, y: number },
  data: {
    nodeType: string,
    label: string,
    description: string,
    config: object
  }
}
```

### 6.3 WorkflowTemplateVersion

```js
{
  id: string,
  workflowTemplateId: string,
  version: number,
  status: 'PUBLISHED' | 'ARCHIVED',
  canvasJson: object,
  configJson: object,
  createdBy: string,
  createdAt: string
}
```

版本快照必须做深拷贝，不引用当前草稿对象。

## 7. 本地仓储与未来 API 契约

前端通过 `workflowRepository` 访问数据，不允许页面组件直接操作 `localStorage`。

本地实现提供：

- `list(params)`
- `create(payload)`
- `get(id)`
- `update(id, payload)`
- `validate(id | workflow)`
- `publish(id)`
- `disable(id)`
- `duplicate(id)`
- `remove(id)`

本地存储键使用带版本的命名，例如：

```text
furniture-ai:admin-workflows:v1
```

未来后端适配器映射到：

- `GET /api/admin/workflows`
- `POST /api/admin/workflows`
- `GET /api/admin/workflows/:id`
- `PUT /api/admin/workflows/:id`
- `POST /api/admin/workflows/:id/validate`
- `POST /api/admin/workflows/:id/publish`
- `POST /api/admin/workflows/:id/disable`
- `POST /api/admin/workflows/:id/duplicate`
- `DELETE /api/admin/workflows/:id`

页面和编辑器不依赖具体存储实现，后续切换真实 API 时保持调用接口不变。

## 8. 校验规则

校验器返回统一结构：

```js
{
  valid: boolean,
  errors: [
    {
      code: string,
      message: string,
      nodeId: string | null,
      field: string | null
    }
  ]
}
```

规则：

1. 必须有且只有一个 `START`。
2. `VIDEO` 类型必须包含 `VIDEO_GENERATE`。
3. 必须包含 `SAVE_OUTPUT`。
4. 不允许孤立节点。
5. 所有节点必须能从 `START` 访问。
6. 不允许循环连线。
7. 必填配置不能为空。
8. 已发布版本不能被覆盖；重新发布生成新版本。

补充约束：

- 不允许同一条边重复创建。
- 不允许节点连接自己。
- 发布前必须先执行同一套校验。
- 校验错误同时出现在顶部摘要、错误列表和对应节点状态上。

## 9. 发布与版本行为

### 保存草稿

- 更新当前可编辑模板。
- 不增加版本号。
- 已发布模板保存后进入新的待发布草稿状态，但保留已发布版本。

### 发布

1. 执行完整校验。
2. 校验失败时阻止发布并展示问题。
3. 将上一个 `PUBLISHED` 版本标记为 `ARCHIVED`。
4. 当前最大版本号加一。
5. 深拷贝 `canvasJson` 和 `configJson` 生成新版本。
6. 模板状态变为 `PUBLISHED`。

### 停用

- 模板状态变为 `DISABLED`。
- 已发布版本快照保留，便于后续任务审计。

## 10. JSON 预览

“预览 JSON”打开只读模态框，展示未来执行引擎读取的数据：

```js
{
  template: {
    id,
    code,
    name,
    type,
    scene,
    version
  },
  graph: {
    nodes,
    edges
  },
  execution: {
    schemaVersion: 1,
    entryNodeId,
    mode: 'SEQUENTIAL'
  }
}
```

预览支持复制 JSON。前端不允许直接在 JSON 模态框修改工作流。

## 11. 未来视频模板绑定

本期不新增真实视频模板管理页，但数据契约预留：

```js
{
  workflowTemplateId: string,
  workflowTemplateVersionId: string
}
```

未来视频模板只能绑定已发布的工作流版本。用户选择视频模板时，执行任务必须锁定 `workflowTemplateVersionId`，不能读取当前草稿或后续发布版本。

## 12. 未来执行引擎边界

后续执行引擎读取不可变版本快照，按照从 `START` 生成的拓扑顺序执行：

1. 图片输入
2. 图片分析
3. 视频方案规划
4. 提示词生成
5. 图生视频
6. 视频后处理
7. 保存结果

每个节点执行器将拥有独立输入、输出、重试和错误状态。扣费应在真实后端事务中完成，前端配置只描述规则，不负责实际扣费。

## 13. 错误处理

- 本地仓储读到损坏 JSON 时保留原值并回退到示例数据，同时提示数据异常。
- 保存失败时不改变页面已保存状态。
- 离开存在未保存改动的编辑页时提示确认。
- 删除、停用和发布均需要明确确认。
- localStorage 满或不可用时展示错误，不假装保存成功。
- 发布失败不修改状态和版本。

## 14. 视觉与交互规范

- 沿用 `variables.css` 中的黑色背景、金色主色和现有圆角体系。
- 顶部导航继续复用当前后台。
- 画布为深色点阵背景，连接线使用金色或状态色。
- 左右面板使用轻量分隔，不堆叠多层卡片。
- 表单正文保持 14–16px，节点标题和操作层级清晰。
- 图标继续使用项目现有 `lucide-react`，不引入第二套图标系统。
- 所有操作按钮提供 hover、focus、disabled 和 loading 状态。

## 15. 文件边界

计划新增或调整以下职责单一的模块：

- 路径解析和工作流页面入口。
- 工作流列表页面。
- 工作流编辑器页面。
- 节点库。
- 自定义工作流节点。
- 节点配置面板。
- JSON 预览和校验结果模态框。
- 节点定义和默认配置。
- 工作流校验器。
- JSON 序列化与发布版本逻辑。
- 本地仓储。
- 工作流专用样式。
- 单元测试和浏览器验收。

具体文件名和改动顺序在实施计划中确定。

## 16. 测试与验收

### 自动测试

- 路径解析能识别三个工作流路径且不破坏旧哈希路由。
- 非管理员不能进入工作流页面。
- 本地仓储 CRUD、搜索、筛选和复制行为正确。
- 发布生成独立版本快照，重新发布版本递增。
- 八条工作流规则分别有失败和成功用例。
- 环检测、可达性检查和孤立节点检查覆盖典型边界。
- JSON 导出结构稳定且可序列化。

### 构建验证

- 前端测试全部通过。
- `npm --prefix frontend run build` 成功。
- 不出现新增控制台错误。

### 浏览器验收

- 管理员可从导航进入列表页。
- 新建工作流后进入真实 URL。
- 节点可从左侧拖入画布。
- 节点可连线、移动和删除。
- 点击节点后右侧表单正确切换。
- 保存后刷新页面数据仍存在。
- 校验问题能定位到节点。
- 发布生成新版本。
- 列表中的复制、停用和删除有效。
- JSON 预览内容与画布一致。
- 1440px 桌面布局与选定“平衡三栏”设计一致。

## 17. 后续阶段

第二阶段：

- 新增 `workflow_templates` 和 `workflow_template_versions`。
- 实现真实管理员 API。
- 增加视频模板管理和已发布版本绑定。
- 将 `workflowRepository` 切换为 API 实现。

第三阶段：

- 实现节点执行器和工作流任务状态。
- 接入图片分析、视频规划、提示词、视频模型、后处理和资源保存。
- 实现真实重试、扣费、退款、日志和审计。
