# Real Image Workflow Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the non-executable video demo workflow with an empty image workflow canvas whose nine generation nodes execute through the existing AI task service in strict serial order.

**Architecture:** Keep React Flow as the editor and replace its node catalog with three structural nodes plus nine nodes mapped to current `featureKey` values. Add a dependency-injected workflow execution service and MySQL run store; each generation node submits an existing AI task, waits for its terminal status, and passes `resultImageId` to the next node. The workflow layer orchestrates only and does not duplicate prompting, model, quota, refund, or image-storage logic.

**Tech Stack:** React 18, Vite 5, React Flow 12, Node test runner, Express 4, MySQL 8, existing AI task service.

**Design reference:** `docs/superpowers/specs/2026-06-18-real-image-workflow-execution-design.md`

---

## File Map

### Frontend

- Modify `frontend/src/admin/workflows/workflowDefinitions.js` — real node catalog, feature mapping, blank workflow factory and node defaults.
- Modify `frontend/src/admin/workflows/workflowDefinitions.test.mjs` — blank workflow and twelve-node catalog contract.
- Modify `frontend/src/admin/workflows/workflowValidation.js` — strict serial image workflow validation and legacy-node rejection.
- Modify `frontend/src/admin/workflows/workflowValidation.test.mjs` — graph rules and legacy behavior.
- Modify `frontend/src/admin/workflows/WorkflowEditorPage.jsx` — blank create mode and test-run state.
- Modify `frontend/src/admin/workflows/NodeConfigPanel.jsx` — actual generation parameters.
- Modify `frontend/src/admin/workflows/NodeLibrary.jsx` — real node groups and descriptions.
- Modify `frontend/src/admin/workflows/WorkflowNode.jsx` — icons for all twelve node types.
- Modify `frontend/src/admin/workflows/workflowRepository.js` — run submission and status methods.
- Create `frontend/src/admin/workflows/WorkflowRunPanel.jsx` — original image ID input and node-level run status.
- Modify `frontend/src/admin/workflows/workflowUiContract.test.mjs` — editor and run UI contract.
- Modify `frontend/src/styles/pages/admin-workflows.css` — empty state and run panel styles.

### Backend

- Modify `backend/src/workflows/workflowDomain.js` — authoritative node catalog and strict validation.
- Modify `backend/src/workflows/workflowDomain.test.mjs` — catalog, blank input and graph validation tests.
- Create `backend/src/workflows/workflowNodeAdapter.js` — convert node config and current image into `submitAiTask` payloads.
- Create `backend/src/workflows/workflowNodeAdapter.test.mjs` — all nine mappings.
- Create `backend/src/workflows/workflowExecutionService.js` — topology, run lifecycle and image chaining.
- Create `backend/src/workflows/workflowExecutionService.test.mjs` — success and stop-on-failure behavior.
- Create `backend/src/workflows/workflowRunStore.js` — MySQL persistence for runs and node runs.
- Create `backend/src/workflows/workflowRunStore.test.mjs` — SQL contract.
- Modify `backend/src/ai/taskService.js` — terminal-task waiting helper using existing task state.
- Create `backend/src/ai/taskCompletion.test.mjs` — successful, failed and timeout waiting.
- Modify `backend/src/routes/workflowRoutes.js` — run submission and run status endpoints.
- Modify `backend/src/workflows/workflowRoutes.test.mjs` — auth and route contract.
- Modify `backend/src/db.js` — run tables and stop creating legacy examples in fresh databases.

---

### Task 1: Replace the frontend demo catalog with the real image catalog

**Files:**

- Modify: `frontend/src/admin/workflows/workflowDefinitions.test.mjs`
- Modify: `frontend/src/admin/workflows/workflowDefinitions.js`
- Modify: `frontend/src/admin/workflows/WorkflowNode.jsx`
- Modify: `frontend/src/admin/workflows/NodeLibrary.jsx`

- [ ] **Step 1: Write failing catalog and blank-workflow tests**

Add assertions:

