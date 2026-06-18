# Admin Workflow Management Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the administrator-only workflow list and visual workflow editor as a fully interactive frontend prototype backed by versioned `localStorage` data.

**Architecture:** Keep the existing hash-routed application intact and add a small pathname router for `/admin/workflows`, `/admin/workflows/create`, and `/admin/workflows/:id/edit`. Put all workflow behavior behind pure domain modules and a repository interface so pages never access `localStorage` directly and a later backend adapter can replace it. Use `@xyflow/react` for the canvas, custom nodes, connections, viewport controls, and minimap.

**Tech Stack:** React 18, Vite 5, `@xyflow/react` 12.11.0, Lucide React, browser `localStorage`, Node test runner.

**Design reference:** `docs/superpowers/specs/2026-06-18-admin-workflow-management-design.md` and the selected “平衡三栏” ImageGen direction from this thread.

---

## File Map

### New domain and data files

- `frontend/src/admin/workflows/workflowRoute.js` — parses and builds real workflow URLs.
- `frontend/src/admin/workflows/workflowDefinitions.js` — fixed node definitions, defaults, labels, required fields, and sample graph.
- `frontend/src/admin/workflows/workflowValidation.js` — pure graph and configuration validation.
- `frontend/src/admin/workflows/workflowSerialization.js` — deep clone, execution JSON, and immutable published-version snapshots.
- `frontend/src/admin/workflows/workflowRepository.js` — repository contract and versioned `localStorage` implementation.
- `frontend/src/admin/workflows/workflowRoute.test.mjs`
- `frontend/src/admin/workflows/workflowDefinitions.test.mjs`
- `frontend/src/admin/workflows/workflowValidation.test.mjs`
- `frontend/src/admin/workflows/workflowSerialization.test.mjs`
- `frontend/src/admin/workflows/workflowRepository.test.mjs`

### New UI files

- `frontend/src/admin/workflows/WorkflowAdminApp.jsx` — pathname-level workflow module shell and admin gate.
- `frontend/src/admin/workflows/WorkflowListPage.jsx` — search, filters, table, actions, and confirmations.
- `frontend/src/admin/workflows/WorkflowEditorPage.jsx` — editor state, save, validate, publish, dirty guard, and modal orchestration.
- `frontend/src/admin/workflows/WorkflowCanvas.jsx` — React Flow canvas and drag/drop integration.
- `frontend/src/admin/workflows/WorkflowNode.jsx` — custom workflow node rendering.
- `frontend/src/admin/workflows/NodeLibrary.jsx` — grouped draggable node library.
- `frontend/src/admin/workflows/NodeConfigPanel.jsx` — metadata and type-specific configuration forms.
- `frontend/src/admin/workflows/WorkflowJsonModal.jsx` — read-only execution JSON preview and copy action.
- `frontend/src/admin/workflows/WorkflowValidationModal.jsx` — validation summary and node focus action.
- `frontend/src/admin/workflows/workflowUiContract.test.mjs` — static integration assertions for routing, controls, and fixed node coverage.
- `frontend/src/styles/pages/admin-workflows.css` — list/editor/canvas/responsive styling.

### Existing files to modify

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/App.jsx`
- `frontend/src/AppShell.jsx`
- `frontend/src/config/pageRegistry.jsx`
- `frontend/src/styles/index.css`
- `.gitignore`

---

### Task 1: Add the React Flow dependency and test command

**Files:**

- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Test: existing `frontend/src/**/*.test.mjs`

- [ ] **Step 1: Record the current test baseline**

Run:

```powershell
npm --prefix frontend exec -- node --test
```

Expected: existing frontend tests pass before dependency changes.

- [ ] **Step 2: Add an explicit frontend test script**

Change `frontend/package.json` scripts to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test"
  }
}
```

- [ ] **Step 3: Install the official React Flow package**

Run:

```powershell
npm --prefix frontend install @xyflow/react@12.11.0
```

Expected: `frontend/package.json` and `frontend/package-lock.json` contain `@xyflow/react` version `12.11.0`.

- [ ] **Step 4: Verify the package and baseline**

Run:

```powershell
npm --prefix frontend run test
npm --prefix frontend ls @xyflow/react
```

Expected: tests pass and npm reports `@xyflow/react@12.11.0`.

- [ ] **Step 5: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json
git commit -m "build: add React Flow for workflow editor"
```

---

### Task 2: Implement real-path workflow routing as a pure module

**Files:**

- Create: `frontend/src/admin/workflows/workflowRoute.js`
- Create: `frontend/src/admin/workflows/workflowRoute.test.mjs`

- [ ] **Step 1: Write the failing route tests**

Create `workflowRoute.test.mjs`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWorkflowPath,
  parseWorkflowPath
} from './workflowRoute.js';

describe('workflow pathname routing', () => {
  it('recognizes list, create, and edit routes', () => {
    assert.deepEqual(parseWorkflowPath('/admin/workflows'), { name: 'list', id: null });
    assert.deepEqual(parseWorkflowPath('/admin/workflows/'), { name: 'list', id: null });
    assert.deepEqual(parseWorkflowPath('/admin/workflows/create'), { name: 'create', id: null });
    assert.deepEqual(
      parseWorkflowPath('/admin/workflows/wf-123/edit'),
      { name: 'edit', id: 'wf-123' }
    );
  });

  it('rejects unrelated and malformed paths', () => {
    assert.equal(parseWorkflowPath('/'), null);
    assert.equal(parseWorkflowPath('/admin/workflows/wf-123'), null);
    assert.equal(parseWorkflowPath('/admin/merchants'), null);
  });

  it('builds encoded workflow paths', () => {
    assert.equal(buildWorkflowPath('list'), '/admin/workflows');
    assert.equal(buildWorkflowPath('create'), '/admin/workflows/create');
    assert.equal(buildWorkflowPath('edit', 'wf / 1'), '/admin/workflows/wf%20%2F%201/edit');
  });
});
```

- [ ] **Step 2: Run the route test and confirm RED**

Run:

