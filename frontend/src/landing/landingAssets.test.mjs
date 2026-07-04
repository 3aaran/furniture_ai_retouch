import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const pageSource = readFileSync(join(here, 'LandingPage.jsx'), 'utf8');
const contentSource = readFileSync(join(here, 'LandingContent.jsx'), 'utf8');
const source = `${pageSource}\n${contentSource}`;
const finalCss = readFileSync(join(root, 'src/styles/overrides/final-fixes.css'), 'utf8');

describe('landing workflow assets', () => {
  it('uses existing lightweight hero images for the first viewport', () => {
    for (const name of ['original.webp', 'result.webp']) {
      const file = join(root, 'public/landing/hero', name);
      assert.equal(existsSync(file), true, `${name} should exist`);
      assert.ok(statSync(file).size < 120_000, `${name} should stay lightweight`);
      assert.match(source, new RegExp(`/landing/hero/${name}`));
    }

    assert.doesNotMatch(source, /\/landing\/hero\/[^'"]+\.png/);
    assert.match(source, /fetchPriority="high"/);
  });

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

  it('does not cover hero demo images with default placeholder overlays', () => {
    assert.match(finalCss, /\.landingDemoPanel\.hasImage \.landingDemoImg[\s\S]*object-fit:cover/);
    for (const selector of ['landingPanelShine', 'landingPanelGrid', 'landingSceneFloor', 'landingChair']) {
      assert.match(finalCss, new RegExp(`\\.landingDemoPanel\\.hasImage \\.${selector}`));
    }
    assert.match(finalCss, /\.landingDemoPanel\.hasImage > span/);
  });
});