```js
assert.deepEqual(FIXED_NODE_TYPES, [
  'START',
  'IMAGE_INPUT',
  'MATERIAL_GENERATE',
  'SCENE_GENERATE',
  'BACKGROUND_CLEAN',
  'PHOTO_ENHANCE',
  'LINEART_GENERATE',
  'MULTIVIEW_GENERATE',
  'PROMO_MAIN_GENERATE',
  'PROMO_POSTER_GENERATE',
  'PROMO_DETAIL_GENERATE',
  'SAVE_OUTPUT'
]);

assert.deepEqual(
  Object.fromEntries(
    FIXED_NODE_TYPES
      .filter(type => NODE_DEFINITIONS[type].featureKey)
      .map(type => [type, NODE_DEFINITIONS[type].featureKey])
  ),
  {
    MATERIAL_GENERATE: 'material',
    SCENE_GENERATE: 'replace_bg',
    BACKGROUND_CLEAN: 'remove_bg',
    PHOTO_ENHANCE: 'enhance',
    LINEART_GENERATE: 'lineart',
    MULTIVIEW_GENERATE: 'multiview',
    PROMO_MAIN_GENERATE: 'promo_main_image',
    PROMO_POSTER_GENERATE: 'promo_poster_image',
    PROMO_DETAIL_GENERATE: 'promo_detail_image'
  }
);

const workflow = createBlankWorkflow({ id: 'wf-1', now: '2026-06-18T00:00:00.000Z' });
assert.equal(workflow.type, 'IMAGE');
assert.deepEqual(workflow.canvasJson.nodes, []);
assert.deepEqual(workflow.canvasJson.edges, []);
assert.equal(workflow.configJson.entryNodeId, null);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test frontend/src/admin/workflows/workflowDefinitions.test.mjs
```

Expected: FAIL because `createBlankWorkflow` and the real node types do not exist.

- [ ] **Step 3: Implement the real definitions**

Export `FIXED_NODE_TYPES`, `NODE_DEFINITIONS`, `GENERATION_NODE_TYPES`, `createNode` and:

```js
export function createBlankWorkflow({ id = uid(), now = new Date().toISOString() } = {}) {
  return {
    id,
    name: '未命名工作流',
    code: `IMAGE_WORKFLOW_${Date.now().toString(36).toUpperCase()}`,
    description: '',
    type: 'IMAGE',
    scene: '',
    status: 'DRAFT',
    version: 0,
    canvasJson: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    configJson: { schemaVersion: 2, executionMode: 'SEQUENTIAL', entryNodeId: null },
    versions: [],
    createdBy: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now
  };
}
```

Generation defaults must use:

```js
{
  featureKey,
  resolution: '2K',
  ratio: '自适应',
  userPrompt: '',
  options: {},
  failurePolicy: 'STOP'
}
```

Give promotion nodes their existing `promotionOptionDefaults` values without importing workbench React code.

- [ ] **Step 4: Update icon and library maps**

Map all twelve node types to existing Lucide icons. Group structural nodes under `流程`, base image nodes under `基础生图`, and promotion nodes under `推广生图`.