```powershell
node --test frontend/src/admin/workflows/workflowRoute.test.mjs
```

Expected: FAIL because `workflowRoute.js` does not exist.

- [ ] **Step 3: Implement the route parser and builder**

Create `workflowRoute.js`:

```js
export function parseWorkflowPath(pathname = '/') {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/admin/workflows') return { name: 'list', id: null };
  if (path === '/admin/workflows/create') return { name: 'create', id: null };
  const match = path.match(/^\/admin\/workflows\/([^/]+)\/edit$/);
  if (!match) return null;
  return { name: 'edit', id: decodeURIComponent(match[1]) };
}

export function buildWorkflowPath(name, id = null) {
  if (name === 'list') return '/admin/workflows';
  if (name === 'create') return '/admin/workflows/create';
  if (name === 'edit' && id) {
    return `/admin/workflows/${encodeURIComponent(id)}/edit`;
  }
  throw new Error('不支持的工作流路由');
}

export function navigateWorkflow(name, id = null, { replace = false } = {}) {
  const path = buildWorkflowPath(name, id);
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
node --test frontend/src/admin/workflows/workflowRoute.test.mjs
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/admin/workflows/workflowRoute.js frontend/src/admin/workflows/workflowRoute.test.mjs
git commit -m "feat: add admin workflow pathname routing"
```

---

### Task 3: Define fixed node types, defaults, and the sample video graph

**Files:**

- Create: `frontend/src/admin/workflows/workflowDefinitions.js`
- Create: `frontend/src/admin/workflows/workflowDefinitions.test.mjs`

- [ ] **Step 1: Write failing definition tests**

Create `workflowDefinitions.test.mjs`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FIXED_NODE_TYPES,
  NODE_DEFINITIONS,
  createDefaultWorkflow,
  createNode
} from './workflowDefinitions.js';

describe('workflow definitions', () => {
  it('exposes exactly the eight approved node types', () => {
    assert.deepEqual(FIXED_NODE_TYPES, [
      'START',
      'IMAGE_INPUT',
      'IMAGE_ANALYSIS',
      'VIDEO_PLAN',
      'PROMPT_GENERATE',
      'VIDEO_GENERATE',
      'POST_PROCESS',
      'SAVE_OUTPUT'
    ]);
    assert.equal(Object.keys(NODE_DEFINITIONS).length, 8);
  });

  it('creates an eight-node sequential default video workflow', () => {
    const workflow = createDefaultWorkflow({ id: 'wf-1', now: '2026-06-18T00:00:00.000Z' });
    assert.equal(workflow.type, 'VIDEO');
    assert.equal(workflow.canvasJson.nodes.length, 8);
    assert.equal(workflow.canvasJson.edges.length, 7);
    assert.equal(workflow.canvasJson.nodes[0].data.nodeType, 'START');
    assert.equal(workflow.canvasJson.nodes.at(-1).data.nodeType, 'SAVE_OUTPUT');
  });

  it('creates independent config objects for nodes', () => {
    const first = createNode('VIDEO_GENERATE', { id: 'a' });
    const second = createNode('VIDEO_GENERATE', { id: 'b' });
    first.data.config.duration = 99;
    assert.notEqual(second.data.config.duration, 99);
  });
});
```

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test frontend/src/admin/workflows/workflowDefinitions.test.mjs
```

Expected: FAIL because `workflowDefinitions.js` is missing.

- [ ] **Step 3: Implement definitions and defaults**

Create `workflowDefinitions.js` with these public constants and factories:

```js
export const FIXED_NODE_TYPES = [
  'START',
  'IMAGE_INPUT',
  'IMAGE_ANALYSIS',
  'VIDEO_PLAN',
  'PROMPT_GENERATE',
  'VIDEO_GENERATE',
  'POST_PROCESS',
  'SAVE_OUTPUT'
];

export const NODE_DEFINITIONS = {
  START: {
    label: '开始',
    group: '输入',
    description: '工作流唯一入口',
    color: '#61d68e',
    defaults: {}
  },
  IMAGE_INPUT: {
    label: '图片输入',
    group: '输入',
    description: '接收用户上传的家具图片',
    color: '#64b5ff',
    defaults: { source: 'USER_UPLOAD' }
  },
  IMAGE_ANALYSIS: {
    label: '图片分析',
    group: 'AI 处理',
    description: '分析主体、材质、场景和构图',
    color: '#b894ff',
    defaults: {
      model: 'vision-analysis-model',
      promptTemplate: '分析家具主体、材质、空间关系、镜头条件和可用于视频生成的视觉特征。',
      retries: 1,
      outputFormat: 'JSON'
    }
  },
  VIDEO_PLAN: {
    label: '视频方案规划',
    group: 'AI 处理',
    description: '生成镜头和节奏方案',
    color: '#f0d68a',
    defaults: {
      purpose: 'PRODUCT_DISPLAY',
      defaultDuration: 10,
      defaultRatio: '16:9',
      userEditable: true
    }
  },
  PROMPT_GENERATE: {
    label: '提示词生成',
    group: 'AI 处理',
    description: '生成图生视频提示词',
    color: '#f0a8d2',
    defaults: {
      language: 'zh-CN',
      promptTemplate: '根据图片分析和视频方案生成稳定、真实、适合家具展示的视频提示词。',
      safetyEnabled: true
    }
  },
  VIDEO_GENERATE: {
    label: '图生视频',
    group: '视频',
    description: '调用视频模型生成视频',
    color: '#ffad66',
    defaults: {
      model: 'video-generation-model',
      imageSource: 'IMAGE_INPUT',
      duration: 10,
      ratio: '16:9',
      resolution: '1080P',
      retries: 1,
      billingRule: 'CHARGE_ON_SUCCESS'
    }
  },
  POST_PROCESS: {
    label: '视频后处理',
    group: '视频',
    description: '字幕、水印、封面和压缩',
    color: '#68d7d0',
    defaults: {
      subtitles: false,
      watermark: true,
      cover: true,
      compress: true,
      cropRatio: false
    }
  },
  SAVE_OUTPUT: {
    label: '保存结果',
    group: '输出',
    description: '保存视频和任务结果',
    color: '#7ddc84',
    defaults: {
      saveToLibrary: true,
      saveToHistory: true,
      allowProductPublish: false,
      createDownloadLink: true
    }
  }
};
```

