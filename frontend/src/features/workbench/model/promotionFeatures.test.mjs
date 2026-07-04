import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PROMOTION_KEY,
  buildPromotionOptions,
  getPromotionFeature,
  promotionFeatureKeys
} from './promotionFeatures.js';

describe('promotion feature configuration', () => {
  it('defines the first-stage promotion image feature set from the proposal', () => {
    assert.deepEqual(promotionFeatureKeys, [
      'promo_main_image',
      'promo_poster_image',
      'promo_detail_image'
    ]);

    assert.equal(DEFAULT_PROMOTION_KEY, 'promo_main_image');
    assert.equal(getPromotionFeature('promo_main_image').name, '产品主图');
    assert.equal(getPromotionFeature('promo_poster_image').name, '广告海报图');
    assert.equal(getPromotionFeature('promo_detail_image').name, '产品细节图');
  });

  it('uses the same generation controls as the base image features', () => {
    const options = buildPromotionOptions({
      featureKey: 'promo_poster_image',
      ratio: '4:3',
      resolution: '1K',
      posterTextMode: 'custom',
      posterText: '舒适入座\n自然木质',
      posterCopyPlacement: '右侧留白',
      posterTone: '温暖家居'
    });

    assert.equal(options.promotionType, '广告海报图');
    assert.equal(options.ratio, '4:3');
    assert.equal(options.resolution, '1K');
    assert.equal(options.posterTextMode, 'custom');
    assert.equal(options.posterText, '舒适入座\n自然木质');
    assert.equal(options.posterCopyPlacement, '右侧留白');
    assert.equal(options.posterTone, '温暖家居');
    assert.equal('promotionStyle' in options, false);
    assert.equal('copySpace' in options, false);
    assert.match(options.promptTemplate, /广告海报图/);
    assert.match(options.promptTemplate, /预留明显的干净留白区域/);
    assert.match(options.promptTemplate, /不要直接生成文字/);
  });

  it('provides fixed option defaults for every promotion feature', () => {
    assert.deepEqual(buildPromotionOptions({ featureKey: 'promo_main_image' }), {
      taskType: 'PROMO_MAIN_IMAGE',
      promotionType: '产品主图',
      ratio: '自适应',
      resolution: '2K',
      mainBackground: '暖灰渐变商业摄影背景',
      mainComposition: '主体居中',
      mainWhitespace: '少量留白',
      promptTemplate: getPromotionFeature('promo_main_image').promptTemplate,
      keepSubject: true,
      forbidGeneratedText: true,
      forbidLogo: true,
      forbidPeople: true
    });

    const detailOptions = buildPromotionOptions({ featureKey: 'promo_detail_image' });
    assert.equal(detailOptions.detailLayout, '四宫格');
    assert.equal(detailOptions.detailFocus, '材质纹理、边角工艺');
    assert.equal(detailOptions.detailTextMode, '留白不生成文字');
  });
});