- [ ] **Step 5: Run GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowDefinitions.test.mjs
```

Expected: PASS.

---

### Task 2: Enforce strict serial image workflow validation

**Files:**

- Modify: `frontend/src/admin/workflows/workflowValidation.test.mjs`
- Modify: `frontend/src/admin/workflows/workflowValidation.js`
- Modify: `backend/src/workflows/workflowDomain.test.mjs`
- Modify: `backend/src/workflows/workflowDomain.js`

- [ ] **Step 1: Write failing frontend and backend validation tests**

Build this valid graph:

```js
START -> IMAGE_INPUT -> PHOTO_ENHANCE -> PROMO_MAIN_GENERATE -> SAVE_OUTPUT
```

Assert it passes. Add individual failing cases for:

- no generation node;
- two outgoing edges from one node;
- generation node with two incoming edges;
- `START` with an incoming edge;
- `SAVE_OUTPUT` with an outgoing edge;
- legacy `VIDEO_GENERATE`;
- empty canvas;
- duplicate, self, isolated, unreachable and cycle conditions.

- [ ] **Step 2: Verify RED**

```powershell
node --test frontend/src/admin/workflows/workflowValidation.test.mjs
node --test backend/src/workflows/workflowDomain.test.mjs
```

Expected: new strict-serial cases FAIL.

- [ ] **Step 3: Implement matching validators**

Both validators must use the same error codes:

```text
LEGACY_NODE_UNSUPPORTED
START_COUNT
IMAGE_INPUT_COUNT
SAVE_OUTPUT_COUNT
GENERATION_NODE_REQUIRED
START_INCOMING
IMAGE_INPUT_PARENT
NODE_INCOMING_COUNT
NODE_OUTGOING_COUNT
SAVE_OUTPUT_OUTGOING
SELF_CONNECTION
DUPLICATE_EDGE
ISOLATED_NODE
UNREACHABLE_NODE
CYCLE_DETECTED
REQUIRED_CONFIG
```

The backend remains authoritative. A valid workflow must form one linear path containing every node.

- [ ] **Step 4: Stop fresh legacy seeding**

Change `createExampleWorkflows()` to return an empty array and keep the function for compatibility with current initialization tests. Update its test to assert no examples are created.

- [ ] **Step 5: Run GREEN**

```powershell
node --test frontend/src/admin/workflows/workflowValidation.test.mjs
node --test backend/src/workflows/workflowDomain.test.mjs
```

Expected: PASS.

---

### Task 3: Convert workflow nodes into existing AI task payloads

**Files:**

- Create: `backend/src/workflows/workflowNodeAdapter.test.mjs`
- Create: `backend/src/workflows/workflowNodeAdapter.js`

- [ ] **Step 1: Write failing tests for all nine mappings**

Use one table-driven test:

```js
const cases = [
  ['MATERIAL_GENERATE', 'material'],
  ['SCENE_GENERATE', 'replace_bg'],
  ['BACKGROUND_CLEAN', 'remove_bg'],
  ['PHOTO_ENHANCE', 'enhance'],
  ['LINEART_GENERATE', 'lineart'],
  ['MULTIVIEW_GENERATE', 'multiview'],
  ['PROMO_MAIN_GENERATE', 'promo_main_image'],
  ['PROMO_POSTER_GENERATE', 'promo_poster_image'],
  ['PROMO_DETAIL_GENERATE', 'promo_detail_image']
];
```

For each case assert:

```js
payload.originImageId === 'image-current';
payload.featureKey === expectedFeatureKey;
payload.resolution === '2K';
payload.ratio === '1:1';
payload.userPrompt === '测试要求';
payload.options.keepSubject === true;
```

Also assert resource snapshot fields pass through unchanged.

- [ ] **Step 2: Verify RED**

```powershell
node --test backend/src/workflows/workflowNodeAdapter.test.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the adapter**

Export:

```js
export const GENERATION_FEATURE_MAP = Object.freeze({ ... });
export function buildAiTaskPayload(node, currentImageId) { ... }
```

Reject structural and unknown node types with `WORKFLOW_NODE_NOT_EXECUTABLE`.

- [ ] **Step 4: Run GREEN**

```powershell
node --test backend/src/workflows/workflowNodeAdapter.test.mjs
```

Expected: PASS.

---

### Task 4: Add terminal AI task waiting without duplicating execution logic

**Files:**

- Create: `backend/src/ai/taskCompletion.test.mjs`
- Modify: `backend/src/ai/taskService.js`

- [ ] **Step 1: Write failing tests around an injected reader**

Export a pure helper:

```js
await waitForTaskCompletion({
  readTask,
  taskId: 'task-1',
  timeoutMs: 50,
  pollMs: 1
});
```

Tests:

- queued, running, succeeded returns the succeeded task;
- failed throws an error containing task failure text;
- no terminal state before timeout throws `AI_TASK_TIMEOUT`.

- [ ] **Step 2: Verify RED**

```powershell
node --test backend/src/ai/taskCompletion.test.mjs
```

Expected: FAIL because helper is missing.

- [ ] **Step 3: Implement pure and database-backed helpers**

Add:

```js
export async function waitForTaskCompletion({ readTask, taskId, timeoutMs = 15 * 60 * 1000, pollMs = 1000 }) { ... }

export async function waitForAiTaskCompletion(taskId, user, options = {}) {
  return waitForTaskCompletion({
    ...options,
    taskId,
    readTask: async id => {
      const task = await getTaskForUser(id, user);
      if (!task) throw new Error('任务不存在');
      return publicTask(task);
    }
  });
}
```

- [ ] **Step 4: Run GREEN**

```powershell
node --test backend/src/ai/taskCompletion.test.mjs
```

Expected: PASS.

---

### Task 5: Persist and execute workflow runs

**Files:**

- Create: `backend/src/workflows/workflowRunStore.test.mjs`
- Create: `backend/src/workflows/workflowRunStore.js`
- Create: `backend/src/workflows/workflowExecutionService.test.mjs`
- Create: `backend/src/workflows/workflowExecutionService.js`
- Modify: `backend/src/db.js`

- [ ] **Step 1: Write failing run-store SQL tests**

Assert the store issues SQL for:

- creating a `workflow_runs` row;
- creating one `workflow_run_nodes` row per ordered node;
- updating run status/current node/result/error;
- updating node input/output/task/status/error;
- reading a run with ordered node rows.

- [ ] **Step 2: Write failing execution-service tests**

Inject fake dependencies:

```js
const service = createWorkflowExecutionService({
  workflowStore,
  runStore,
  submitAiTask,
  waitForAiTaskCompletion,
  id,
  now,
  defer: fn => fn()
});
```

Success test:

- `PHOTO_ENHANCE` receives `origin-1`;
- it returns `result-1`;
- `PROMO_MAIN_GENERATE` receives `result-1`;
- final run result is `result-2`.

Failure test:

- first generation succeeds;
- second generation fails;
- third generation is never submitted;
- run and failed node are persisted as failed.

- [ ] **Step 3: Verify RED**

```powershell
node --test backend/src/workflows/workflowRunStore.test.mjs backend/src/workflows/workflowExecutionService.test.mjs
```

Expected: module-not-found failures.

- [ ] **Step 4: Add database tables**

Add `workflow_runs` and `workflow_run_nodes` with the columns and indexes from the approved spec. Use `VARCHAR(36)` identifiers, JSON-free scalar execution records and foreign-key-free indexes consistent with the existing schema style.

- [ ] **Step 5: Implement store and service**

`submit(workflowId, originImageId, user)` must:

1. load the workflow;
2. require `PUBLISHED`;
3. validate it;
4. calculate the ordered linear path;
5. create the run and node records;
6. schedule execution with `defer`;
7. return the queued run.

`execute(runId, workflow, user)` must pass the current image through generation nodes and call only injected `submitAiTask` and `waitForAiTaskCompletion`.

- [ ] **Step 6: Run GREEN**

```powershell
node --test backend/src/workflows/workflowRunStore.test.mjs backend/src/workflows/workflowExecutionService.test.mjs
```

Expected: PASS.

---

### Task 6: Expose run APIs and editor test-run UI

**Files:**

- Modify: `backend/src/workflows/workflowRoutes.test.mjs`
- Modify: `backend/src/routes/workflowRoutes.js`
- Modify: `frontend/src/admin/workflows/workflowRepository.js`
- Create: `frontend/src/admin/workflows/WorkflowRunPanel.jsx`
- Modify: `frontend/src/admin/workflows/WorkflowEditorPage.jsx`
- Modify: `frontend/src/admin/workflows/NodeConfigPanel.jsx`
- Modify: `frontend/src/admin/workflows/workflowUiContract.test.mjs`
- Modify: `frontend/src/styles/pages/admin-workflows.css`

- [ ] **Step 1: Write failing route and UI contract tests**

Route assertions:

```text
POST /api/workflows/:id/runs
GET /api/workflow-runs/:runId
```

UI assertions:

- create mode imports and calls `createBlankWorkflow`;
- no `createDefaultWorkflow` reference remains;
- node config contains resolution, ratio, user prompt and stop policy;
- editor contains “测试运行”;
- run panel contains original image ID, overall status and node statuses.