Also implement:

```js
const clone = value => JSON.parse(JSON.stringify(value));

export function createNode(nodeType, {
  id = crypto.randomUUID(),
  position = { x: 0, y: 0 }
} = {}) {
  const definition = NODE_DEFINITIONS[nodeType];
  if (!definition) throw new Error(`不支持的节点类型：${nodeType}`);
  return {
    id,
    type: 'workflowNode',
    position,
    data: {
      nodeType,
      label: definition.label,
      description: definition.description,
      config: clone(definition.defaults),
      validationErrors: []
    }
  };
}
```

Implement `createDefaultWorkflow({ id = crypto.randomUUID(), now = new Date().toISOString() } = {})` with:

- name: `商品展示视频工作流`
- code: `PRODUCT_VIDEO_WORKFLOW`
- type: `VIDEO`
- scene: `商品展示`
- status: `DRAFT`
- version: `0`
- eight nodes spaced horizontally at `x = 80 + index * 250`, `y = index % 2 ? 240 : 100`
- seven edges with IDs `edge-${source}-${target}`, `type: 'smoothstep'`
- `configJson.schemaVersion = 1`
- `configJson.executionMode = 'SEQUENTIAL'`
- `configJson.entryNodeId` set to the START node ID
- empty `versions`

- [ ] **Step 4: Verify GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowDefinitions.test.mjs
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/admin/workflows/workflowDefinitions.js frontend/src/admin/workflows/workflowDefinitions.test.mjs
git commit -m "feat: define fixed workflow nodes and defaults"
```

---

### Task 4: Implement all graph and required-field validation rules

**Files:**

- Create: `frontend/src/admin/workflows/workflowValidation.js`
- Create: `frontend/src/admin/workflows/workflowValidation.test.mjs`

- [ ] **Step 1: Write failing validator tests**

Create tests that import `createDefaultWorkflow` and `validateWorkflow`, then cover:

```js
it('accepts the default video workflow', () => {
  assert.equal(validateWorkflow(createDefaultWorkflow()).valid, true);
});

it('requires exactly one START node', () => {
  const workflow = createDefaultWorkflow();
  workflow.canvasJson.nodes = workflow.canvasJson.nodes.filter(
    node => node.data.nodeType !== 'START'
  );
  assert.ok(validateWorkflow(workflow).errors.some(error => error.code === 'START_COUNT'));
});

it('requires VIDEO_GENERATE for VIDEO workflows', () => {
  const workflow = createDefaultWorkflow();
  workflow.canvasJson.nodes = workflow.canvasJson.nodes.filter(
    node => node.data.nodeType !== 'VIDEO_GENERATE'
  );
  assert.ok(validateWorkflow(workflow).errors.some(error => error.code === 'VIDEO_GENERATE_REQUIRED'));
});

it('requires SAVE_OUTPUT', () => {
  const workflow = createDefaultWorkflow();
  workflow.canvasJson.nodes = workflow.canvasJson.nodes.filter(
    node => node.data.nodeType !== 'SAVE_OUTPUT'
  );
  assert.ok(validateWorkflow(workflow).errors.some(error => error.code === 'SAVE_OUTPUT_REQUIRED'));
});

it('rejects isolated and unreachable nodes', () => {
  const workflow = createDefaultWorkflow();
  const isolated = createNode('POST_PROCESS', { id: 'isolated', position: { x: 0, y: 400 } });
  workflow.canvasJson.nodes.push(isolated);
  const codes = validateWorkflow(workflow).errors.map(error => error.code);
  assert.ok(codes.includes('ISOLATED_NODE'));
  assert.ok(codes.includes('UNREACHABLE_NODE'));
});

it('rejects graph cycles and self-connections', () => {
  const workflow = createDefaultWorkflow();
  const first = workflow.canvasJson.nodes[0].id;
  const last = workflow.canvasJson.nodes.at(-1).id;
  workflow.canvasJson.edges.push({ id: 'cycle', source: last, target: first });
  assert.ok(validateWorkflow(workflow).errors.some(error => error.code === 'CYCLE_DETECTED'));
});

it('rejects duplicate edges', () => {
  const workflow = createDefaultWorkflow();
  workflow.canvasJson.edges.push({ ...workflow.canvasJson.edges[0], id: 'duplicate' });
  assert.ok(validateWorkflow(workflow).errors.some(error => error.code === 'DUPLICATE_EDGE'));
});

it('returns node and field information for missing required config', () => {
  const workflow = createDefaultWorkflow();
  const node = workflow.canvasJson.nodes.find(item => item.data.nodeType === 'VIDEO_GENERATE');
  node.data.config.model = '';
  const error = validateWorkflow(workflow).errors.find(item => item.code === 'REQUIRED_CONFIG');
  assert.equal(error.nodeId, node.id);
  assert.equal(error.field, 'model');
});
```

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test frontend/src/admin/workflows/workflowValidation.test.mjs
```

Expected: FAIL because `validateWorkflow` is missing.

- [ ] **Step 3: Implement the validator**

Create `workflowValidation.js` with:

```js
const REQUIRED_FIELDS = {
  IMAGE_INPUT: ['source'],
  IMAGE_ANALYSIS: ['model', 'promptTemplate', 'outputFormat'],
  VIDEO_PLAN: ['purpose', 'defaultDuration', 'defaultRatio'],
  PROMPT_GENERATE: ['language', 'promptTemplate'],
  VIDEO_GENERATE: [
    'model',
    'imageSource',
    'duration',
    'ratio',
    'resolution',
    'billingRule'
  ]
};

const isEmpty = value =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');
```

Implement `validateWorkflow(workflow)` as one pure pass that:

