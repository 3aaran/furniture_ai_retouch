import { GENERATION_NODE_TYPES, validateWorkflow } from './workflowDomain.js';
import { buildAiTaskPayload } from './workflowNodeAdapter.js';

function makeError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export function orderedWorkflowNodes(workflow) {
  const nodes = workflow?.canvasJson?.nodes || [];
  const edges = workflow?.canvasJson?.edges || [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const nextById = new Map(edges.map(edge => [edge.source, edge.target]));
  const start = nodes.find(node => node.data?.nodeType === 'START');
  const ordered = [];
  let current = start;
  while (current && !ordered.some(node => node.id === current.id)) {
    ordered.push(current);
    current = byId.get(nextById.get(current.id));
  }
  return ordered;
}

export function createWorkflowExecutionService({
  workflowStore,
  runStore,
  submitAiTask,
  waitForAiTaskCompletion,
  id,
  now,
  defer = fn => setImmediate(fn)
}) {
  const execute = async (runId, workflow, user) => {
    const ordered = orderedWorkflowNodes(workflow);
    let currentImageId;
    try {
      const run = await runStore.getRun(runId);
      currentImageId = run.originImageId;
      await runStore.updateRun(runId, { status: 'running', startedAt: now() });
      for (const node of ordered) {
        const nodeType = node.data?.nodeType;
        await runStore.updateRun(runId, { currentNodeId: node.id });
        await runStore.updateNode(runId, node.id, { status: 'running', inputImageId: currentImageId, startedAt: now() });
        if (nodeType === 'IMAGE_INPUT') {
          await runStore.updateNode(runId, node.id, { status: 'succeeded', outputImageId: currentImageId, finishedAt: now() });
          continue;
        }
        if (GENERATION_NODE_TYPES.includes(nodeType)) {
          const submitted = await submitAiTask(buildAiTaskPayload(node, currentImageId), user);
          const taskId = submitted?.task?.id;
          await runStore.updateNode(runId, node.id, { aiTaskId: taskId });
          const completed = await waitForAiTaskCompletion(taskId, user);
          const resultImageId = completed.imageId || completed.resultImageId || completed.resultImage?.id;
          if (!resultImageId) throw makeError('生图任务未返回结果图片', 'WORKFLOW_NODE_RESULT_MISSING');
          currentImageId = resultImageId;
          await runStore.updateNode(runId, node.id, { status: 'succeeded', outputImageId: currentImageId, finishedAt: now() });
          continue;
        }
        await runStore.updateNode(runId, node.id, { status: 'succeeded', outputImageId: currentImageId, finishedAt: now() });
      }
      await runStore.updateRun(runId, { status: 'succeeded', resultImageId: currentImageId, currentNodeId: null, finishedAt: now() });
    } catch (error) {
      const run = await runStore.getRun(runId);
      if (run?.currentNodeId) {
        await runStore.updateNode(runId, run.currentNodeId, { status: 'failed', errorMessage: error.message, finishedAt: now() });
      }
      await runStore.updateRun(runId, { status: 'failed', errorMessage: error.message, finishedAt: now() });
    }
    return runStore.getRun(runId);
  };

  return {
    async submit(workflowId, originImageId, user) {
      const workflow = await workflowStore.get(workflowId);
      if (!workflow) throw makeError('工作流不存在', 'WORKFLOW_NOT_FOUND', 404);
      if (workflow.status !== 'PUBLISHED') throw makeError('只能执行已发布工作流', 'WORKFLOW_NOT_PUBLISHED');
      if (!originImageId) throw makeError('请选择工作流原图', 'WORKFLOW_ORIGIN_REQUIRED');
      const validation = validateWorkflow(workflow);
      if (!validation.valid) {
        const error = makeError('工作流校验失败', 'WORKFLOW_VALIDATION_FAILED');
        error.details = validation.errors;
        throw error;
      }
      const ordered = orderedWorkflowNodes(workflow);
      const runId = id();
      const createdAt = now();
      await runStore.createRun({
        id: runId,
        workflowTemplateId: workflow.id,
        userId: user.id,
        merchantId: user.merchant_id || user.merchantId || null,
        status: 'queued',
        originImageId,
        createdAt
      }, ordered.map((node, index) => ({
        id: id(),
        nodeId: node.id,
        nodeType: node.data.nodeType,
        featureKey: node.data.config?.featureKey || '',
        status: 'pending',
        sortOrder: index
      })));
      defer(() => execute(runId, workflow, user).catch(error => console.error('[workflow-run]', error)));
      return runStore.getRun(runId);
    },
    execute,
    async get(runId, user) {
      const run = await runStore.getRun(runId);
      if (!run) throw makeError('工作流运行不存在', 'WORKFLOW_RUN_NOT_FOUND', 404);
      if (user.role !== 'SYSTEM_ADMIN' && String(run.userId) !== String(user.id)) throw makeError('无权查看该工作流运行', 'WORKFLOW_RUN_FORBIDDEN', 403);
      return run;
    }
  };
}
