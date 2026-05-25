// 该文件用于验证 GPT Image 2 适配器传给模型的 size 参数，确保生成规格和图片比例映射正确。
import assert from 'node:assert/strict';
import { mapImageSizeForGptImage2 } from './gpt-image-2.js';

assert.equal(mapImageSizeForGptImage2({ resolution: '1K', ratio: '1:1' }), '1024x1024');
assert.equal(mapImageSizeForGptImage2({ resolution: '2K', ratio: '1:1' }), '2048x2048');
assert.equal(mapImageSizeForGptImage2({ resolution: '4K', ratio: '1:1' }), '2880x2880');

assert.equal(mapImageSizeForGptImage2({ resolution: '2K', ratio: '4:3' }), '2560x1920');
assert.equal(mapImageSizeForGptImage2({ resolution: '2K', ratio: '3:4' }), '1920x2560');
assert.equal(mapImageSizeForGptImage2({ resolution: '4K', ratio: '16:9' }), '3840x2160');
assert.equal(mapImageSizeForGptImage2({ resolution: '4K', ratio: '9:16' }), '2160x3840');

assert.equal(mapImageSizeForGptImage2({ resolution: '2K', ratio: '自适应', imageMeta: { width: 1600, height: 1200 } }), '2560x1920');
assert.equal(mapImageSizeForGptImage2({ resolution: '2K', ratio: '自适应', imageMeta: { width: 1200, height: 1600 } }), '1920x2560');
assert.equal(mapImageSizeForGptImage2({ resolution: '4K', ratio: '自适应', imageMeta: { width: 1920, height: 1080 } }), '3840x2160');

console.log('GPT Image 2 size 参数映射通过');