1. Counts START nodes.
2. Checks VIDEO_GENERATE for `type === 'VIDEO'`.
3. Checks SAVE_OUTPUT.
4. Builds incoming/outgoing adjacency maps for valid node IDs.
5. Reports a node as isolated when it has no incoming and no outgoing edge.
6. Runs DFS/BFS from START and reports each unvisited node.
7. Runs DFS color marking (`0`, `1`, `2`) to detect cycles.
8. Rejects `source === target`.
9. Rejects repeated `${source}->${target}` pairs.
10. Checks `REQUIRED_FIELDS` against `node.data.config`.

Return:

```js
return { valid: errors.length === 0, errors };
```

Use stable codes and Chinese messages:

- `START_COUNT`
- `VIDEO_GENERATE_REQUIRED`
- `SAVE_OUTPUT_REQUIRED`
- `ISOLATED_NODE`
- `UNREACHABLE_NODE`
- `CYCLE_DETECTED`
- `SELF_CONNECTION`
- `DUPLICATE_EDGE`
- `REQUIRED_CONFIG`

- [ ] **Step 4: Verify GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowValidation.test.mjs
```

Expected: all validator cases pass.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/admin/workflows/workflowValidation.js frontend/src/admin/workflows/workflowValidation.test.mjs
git commit -m "feat: validate workflow graphs and node configuration"
```

---

### Task 5: Implement immutable serialization and published versions

**Files:**

- Create: `frontend/src/admin/workflows/workflowSerialization.js`
- Create: `frontend/src/admin/workflows/workflowSerialization.test.mjs`

- [ ] **Step 1: Write failing serialization tests**

Test these behaviors:

```js
it('builds execution JSON without local repository fields', () => {
  const workflow = createDefaultWorkflow({ id: 'wf-1' });
  const json = buildExecutionJson(workflow);
  assert.equal(json.template.id, 'wf-1');
  assert.equal(json.execution.mode, 'SEQUENTIAL');
  assert.equal(json.graph.nodes.length, 8);
  assert.equal('versions' in json, false);
});

it('publishes version 1 without mutating the source graph', () => {
  const workflow = createDefaultWorkflow({ id: 'wf-1', now: '2026-06-18T00:00:00.000Z' });
  const published = createPublishedWorkflow(workflow, {
    userId: 'admin-1',
    now: '2026-06-18T01:00:00.000Z',
    versionId: 'version-1'
  });
  assert.equal(published.version, 1);
  assert.equal(published.versions[0].status, 'PUBLISHED');
  workflow.canvasJson.nodes[0].data.label = 'changed';
  assert.notEqual(published.versions[0].canvasJson.nodes[0].data.label, 'changed');
});

it('archives the previous version and increments on republish', () => {
  const once = createPublishedWorkflow(createDefaultWorkflow({ id: 'wf-1' }), {
    userId: 'admin-1',
    now: '2026-06-18T01:00:00.000Z',
    versionId: 'version-1'
  });
  const twice = createPublishedWorkflow(once, {
    userId: 'admin-1',
    now: '2026-06-18T02:00:00.000Z',
    versionId: 'version-2'
  });
  assert.equal(twice.version, 2);
  assert.equal(twice.versions[0].status, 'ARCHIVED');
  assert.equal(twice.versions[1].status, 'PUBLISHED');
});
```

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test frontend/src/admin/workflows/workflowSerialization.test.mjs
```

Expected: FAIL because the serialization module does not exist.

- [ ] **Step 3: Implement serialization**

Create:

```js
export const deepClone = value => JSON.parse(JSON.stringify(value));

export function buildExecutionJson(workflow) {
  return {
    template: {
      id: workflow.id,
      code: workflow.code,
      name: workflow.name,
      type: workflow.type,
      scene: workflow.scene,
      version: workflow.version
    },
    graph: deepClone(workflow.canvasJson),
    execution: {
      schemaVersion: workflow.configJson.schemaVersion,
      entryNodeId: workflow.configJson.entryNodeId,
      mode: workflow.configJson.executionMode
    }
  };
}

export function createPublishedWorkflow(workflow, {
  userId,
  now = new Date().toISOString(),
  versionId = crypto.randomUUID()
}) {
  const next = deepClone(workflow);
  const version = Math.max(
    Number(next.version || 0),
    ...next.versions.map(item => Number(item.version || 0))
  ) + 1;
  next.versions = next.versions.map(item => ({
    ...item,
    status: item.status === 'PUBLISHED' ? 'ARCHIVED' : item.status
  }));
  next.versions.push({
    id: versionId,
    workflowTemplateId: next.id,
    version,
    status: 'PUBLISHED',
    canvasJson: deepClone(next.canvasJson),
    configJson: deepClone(next.configJson),
    createdBy: userId,
    createdAt: now
  });
  next.version = version;
  next.status = 'PUBLISHED';
  next.updatedBy = userId;
  next.updatedAt = now;
  return next;
}
```

- [ ] **Step 4: Verify GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowSerialization.test.mjs
```

Expected: all serialization tests pass.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/admin/workflows/workflowSerialization.js frontend/src/admin/workflows/workflowSerialization.test.mjs
git commit -m "feat: serialize and version published workflows"
```

---

### Task 6: Implement the versioned local workflow repository

**Files:**

- Create: `frontend/src/admin/workflows/workflowRepository.js`
- Create: `frontend/src/admin/workflows/workflowRepository.test.mjs`

- [ ] **Step 1: Write failing repository tests**

Use an in-memory storage double:

```js
function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}
```

Cover:

- seed data appears only on first initialization;
- create/get/update;
- unique code rejection;
- list keyword/status/type filtering;
- duplicate creates a DRAFT with a unique code and no versions;
- publish validates before writing;
- publish does not mutate storage when invalid;
- disable preserves versions;
- remove deletes one workflow;
- malformed JSON falls back to seed data and returns a recoverable warning.

Representative test:

```js
it('publishes valid workflows and rejects invalid ones atomically', async () => {
  const repository = createWorkflowRepository({
    storage: createMemoryStorage(),
    now: () => '2026-06-18T00:00:00.000Z',
    id: (() => {
      let count = 0;
      return () => `id-${++count}`;
    })()
  });
  const created = await repository.create(createDefaultWorkflow({ id: 'wf-1' }));
  const published = await repository.publish(created.id, 'admin-1');
  assert.equal(published.version, 1);

  const invalid = await repository.create({
    ...createDefaultWorkflow({ id: 'wf-2' }),
    code: 'INVALID',
    canvasJson: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  });
  await assert.rejects(
    repository.publish(invalid.id, 'admin-1'),
    error => error.code === 'WORKFLOW_VALIDATION_FAILED'
  );
  assert.equal((await repository.get(invalid.id)).version, 0);
});
```

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test frontend/src/admin/workflows/workflowRepository.test.mjs
```

