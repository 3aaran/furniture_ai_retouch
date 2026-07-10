import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./studio.api.ts', import.meta.url), 'utf8');

test('createAiTask unwraps the backend task envelope before studio polling uses it', () => {
  assert.match(source, /type CreateAiTaskResponse/);
  assert.match(source, /response\.task/);
  assert.match(source, /return \{ \.\.\.response\.task, user: response\.user \?\? response\.task\.user \}/);
});
