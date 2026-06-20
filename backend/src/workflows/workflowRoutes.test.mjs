import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const routeSource = readFileSync(new URL('../routes/workflowRoutes.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../server.js', import.meta.url), 'utf8');

describe('workflow route contract', () => {
  it('protects and exposes all workflow administrator APIs', () => {
    assert.match(routeSource, /requireAuth/);
    assert.match(routeSource, /requireSystemAdmin/);
    for (const route of [
      "app.get('/api/admin/workflows'",
      "app.post('/api/admin/workflows'",
      "app.get('/api/admin/workflows/:id'",
      "app.put('/api/admin/workflows/:id'",
      "app.post('/api/admin/workflows/:id/validate'",
      "app.post('/api/admin/workflows/:id/publish'",
      "app.post('/api/admin/workflows/:id/disable'",
      "app.post('/api/admin/workflows/:id/duplicate'",
      "app.delete('/api/admin/workflows/:id'"
    ]) assert.ok(routeSource.includes(route), route);
  });

  it('registers the workflow routes in the server', () => {
    assert.match(serverSource, /registerWorkflowRoutes/);
    assert.match(serverSource, /registerWorkflowRoutes\(app\)/);
  });

  it('exposes authenticated workflow run APIs', () => {
    assert.ok(routeSource.includes("app.post('/api/workflows/:id/runs'"));
    assert.ok(routeSource.includes("app.get('/api/workflow-runs/:runId'"));
    assert.match(routeSource, /createWorkflowExecutionService/);
    assert.match(routeSource, /waitForAiTaskCompletion/);
  });
});