Expected: FAIL because the repository module is missing.

- [ ] **Step 3: Implement the repository**

Export:

```js
export const WORKFLOW_STORAGE_KEY = 'furniture-ai:admin-workflows:v1';

export function createWorkflowRepository({
  storage = window.localStorage,
  now = () => new Date().toISOString(),
  id = () => crypto.randomUUID()
} = {}) {
  // Return async list/create/get/update/validate/publish/disable/duplicate/remove methods.
}

export const workflowRepository = createWorkflowRepository();
```

Required method signatures:

```js
list({ keyword = '', status = '', type = '', page = 1, pageSize = 10 } = {})
create(payload, userId = 'local-admin')
get(workflowId)
update(workflowId, payload, userId = 'local-admin')
validate(workflowOrId)
publish(workflowId, userId = 'local-admin')
disable(workflowId, userId = 'local-admin')
duplicate(workflowId, userId = 'local-admin')
remove(workflowId)
```

Repository rules:

- Normalize code with `trim().toUpperCase()`.
- Require `/^[A-Z0-9_]+$/`.
- Reject duplicate codes with error code `WORKFLOW_CODE_EXISTS`.
- Persist one JSON object `{ schemaVersion: 1, items: [] }`.
- Deep clone data on read and write.
- Preserve the raw malformed storage value; do not overwrite it until a later successful mutation.
- Seed with one published valid video workflow and one draft workflow.
- Throw errors with stable `code` fields.

- [ ] **Step 4: Verify GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowRepository.test.mjs
```

Expected: repository test suite passes.

- [ ] **Step 5: Run all pure-domain tests**

```powershell
npm --prefix frontend run test
```

Expected: all existing and workflow tests pass.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/admin/workflows/workflowRepository.js frontend/src/admin/workflows/workflowRepository.test.mjs
git commit -m "feat: add local workflow repository"
```

---

### Task 7: Integrate the admin path shell and navigation

**Files:**

- Create: `frontend/src/admin/workflows/WorkflowAdminApp.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/AppShell.jsx`
- Modify: `frontend/src/config/pageRegistry.jsx`
- Create: `frontend/src/admin/workflows/workflowUiContract.test.mjs`

- [ ] **Step 1: Write failing UI contract tests**

The test should read source files and assert:

```js
assert.match(appSource, /parseWorkflowPath/);
assert.match(appSource, /WorkflowAdminApp/);
assert.match(appSource, /popstate/);
assert.match(registrySource, /workflows/);
assert.match(registrySource, /工作流管理/);
assert.match(shellSource, /navigateWorkflow\('list'\)/);
```

Also assert the workflow route is only rendered for `SYSTEM_ADMIN`.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
```

Expected: FAIL because workflow UI integration is absent.

- [ ] **Step 3: Create `WorkflowAdminApp.jsx`**

Implement:

```jsx
import React from 'react';
import WorkflowListPage from './WorkflowListPage.jsx';
import WorkflowEditorPage from './WorkflowEditorPage.jsx';
import { navigateWorkflow } from './workflowRoute.js';

export default function WorkflowAdminApp({ route, me, setMe }) {
  if (me?.role !== 'SYSTEM_ADMIN') {
    return <section className="workflowAccessDenied">
      <h1>无权访问工作流管理</h1>
      <button onClick={() => { window.location.href = '/#/workbench'; }}>返回工作台</button>
    </section>;
  }
  if (route.name === 'list') {
    return <WorkflowListPage me={me} onCreate={() => navigateWorkflow('create')} />;
  }
  return <WorkflowEditorPage
    key={route.id || 'create'}
    workflowId={route.id}
    mode={route.name}
    me={me}
    setMe={setMe}
    onBack={() => navigateWorkflow('list')}
  />;
}
```

The imports for list/editor may initially point to minimal components created in this task:

```jsx
export default function WorkflowListPage() {
  return <div className="workflowListPage">工作流列表</div>;
}
```

```jsx
export default function WorkflowEditorPage() {
  return <div className="workflowEditorPage">工作流编辑器</div>;
}
```

- [ ] **Step 4: Update `App.jsx`**

Add:

```jsx
import WorkflowAdminApp from './admin/workflows/WorkflowAdminApp.jsx';
import { parseWorkflowPath } from './admin/workflows/workflowRoute.js';
```

Track both routing systems:

```jsx
const currentWorkflowRoute = () => parseWorkflowPath(window.location.pathname);
const [workflowRoute, setWorkflowRoute] = useState(currentWorkflowRoute());

useEffect(() => {
  const onRouteChange = () => setWorkflowRoute(currentWorkflowRoute());
  window.addEventListener('popstate', onRouteChange);
  return () => window.removeEventListener('popstate', onRouteChange);
}, []);
```

Render in this order:

1. loading when auth check is active;
2. login when a workflow pathname is active but no user exists;
3. `WorkflowAdminApp` when a workflow pathname is active;
4. existing landing/hash application behavior.

- [ ] **Step 5: Add navigation entry**

In `pageRegistry.jsx`:

```jsx
import { Workflow } from 'lucide-react';
```

Add:

```jsx
['workflows', '工作流管理', Workflow]
```

to `adminPages`, and include `workflows` in the `manage` group.

In `AppShell.jsx`, import `navigateWorkflow`, and change `go(k)`:

```js
if (k === 'workflows') {
  navigateWorkflow('list');
  return;
}
```

- [ ] **Step 6: Verify GREEN and build**

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
npm --prefix frontend run build
```

