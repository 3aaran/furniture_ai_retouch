import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./brand.ts', import.meta.url), 'utf8');

test('brand mark preserves the existing raster identity asset', () => {
  assert.match(source, /mark:\s*'\/brand\/xungang-mark\.png'/);
  assert.match(source, /logo:\s*'\/brand\/xungang-logo\.png'/);
});
