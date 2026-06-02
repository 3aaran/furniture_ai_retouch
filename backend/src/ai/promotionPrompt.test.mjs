import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAiPrompt, buildExtraRequirements, featureNameMap } from './promptService.js';

describe('promotion image prompts', () => {
  it('builds poster prompts from the same featureKey/options flow as image generation', () => {
    const options = {
      posterTextMode: 'custom',
      posterText: '舒适入座\n自然木质',
      posterCopyPlacement: '右侧留白',
      posterTone: '温暖家居'
    };
    const prompt = buildAiPrompt({
      featureKey: 'promo_poster_image',
      userPrompt: '适合朋友圈活动海报',
      options,
      resolution: '1K',
      ratio: '4:3'
    });

    assert.equal(featureNameMap.promo_poster_image, '广告海报图');
    assert.match(prompt, /任务目标：\n进行基于广告海报图的图生图。/);
    assert.match(prompt, /广告海报图/);
    assert.match(prompt, /海报文案：舒适入座；自然木质/);
    assert.match(prompt, /文案区域：右侧留白/);
    assert.match(prompt, /海报氛围：温暖家居/);
    assert.match(prompt, /不要生成无意义文字、乱码文字、错误中文或伪文字/);
    assert.match(prompt, /画面比例：4:3/);
    assert.match(prompt, /分辨率：1K/);
  });

  it('adds fixed options for main and detail promotion images', () => {
    const mainRequirements = buildExtraRequirements('promo_main_image', {
      mainBackground: '暖灰渐变商业摄影背景',
      mainComposition: '主体居中',
      mainWhitespace: '少量留白'
    });
    const detailRequirements = buildExtraRequirements('promo_detail_image', {
      detailLayout: '四宫格',
      detailFocus: '材质纹理、边角工艺',
      detailTextMode: '留白不生成文字'
    });

    assert.deepEqual(mainRequirements, [
      '背景风格：暖灰渐变商业摄影背景',
      '主图构图：主体居中',
      '留白要求：少量留白',
      '产品主图默认不生成标题、价格、品牌文字、Logo、水印或促销标签。'
    ]);
    assert.deepEqual(detailRequirements, [
      '细节排版：四宫格',
      '细节重点：材质纹理、边角工艺',
      '文字策略：留白不生成文字',
      '产品细节图必须以局部细节、多区域细节展示为主，不要把完整家具作为主体大图。'
    ]);
  });
});