Expected: contract test passes and Vite build exits 0.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/App.jsx frontend/src/AppShell.jsx frontend/src/config/pageRegistry.jsx frontend/src/admin/workflows/WorkflowAdminApp.jsx frontend/src/admin/workflows/WorkflowListPage.jsx frontend/src/admin/workflows/WorkflowEditorPage.jsx frontend/src/admin/workflows/workflowUiContract.test.mjs
git commit -m "feat: route administrators to workflow management"
```

---

### Task 8: Build the workflow list page against the repository

**Files:**

- Modify: `frontend/src/admin/workflows/WorkflowListPage.jsx`
- Reuse: `frontend/src/components/ConfirmDialog.jsx`
- Test: `frontend/src/admin/workflows/workflowUiContract.test.mjs`

- [ ] **Step 1: Extend the failing UI contract**

Assert `WorkflowListPage.jsx` contains:

- `workflowRepository.list`
- keyword input
- status select
- type select
- buttons/labels for 新建、编辑、复制、发布、停用、删除
- `ConfirmDialog`
- a “本地演示数据” notice

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
```

Expected: FAIL for missing list controls.

- [ ] **Step 3: Implement list state and loading**

Use:

```jsx
const [query, setQuery] = useState({
  keyword: '',
  status: '',
  type: '',
  page: 1,
  pageSize: 10
});
const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 10 });
const [loading, setLoading] = useState(true);
const [message, setMessage] = useState('');
const [confirmState, setConfirmState] = useState(null);
```

Load through `workflowRepository.list(query)` only.

- [ ] **Step 4: Implement actions**

Implement:

```js
async function duplicateWorkflow(id) {
  const copy = await workflowRepository.duplicate(id, me.id);
  setMessage(`已复制为 ${copy.name}`);
  await load();
}

async function publishWorkflow(id) {
  const published = await workflowRepository.publish(id, me.id);
  setMessage(`已发布 v${published.version}`);
  await load();
}

async function disableWorkflow(id) {
  await workflowRepository.disable(id, me.id);
  setMessage('工作流已停用');
  await load();
}

async function deleteWorkflow(id) {
  await workflowRepository.remove(id);
  setMessage('工作流已删除');
  await load();
}
```

Use `ConfirmDialog` before publish, disable, and delete. Use `navigateWorkflow('edit', id)` for edit.

- [ ] **Step 5: Render the complete list UI**

Render:

- hero header and count;
- new workflow button;
- local data warning;
- search and two selects;
- table with all required fields;
- status badge mapping;
- action buttons;
- loading and empty states;
- pagination buttons.

Do not import generic `Table` if its existing fixed styling conflicts; use semantic table markup with workflow-specific classes.

- [ ] **Step 6: Verify GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
npm --prefix frontend run build
```

Expected: UI contract and build pass.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/admin/workflows/WorkflowListPage.jsx frontend/src/admin/workflows/workflowUiContract.test.mjs
git commit -m "feat: add workflow list management actions"
```

---

### Task 9: Build the React Flow canvas, node library, and custom nodes

**Files:**

- Create: `frontend/src/admin/workflows/WorkflowCanvas.jsx`
- Create: `frontend/src/admin/workflows/WorkflowNode.jsx`
- Create: `frontend/src/admin/workflows/NodeLibrary.jsx`
- Modify: `frontend/src/admin/workflows/WorkflowEditorPage.jsx`
- Modify: `frontend/src/admin/workflows/workflowUiContract.test.mjs`

- [ ] **Step 1: Extend UI contract tests and confirm RED**

Assert:

```js
assert.match(canvasSource, /ReactFlow/);
assert.match(canvasSource, /MiniMap/);
assert.match(canvasSource, /Controls/);
assert.match(canvasSource, /Background/);
assert.match(canvasSource, /onConnect/);
assert.match(canvasSource, /onDrop/);
assert.match(nodeSource, /Handle/);
assert.match(librarySource, /FIXED_NODE_TYPES/);
```

Run:

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
```

Expected: FAIL because canvas files are missing.

- [ ] **Step 2: Implement `WorkflowNode.jsx`**

Use `Handle` and `Position` from `@xyflow/react`. Render:

- type-colored icon block using a Lucide icon map;
- label;
- node type code;
- short description;
- target handle except for START;
- source handle except for SAVE_OUTPUT;
- red error count when `data.validationErrors.length > 0`;
- selected class from `NodeProps.selected`.

Keep icons in a static `NODE_ICONS` map keyed by the eight node types.

- [ ] **Step 3: Implement `NodeLibrary.jsx`**

Group `FIXED_NODE_TYPES` by `NODE_DEFINITIONS[type].group`.

On drag start:

```js
event.dataTransfer.setData('application/workflow-node', nodeType);
event.dataTransfer.effectAllowed = 'move';
```

Each item shows the same icon, Chinese label, type code, and description as the canvas node.

- [ ] **Step 4: Implement `WorkflowCanvas.jsx`**

Import:

```jsx
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

Required props:

```js
{
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDropNode,
  selectedNodeId
}
```

The inner canvas uses:

```jsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={{ workflowNode: WorkflowNode }}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onNodeClick={onNodeClick}
  onPaneClick={onPaneClick}
  onDragOver={event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }}
  onDrop={handleDrop}
  deleteKeyCode={['Backspace', 'Delete']}
  fitView
  snapToGrid
  snapGrid={[16, 16]}
>
  <MiniMap pannable zoomable />
  <Controls />
  <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
</ReactFlow>
```

Use `screenToFlowPosition({ x: event.clientX, y: event.clientY })` before calling `onDropNode(nodeType, position)`.

- [ ] **Step 5: Wire editor graph state**

In `WorkflowEditorPage.jsx`, load create/edit data, then use:

