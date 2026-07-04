# 前端长期维护规范

## 目标

本项目按“页面负责组装、组件负责展示、Hook 负责状态、API 负责请求、Model 负责规则、Shared 负责复用”的方式维护。后续新增功能不得继续把所有逻辑塞进单个页面文件。

## 目录分层

```text
src/
  features/        业务功能模块，例如 workbench、resources、users
  shared/          跨业务复用能力，例如 api、ui、effects、hooks
  store/           旧业务页面目录，后续逐步迁移到 features
  components/      旧通用组件目录，后续逐步迁移到 shared/ui
  styles/          全局样式入口和旧样式，后续新样式优先按 feature 拆分
```

## 新功能目录规范

```text
features/<feature>/
  <Feature>Page.jsx       页面组合层，不写复杂业务细节
  components/             当前功能内的展示组件
  hooks/                  当前功能内的状态、请求和行为编排
  api/                    当前功能内的接口封装
  model/                  常量、枚举、字段映射、格式化函数
  styles/                 当前功能内样式
  modals/                 当前功能内弹窗
```

## 页面文件规则

- 页面文件只负责组合布局。
- 单个页面文件建议控制在 300 行以内。
- 不在页面里直接堆大量 `useState`、`useEffect`、接口请求、弹窗 JSX。
- 弹窗统一收口到 `modals` 或 `<Feature>Modals.jsx`。
- 复杂列表、分页、上传、筛选必须拆成组件或 hook。
- 页面层不要直接 import 大量零散文件，必须优先从当前 feature 的分组出口导入，例如 `features/workbench/components/index.jsx`、`features/workbench/hooks/index.js`、`features/workbench/model/index.js`、`features/workbench/api/index.js`。

## API 规则

- 新代码统一从 `shared/api/http.js` 调用接口。
- 功能模块自己的接口放到 `features/<feature>/api`。
- 页面组件不直接拼接口地址。
- 接口协议、权限逻辑、登录逻辑变更必须单独处理，不要和 UI 重构混在一起。

## 样式规则

- 新功能不要新增 `final-fixes.css`、`legacy-fixes.css`、`round2-fixes.css` 这类补丁文件。
- 新样式优先放到当前 feature 的 `styles` 目录，通用样式放到 `shared` 或 `styles/components`。
- 避免大量使用 `!important`。如果必须使用，说明当前样式层级需要整理。
- 动效只作为氛围和反馈，不要干扰后台核心操作。

## 迁移策略

1. 先建立 `features` 和 `shared` 边界。
2. 再把旧 `store/*` 页面逐步拆到 `features/*`。
3. 每次只迁移一个功能模块，迁移后必须运行 `npm run build`。
4. 保持旧路径可用，避免一次性大迁移导致路由和业务中断。
5. 拆分后必须建立分组聚合层，避免页面直接依赖所有零散文件。

## 调用层级规则

推荐调用层级如下：

```text
App / StorePages
  -> features/<feature>/<Feature>Feature.jsx
    -> features/<feature>/components/index.jsx
    -> features/<feature>/hooks/index.js
    -> features/<feature>/model/index.js
    -> features/<feature>/api/index.js
      -> 具体组件 / hook / model / api 文件
```

不推荐：

```text
页面文件直接 import 20 个具体组件、8 个 hook、5 个 model 文件
```

推荐：

```text
页面文件从 components / hooks / model / api 的 index 统一导入
```

## 当前迁移状态

- `shared/api/http.js` 已建立。
- `shared/effects` 已建立，承接 React Bits 风格轻量动效组件。
- `features/resources` 已建立入口层和 API 层。
- `features/workbench` 已建立入口层和 API 层。
- 旧的 `store/resources/StoreResources.jsx` 与 `store/workbench/Workbench.jsx` 后续应继续拆分。
