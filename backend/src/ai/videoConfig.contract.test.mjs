import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const configSource = readFileSync(new URL('./configService.js', import.meta.url), 'utf8');
const adapterSource = readFileSync(new URL('./adapters/seedance-reference-video.js', import.meta.url), 'utf8');
const taskSource = readFileSync(new URL('./videoTaskService.js', import.meta.url), 'utf8');

test('admin AI config exposes and saves an independent editable video model config', () => {
  assert.match(configSource, /videoConfig:\s*await getSeedanceVideoConfig/);
  assert.match(configSource, /data\.videoConfig/);
  assert.match(configSource, /saveSeedanceVideoConfig\(data\.videoConfig\)/);
  assert.match(configSource, /data\.provider/);
  assert.match(configSource, /data\.modelName/);
});

test('saved database video settings take precedence over environment defaults', () => {
  assert.match(configSource, /model\?\.base_url\s*\|\|\s*process\.env\.SEEDANCE_VIDEO_BASE_URL/);
  assert.match(configSource, /model\?\.api_path\s*\|\|\s*process\.env\.SEEDANCE_VIDEO_CREATE_PATH/);
  assert.match(configSource, /metadata\?\.statusPath\s*\|\|\s*process\.env\.SEEDANCE_VIDEO_STATUS_PATH/);
  assert.match(configSource, /model\?\.api_key_encrypted\s*\|\|\s*process\.env\.SEEDANCE_VIDEO_API_KEY/);
});

test('seedance adapter uses the configured real model name', () => {
  assert.match(adapterSource, /model:\s*options\.modelName\s*\|\|\s*SEEDANCE_REFERENCE_VIDEO_MODEL/);
});

test('video reference images reuse the existing image access URL pipeline', () => {
  assert.match(taskSource, /getImageAccessUrl\(image/);
  assert.match(taskSource, /assertPublicHttpUrlLiteral/);
  assert.doesNotMatch(taskSource, /upload.*video.*reference/i);
});