```js
const [workflow, setWorkflow] = useState(null);
const [selectedNodeId, setSelectedNodeId] = useState(null);
const [dirty, setDirty] = useState(false);

const updateGraph = updater => {
  setWorkflow(current => ({
    ...current,
    canvasJson: updater(current.canvasJson)
  }));
  setDirty(true);
};
```

Implement:

```js
const handleNodesChange = changes =>
  updateGraph(graph => ({ ...graph, nodes: applyNodeChanges(changes, graph.nodes) }));

const handleEdgesChange = changes =>
  updateGraph(graph => ({ ...graph, edges: applyEdgeChanges(changes, graph.edges) }));

const handleConnect = connection =>
  updateGraph(graph => ({
    ...graph,
    edges: addEdge({
      ...connection,
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      type: 'smoothstep'
    }, graph.edges)
  }));
```

For a dropped node, call `createNode(nodeType, { position })`.

- [ ] **Step 6: Verify GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
npm --prefix frontend run build
```

Expected: contract and build pass.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/admin/workflows/WorkflowCanvas.jsx frontend/src/admin/workflows/WorkflowNode.jsx frontend/src/admin/workflows/NodeLibrary.jsx frontend/src/admin/workflows/WorkflowEditorPage.jsx frontend/src/admin/workflows/workflowUiContract.test.mjs
git commit -m "feat: add visual workflow canvas"
```

---

### Task 10: Add node configuration, save, validation, publish, and JSON preview

**Files:**

- Create: `frontend/src/admin/workflows/NodeConfigPanel.jsx`
- Create: `frontend/src/admin/workflows/WorkflowJsonModal.jsx`
- Create: `frontend/src/admin/workflows/WorkflowValidationModal.jsx`
- Modify: `frontend/src/admin/workflows/WorkflowEditorPage.jsx`
- Modify: `frontend/src/admin/workflows/workflowUiContract.test.mjs`

- [ ] **Step 1: Extend UI contract tests and confirm RED**

Assert all requested configuration labels are present in `NodeConfigPanel.jsx`, including:

- 模型、提示词模板、失败重试次数、输出格式
- 视频用途、默认时长、默认比例、允许用户修改
- 提示词语言、安全限制
- 视频模型、输入图片来源、时长、比例、分辨率、扣费规则
- 字幕、水印、生成封面、压缩、裁剪比例
- 保存资源库、保存历史任务、发布商品、下载链接

Assert editor includes 保存草稿、校验、发布、预览 JSON、返回.

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
```

Expected: FAIL for missing forms and actions.

- [ ] **Step 3: Implement `NodeConfigPanel.jsx`**

Public props:

```js
{
  workflow,
  selectedNode,
  validationErrors,
  onWorkflowChange,
  onNodeChange
}
```

When no node is selected, render metadata fields:

```jsx
<input value={workflow.name} onChange={...} />
<input value={workflow.code} onChange={...} />
<textarea value={workflow.description} onChange={...} />
<select value={workflow.type}>IMAGE / VIDEO / MIXED</select>
<input value={workflow.scene} onChange={...} />
```

When a node is selected, render:

- common label and description;
- a switch/select/input schema chosen by `selectedNode.data.nodeType`;
- inline field errors filtered by `nodeId` and `field`.

Use one `updateConfig(field, value)` helper and numeric parsing for durations/retries.

- [ ] **Step 4: Implement validation and JSON modals**

`WorkflowValidationModal.jsx`:

- shows valid/invalid state;
- lists each error message;
- clicking an error with `nodeId` calls `onFocusNode(nodeId)`;
- provides close action.

`WorkflowJsonModal.jsx`:

- renders `JSON.stringify(buildExecutionJson(workflow), null, 2)`;
- copies with `navigator.clipboard.writeText`;
- shows copied state;
- never edits JSON.

- [ ] **Step 5: Implement editor toolbar actions**

`saveDraft()`:

```js
const saved = mode === 'create' || !workflowId
  ? await workflowRepository.create(workflow, me.id)
  : await workflowRepository.update(workflow.id, workflow, me.id);
