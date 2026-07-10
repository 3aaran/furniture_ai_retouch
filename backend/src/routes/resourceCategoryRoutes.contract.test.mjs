import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./resourceCategoryRoutes.js', import.meta.url), 'utf8');

test('main category creation resolves its owner filter before querying duplicates', () => {
  const start = source.indexOf("app.post('/api/categories/main'");
  const end = source.indexOf("app.post('/api/categories/:mainId/sub'", start);
  const handler = source.slice(start, end);

  assert.match(handler, /const owner = ownerWhere\(scope, req\.user, ''\);/);
  assert.ok(handler.indexOf('const owner = ownerWhere') < handler.indexOf('owner.sql'));
});
