import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAiTaskPayload } from './workflowNodeAdapter.js';

const cases = [
  ['MATERIAL_GENERATE', 'material'],
  ['SCENE_GENERATE', 'replace_bg'],
  ['BACKGROUND_CLEAN', 'remove_bg'],
  ['PHOTO_ENHANCE', 'enhance'],
  ['LINEART_GENERATE', 'lineart'],
  ['MULTIVIEW_GENERATE', 'multiview'],
  ['PROMO_MAIN_GENERATE', 'promo_main_image'],
  ['PROMO_POSTER_GENERATE', 'promo_poster_image'],
  ['PROMO_DETAIL_GENERATE', 'promo_detail_image']
];

describe('workflow node adapter', () => {
  for (const [nodeType, featureKey] of cases) {
    it(`maps ${nodeType} to ${featureKey}`, () => {
      const payload = buildAiTaskPayload({
        data: {
          nodeType,
          config: {
            featureKey,
            resolution: '2K',
            ratio: '1:1',
            userPrompt: '测试要求',
            options: { keepSubject: true },
            selectedResourceId: 'resource-1',
            selectedResourceSnapshot: { id: 'resource-1', name: '测试资源' }
          }
        }
      }, 'image-current');
      assert.equal(payload.originImageId, 'image-current');
      assert.equal(payload.featureKey, featureKey);
      assert.equal(payload.resolution, '2K');
      assert.equal(payload.ratio, '1:1');
      assert.equal(payload.userPrompt, '测试要求');
      assert.equal(payload.options.keepSubject, true);
      assert.equal(payload.selectedResourceId, 'resource-1');
      assert.equal(payload.selectedResourceSnapshot.name, '测试资源');
    });
  }

  it('rejects structural nodes', () => {
    assert.throws(
      () => buildAiTaskPayload({ data: { nodeType: 'START', config: {} } }, 'image-current'),
      error => error.code === 'WORKFLOW_NODE_NOT_EXECUTABLE'
    );
  });
});
