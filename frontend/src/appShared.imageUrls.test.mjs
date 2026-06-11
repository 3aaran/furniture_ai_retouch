import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { imageListUrl } from './imageUrls.js';

describe('image list URLs', () => {
  it('prefers thumbnail URLs for list rendering', () => {
    assert.equal(
      imageListUrl({ id: 'img_1', url: '/files/images/original.png', thumbUrl: '/files/images/thumbs/thumb.webp' }),
      '/api/files/images/thumbs/thumb.webp'
    );
    assert.equal(
      imageListUrl({ id: 'img_2', url: '/files/images/original.png', thumb_url: '/files/images/thumbs/thumb2.webp' }),
      '/api/files/images/thumbs/thumb2.webp'
    );
  });

  it('falls back to the original image route when no thumbnail exists', () => {
    assert.equal(
      imageListUrl({ id: 'img_3', url: '/files/images/original.png' }),
      '/api/images/img_3/view?token='
    );
  });
});
