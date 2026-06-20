import { v4 as uuid } from 'uuid';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { requireSystemAdmin } from '../middleware/roleMiddleware.js';
import { createWorkflowService } from '../workflows/workflowService.js';
import { createMysqlWorkflowStore } from '../workflows/workflowStore.js';
import { createMysqlWorkflowRunStore } from '../workflows/workflowRunStore.js';
import { createWorkflowExecutionService } from '../workflows/workflowExecutionService.js';
import { submitAiTask, waitForAiTaskCompletion } from '../ai/taskService.js';

const workflowStore = createMysqlWorkflowStore(pool);
const workflowService = createWorkflowService({
  store: workflowStore,
  id: uuid,
  now: () => new Date().toISOString()
});
const workflowExecutionService = createWorkflowExecutionService({
  workflowStore,
  runStore: createMysqlWorkflowRunStore(pool),
  submitAiTask,
  waitForAiTaskCompletion,
  id: uuid,
  now: () => new Date().toISOString()
});

const asyncRoute = handler => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('[workflow]', error);
    res.status(Number(error.status || 500)).json({
      message: error.status ? error.message : '工作流服务异常',
      code: error.code || 'WORKFLOW_INTERNAL_ERROR',
      details: error.details || undefined
    });
  }
};

export function registerWorkflowRoutes(app) {
  const adminOnly = [requireAuth, requireSystemAdmin];
  app.get('/api/admin/workflows', ...adminOnly, asyncRoute(async (req, res) => {
    res.json(await workflowService.list(req.query));
  }));
  app.post('/api/admin/workflows', ...adminOnly, asyncRoute(async (req, res) => {
    res.status(201).json(await workflowService.create(req.body, req.user.id));
  }));
  app.get('/api/admin/workflows/:id', ...adminOnly, asyncRoute(async (req, res) => {
    res.json(await workflowService.get(req.params.id));
  }));
  app.put('/api/admin/workflows/:id', ...adminOnly, asyncRoute(async (req, res) => {
    res.json(await workflowService.update(req.params.id, req.body, req.user.id));
  }));
  app.post('/api/admin/workflows/:id/validate', ...adminOnly, asyncRoute(async (req, res) => {
    res.json(await workflowService.validate(req.params.id));
  }));
  app.post('/api/admin/workflows/:id/publish', ...adminOnly, asyncRoute(async (req, res) => {
    res.json(await workflowService.publish(req.params.id, req.user.id));
  }));
  app.post('/api/admin/workflows/:id/disable', ...adminOnly, asyncRoute(async (req, res) => {
    res.json(await workflowService.disable(req.params.id, req.user.id));
  }));
  app.post('/api/admin/workflows/:id/duplicate', ...adminOnly, asyncRoute(async (req, res) => {
    res.status(201).json(await workflowService.duplicate(req.params.id, req.user.id));
  }));
  app.delete('/api/admin/workflows/:id', ...adminOnly, asyncRoute(async (req, res) => {
    res.json(await workflowService.remove(req.params.id));
  }));
  app.post('/api/workflows/:id/runs', requireAuth, asyncRoute(async (req, res) => {
    res.status(202).json(await workflowExecutionService.submit(req.params.id, req.body.originImageId, req.user));
  }));
  app.get('/api/workflow-runs/:runId', requireAuth, asyncRoute(async (req, res) => {
    res.json(await workflowExecutionService.get(req.params.runId, req.user));
  }));
}
