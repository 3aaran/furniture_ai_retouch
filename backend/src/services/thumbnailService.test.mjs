import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { thumbnailAccessUrl, thumbnailStorageKeyFromImage, visibleThumbnailUrl } from './thumbnailService.js';

describe('thumbnail service helpers', () => {
  it('builds a thumbnail key without replacing the original image key', () => {
    const image = {
      id: 'img_1',
      url: '/files/images/merchants/m1/users/u1/generated/2026/06/11/original.png',
      storage_key: 'images/merchants/m1/users/u1/generated/2026/06/11/original.png'
    };

    assert.equal(
      thumbnailStorageKeyFromImage(image),
      'images/thumbs/merchants/m1/users/u1/generated/2026/06/11/original-thumb.webp'
    );
    assert.equal(image.url, '/files/images/merchants/m1/users/u1/generated/2026/06/11/original.png');
  });

  it('uses thumb_url for list display and falls back to url', () => {
    assert.equal(visibleThumbnailUrl({ thumb_url: '/files/thumb.webp', url: '/files/original.png' }), '/files/thumb.webp');
    assert.equal(visibleThumbnailUrl({ thumbUrl: '/files/thumb2.webp', url: '/files/original2.png' }), '/files/thumb2.webp');
    assert.equal(visibleThumbnailUrl({ url: '/files/original3.png' }), '/files/original3.png');
  });

  it('uses the backend proxy path when a private thumbnail storage key exists', () => {
    assert.equal(
      thumbnailAccessUrl({ id: 'img_oss_1', thumb_storage_key: 'images/thumbs/private.webp', thumb_url: 'https://bucket.oss/private.webp' }),
      '/api/images/img_oss_1/thumb'
    );
  });
});
