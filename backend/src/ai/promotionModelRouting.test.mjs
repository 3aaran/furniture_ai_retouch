import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { modelFeatureKeyFor } from './taskService.js';

describe('promotion image model routing', () => {
  it('routes promotion image features through the same model feature keys as base image generation', () => {
    assert.equal(modelFeatureKeyFor('promo_main_image'), 'replace_bg');
    assert.equal(modelFeatureKeyFor('promo_poster_image'), 'replace_bg');
    assert.equal(modelFeatureKeyFor('promo_detail_image'), 'enhance');
  });

  it('keeps base image generation feature keys unchanged', () => {
    for (const key of ['material', 'replace_bg', 'remove_bg', 'enhance', 'lineart', 'multiview']) {
      assert.equal(modelFeatureKeyFor(key), key);
    }
  });
});
