import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { waitForTaskCompletion } from './taskService.js';

describe('AI task completion wait', () => {
  it('returns a succeeded task after queued and running states', async () => {
    const states = [
      { status: 'queued' },
      { status: 'running' },
      { status: 'succeeded', resultImageId: 'image-1' }
    ];
    const task = await waitForTaskCompletion({
      taskId: 'task-1',
      pollMs: 1,
      timeoutMs: 50,
      readTask: async () => states.shift() || states.at(-1)
    });
    assert.equal(task.resultImageId, 'image-1');
  });

  it('throws the stored failure message', async () => {
    await assert.rejects(
      () => waitForTaskCompletion({
        taskId: 'task-1',
        pollMs: 1,
        timeoutMs: 20,
        readTask: async () => ({ status: 'failed', errorMessage: '模型调用失败' })
      }),
      /模型调用失败/
    );
  });

  it('throws AI_TASK_TIMEOUT when no terminal state arrives', async () => {
    await assert.rejects(
      () => waitForTaskCompletion({
        taskId: 'task-1',
        pollMs: 1,
        timeoutMs: 3,
        readTask: async () => ({ status: 'running' })
      }),
      error => error.code === 'AI_TASK_TIMEOUT'
    );
  });
});
