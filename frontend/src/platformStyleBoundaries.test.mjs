import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('platform style boundaries', () => {
  it('delegates the main style entry to the web platform entry', () => {
    const index = read('./styles/index.css');
    assert.match(index, /platforms\/web\/index\.css/);
  });

  it('shares the current web visual system between desktop and mobile before platform corrections', () => {
    const base = read('./styles/platforms/web/base.css');
    assert.match(base, /pages\/workbench\/index\.css/);
    assert.match(base, /pages\/resources\/index\.css/);
    assert.match(base, /overrides\/final-fixes\.css/);
    assert.match(base, /overrides\/studio-workbench\.css/);
    assert.match(base, /overrides\/stitch-premium-layout\.css/);
  });

  it('keeps desktop and mobile layers as small viewport-specific correction layers', () => {
    const webIndex = read('./styles/platforms/web/index.css');
    const desktop = read('./styles/platforms/web/desktop.css');
    const mobile = read('./styles/platforms/web/mobile.css');
    assert.match(webIndex, /base\.css/);
    assert.match(webIndex, /desktop\.css' screen and \(min-width:861px\)/);
    assert.match(webIndex, /mobile\.css' screen and \(max-width:860px\)/);
    assert.doesNotMatch(desktop, /overrides\/mobile-app\.css/);
    assert.match(mobile, /mobile\/index\.css/);
    assert.match(mobile, /overrides\/mobile-app\.css/);
  });
});
