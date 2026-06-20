import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const dbSource = readFileSync(new URL('../db.js', import.meta.url), 'utf8');

describe('workflow database schema', () => {
  it('creates one current-state workflow table', () => {
    assert.match(dbSource, /CREATE TABLE IF NOT EXISTS workflow_templates/);
    assert.match(dbSource, /code VARCHAR\(100\) NOT NULL UNIQUE/);
    assert.match(dbSource, /canvas_json JSON NOT NULL/);
    assert.match(dbSource, /config_json JSON NOT NULL/);
    assert.match(dbSource, /status ENUM\('DRAFT','PUBLISHED','DISABLED'\)/);
    assert.match(dbSource, /is_example TINYINT\(1\) NOT NULL DEFAULT 0/);
    assert.doesNotMatch(dbSource, /CREATE TABLE IF NOT EXISTS workflow_template_versions/);
  });

  it('creates run tables and does not seed demo workflows', () => {
    assert.match(dbSource, /CREATE TABLE IF NOT EXISTS workflow_runs/);
    assert.match(dbSource, /CREATE TABLE IF NOT EXISTS workflow_run_nodes/);
    assert.match(dbSource, /ai_task_id VARCHAR\(36\) NULL/);
    assert.doesNotMatch(dbSource, /workflow_examples_seeded_v1/);
    assert.doesNotMatch(dbSource, /createExampleWorkflows/);
  });
});