- [ ] **Step 2: Verify RED**

```powershell
node --test backend/src/workflows/workflowRoutes.test.mjs
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
```

Expected: FAIL for missing run routes and UI.

- [ ] **Step 3: Wire backend routes**

Create the execution service with real dependencies:

```js
submitAiTask,
waitForAiTaskCompletion,
createMysqlWorkflowRunStore(pool)
```

Both routes use `requireAuth`. The GET route must verify the requester owns the run unless the requester is `SYSTEM_ADMIN`.

- [ ] **Step 4: Wire repository methods**

Add:

```js
run(workflowId, payload)
getRun(runId)
```

- [ ] **Step 5: Implement blank editor and run panel**

Create mode uses `createBlankWorkflow()`. `WorkflowRunPanel`:

- accepts an original image ID;
- disables submission until the workflow is saved and published;
- posts the run;
- polls once per second while queued/running;
- stops polling at succeeded/failed;
- lists each node status, AI task ID, input image ID and output image ID;
- displays final result image ID or failure message.

Use one interval effect with cleanup and primitive dependencies to avoid duplicate polling.

- [ ] **Step 6: Implement real node forms**

Render common generation fields for all nine nodes and only the existing function-specific options required by `buildGenerationOptions()` and `buildPromotionOptions()`. Store values in `node.data.config.options`.

- [ ] **Step 7: Run GREEN and build**

```powershell
node --test backend/src/workflows/workflowRoutes.test.mjs
node --test frontend/src/admin/workflows/workflowUiContract.test.mjs
npm --prefix frontend run build
```

Expected: tests pass and Vite build exits 0.

---

### Task 7: Full regression and browser verification

**Files:**

- Modify only files needed to correct failures found by verification.

- [ ] **Step 1: Run all workflow and AI tests**

```powershell
node --test backend/src/workflows/*.test.mjs backend/src/ai/taskCompletion.test.mjs
npm --prefix frontend run test
```

Expected: zero failures.

- [ ] **Step 2: Run build and whitespace checks**

```powershell
npm --prefix frontend run build
git diff --check
```

Expected: build exits 0 and no whitespace errors.

- [ ] **Step 3: Verify browser create flow**

At `http://localhost:5173/admin/workflows/create`:

1. reload;
2. confirm the canvas has zero nodes and shows the empty-state instruction;
3. confirm the library has twelve nodes;
4. drag `START`, `IMAGE_INPUT`, `摄影增强`, `产品主图`, `SAVE_OUTPUT`;
5. connect them linearly;
6. configure both generation nodes;
7. save, validate and publish;
8. confirm no new console errors.

- [ ] **Step 4: Verify the execution contract**

If the current administrator has an active merchant and a usable image ID, run the published workflow and confirm the second AI task input equals the first task result. If the account cannot submit AI tasks, verify the API returns the existing clear permission or merchant-binding error and rely on the execution-service integration tests for chaining evidence; do not bypass quota or ownership rules.

- [ ] **Step 5: Final status review**

```powershell
git status --short
git diff --stat
```

Expected: only intended workflow-related changes plus pre-existing user changes remain.

---

## Requirements Coverage

- Empty create canvas: Tasks 1 and 6.
- Twelve necessary nodes: Task 1.
- Nine real `featureKey` mappings: Tasks 1 and 3.
- Previous output becomes next Image A: Task 5.
- Existing task/prompt/model/quota/refund/storage reuse: Tasks 4 and 5.
- Real run persistence and status: Task 5.
- Authenticated execution endpoints: Task 6.
- Legacy node rejection: Task 2.
- Actual configuration fields: Task 6.
- Automated and browser verification: Task 7.

## Execution Constraints

- Preserve all unrelated dirty-worktree changes.
- Do not rewrite the existing AI model, quota, refund or storage implementation.
- Do not add video, branching, loops or parallel execution.
- Do not create or seed replacement demo workflows.
- Do not bypass image ownership, merchant status or quota checks for administrator testing.