setWorkflow(saved);
setDirty(false);
if (!workflowId) navigateWorkflow('edit', saved.id, { replace: true });
```

`runValidation()`:

```js
const result = validateWorkflow(workflow);
setValidation(result);
setValidationOpen(true);
setWorkflow(current => ({
  ...current,
  canvasJson: {
    ...current.canvasJson,
    nodes: current.canvasJson.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        validationErrors: result.errors.filter(error => error.nodeId === node.id)
      }
    }))
  }
}));
```

`publish()`:

1. save draft;
2. run repository publish;
3. replace editor state with published workflow;
4. clear dirty flag;
5. show success message.

Add confirm state before publish and before leaving dirty editor.

- [ ] **Step 6: Add dirty-leave protection**

Register:

```js
useEffect(() => {
  const handleBeforeUnload = event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [dirty]);
```

The toolbar 返回 button uses an in-app confirmation dialog when `dirty === true`.

- [ ] **Step 7: Verify GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
npm --prefix frontend run test
npm --prefix frontend run build
```

Expected: all tests and build pass.

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/admin/workflows/NodeConfigPanel.jsx frontend/src/admin/workflows/WorkflowJsonModal.jsx frontend/src/admin/workflows/WorkflowValidationModal.jsx frontend/src/admin/workflows/WorkflowEditorPage.jsx frontend/src/admin/workflows/workflowUiContract.test.mjs
git commit -m "feat: configure validate and publish workflows"
```

---

### Task 11: Match the selected black-gold three-panel design and verify in browser

**Files:**

- Create: `frontend/src/styles/pages/admin-workflows.css`
- Modify: `frontend/src/styles/index.css`
- Modify: `.gitignore`
- Create: `design-qa.md`

- [ ] **Step 1: Add a failing style contract**

Extend `workflowUiContract.test.mjs` to assert:

```js
assert.match(stylesIndex, /admin-workflows\.css/);
assert.match(workflowCss, /\.workflowEditorLayout/);
assert.match(workflowCss, /grid-template-columns:\s*240px\s+minmax\(0,1fr\)\s+340px/);
assert.match(workflowCss, /\.workflowCanvasPanel/);
assert.match(workflowCss, /\.workflowNodeCard/);
assert.match(workflowCss, /@media\(max-width:1100px\)/);
```

- [ ] **Step 2: Run and confirm RED**

```powershell
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
```

Expected: FAIL because the stylesheet is missing.

- [ ] **Step 3: Create workflow styles**

Implement `admin-workflows.css` using existing variables:

```css
.workflowAdminSurface{
  min-height:100vh;
  background:var(--app-bg);
  color:var(--text);
}

.workflowEditorLayout{
  display:grid;
  grid-template-columns:240px minmax(0,1fr) 340px;
  min-height:calc(100vh - 154px);
  border-top:1px solid var(--border);
}

.workflowNodeLibrary,
.workflowConfigPanel{
  min-width:0;
  overflow:auto;
  background:var(--panel-bg);
}

.workflowNodeLibrary{border-right:1px solid var(--border);}
.workflowConfigPanel{border-left:1px solid var(--border);}

.workflowCanvasPanel{
  min-width:0;
  min-height:640px;
  background:#0d0f12;
}

.workflowNodeCard{
  width:210px;
  border:1px solid rgba(255,255,255,.14);
  border-radius:16px;
  background:linear-gradient(180deg,#1c2027,#121419);
  color:var(--text);
  box-shadow:0 14px 34px rgba(0,0,0,.28);
}

.workflowNodeCard.selected{
  border-color:var(--gold);
  box-shadow:0 0 0 3px rgba(240,214,138,.14),0 18px 40px rgba(0,0,0,.36);
}
```

Complete the stylesheet for:

- sticky top toolbar;
- list hero, filters, table, badges, actions, pagination;
- node library groups and draggable rows;
- React Flow controls, minimap, handles, selected and error states;
- right-panel form fields, switches, inline errors;
- JSON/validation modals;
- toast/message state;
- loading and empty states;
- keyboard focus indicators.

At `max-width: 1100px`, use:

```css
.workflowEditorLayout{
  grid-template-columns:210px minmax(0,1fr);
}
.workflowConfigPanel{
  position:fixed;
  top:78px;
  right:0;
  bottom:0;
  width:min(380px,92vw);
  z-index:70;
  box-shadow:var(--shadow-modal);
}
```

At `max-width: 760px`, make the library a drawer and preserve the canvas as the primary surface.

- [ ] **Step 4: Import the stylesheet**

Add to `frontend/src/styles/index.css` after `admin-merchants.css`:

```css
@import './pages/admin-workflows.css';
```

- [ ] **Step 5: Ignore visual brainstorming artifacts**

Add to `.gitignore`:

```gitignore
.superpowers/
```

- [ ] **Step 6: Verify automated checks**

Run:

```powershell
npm --prefix frontend run test
npm --prefix frontend run build
git diff --check
```

Expected: all tests pass, build exits 0, and no whitespace errors are reported.

- [ ] **Step 7: Start the app for browser verification**

Run the backend and frontend with the existing root command:

```powershell
npm run dev
```

Expected:

- frontend available at the Vite local URL;
- backend starts or reports only pre-existing environment/database requirements;
- no new compile error.

- [ ] **Step 8: Run browser interaction acceptance**

Using the in-app Browser:

1. Log in as the existing system administrator.
2. Open `/admin/workflows`.
3. Verify list search and filters.
4. Create a workflow.
5. Drag one node from the library.
6. Connect, move, select, configure, and delete nodes/edges.
7. Save and reload the real edit URL.
8. Trigger a validation error and focus its node.
9. Preview and copy JSON.
10. Publish, return to list, duplicate, disable, and delete.
11. Verify browser console has no new errors.

- [ ] **Step 9: Perform blocking design QA**

Capture the editor at 1440×1024 in the same state as the selected “平衡三栏” reference. Compare:

- top toolbar hierarchy;
- 240px / flexible / 340px panel proportions;
- dark black-gold palette;
- canvas density and node spacing;
- node selection/error states;
- form readability;
- no clipped controls or unwanted nested cards.

Create `design-qa.md`:

```md
# Workflow Editor Design QA

Reference: selected “平衡三栏” ImageGen concept from the implementation thread.
Viewport: 1440 x 1024

## Findings

- P0: none
- P1: none
- P2: none
- P3: list any optional polish only

final result: passed
```

If any P0/P1/P2 finding exists, fix it, rebuild, recapture, and update the report. Do not mark passed until those findings are resolved.

- [ ] **Step 10: Final verification**

Run fresh:

```powershell
npm --prefix frontend run test
npm --prefix frontend run build
git status --short
```

Expected:

- zero test failures;
- build exits 0;
- status contains only intended workflow implementation files and `design-qa.md`.

- [ ] **Step 11: Commit**

```powershell
git add .gitignore frontend/src/styles/index.css frontend/src/styles/pages/admin-workflows.css frontend/src/admin/workflows design-qa.md
git commit -m "feat: complete admin workflow management prototype"
```

---

## Requirements Coverage Check

- List search/status/type filters and all management actions: Tasks 6 and 8.
- Real `/admin/workflows` routes while preserving hash routes: Tasks 2 and 7.
- Eight fixed node types: Task 3.
- React Flow drag/drop, connections, deletion, selection, controls, minimap: Task 9.
- All requested node configuration fields: Task 10.
- Save draft, validate, publish, JSON preview, return: Task 10.
- Eight validation/version rules: Tasks 4 and 5.
- Local persistence with future API-compatible repository: Task 6.
- Administrator-only access: Task 7.
- Selected balanced three-panel design: Task 11.
- Build, browser interaction, console, and design QA: Task 11.

## Execution Notes

- Do not add backend tables or endpoints in this plan.
- Do not add user-defined nodes, code nodes, branching, or loops.
- Do not let React components call `localStorage` directly.
- Do not mutate published version snapshots.
- Keep existing unrelated user changes untouched.
- Use the official `@xyflow/react` package and import `@xyflow/react/dist/style.css`.
