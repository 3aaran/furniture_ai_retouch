import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const source = readFileSync(join(here, 'LandingPage.jsx'), 'utf8');

describe('landing workflow assets', () => {
  it('uses optimized workflow images with lazy decoding', () => {
    for (const name of ['01-original.webp', '02-clean.webp', '03-material.webp', '04-scene.webp']) {
      const file = join(root, 'public/landing/workflow', name);
      assert.equal(existsSync(file), true, `${name} should exist`);
      assert.ok(statSync(file).size < 180_000, `${name} should stay lightweight`);
      assert.match(source, new RegExp(`/landing/workflow/${name}`));
    }

    assert.match(source, /loading="lazy"/);
    assert.match(source, /decoding="async"/);
  });
});
