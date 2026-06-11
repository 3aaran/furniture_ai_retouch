import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDownloadContentDisposition,
  buildSignedImageUrl,
  imageSignedAccessFields
} from './storageService.js';

describe('signed image access helpers', () => {
  it('keeps Chinese download names compatible with filename and filename*', () => {
    const value = buildDownloadContentDisposition('沙发 原图.png');
    assert.match(value, /^attachment; filename=".*"; filename\*=UTF-8''/);
    assert.match(value, /filename="__ __\.png"/);
    assert.match(value, /filename\*=UTF-8''%E6%B2%99%E5%8F%91%20%E5%8E%9F%E5%9B%BE\.png/);
  });

  it('builds local URLs from storage keys without using the backend thumbnail proxy', () => {
    assert.equal(buildSignedImageUrl('images/thumbs/a.webp'), '/files/images/thumbs/a.webp');
    const access = imageSignedAccessFields({
      id: 'img_1',
      url: '/files/images/original.png',
      storage_key: 'images/original.png',
      thumb_storage_key: 'images/thumbs/original-thumb.webp',
      original_name: '原图.png'
    });
    assert.equal(access.url, '/files/images/original.png');
    assert.equal(access.thumbUrl, '/files/images/thumbs/original-thumb.webp');
    assert.equal(access.downloadUrl, '/files/images/original.png');
  });
});
