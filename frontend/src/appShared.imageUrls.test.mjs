import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { imageDownloadUrl, imageFallbackUrl, imageListUrl } from './imageUrls.js';

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

  it('falls back to the signed original image URL when no thumbnail exists', () => {
    assert.equal(
      imageListUrl({ id: 'img_3', url: 'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/original.png?OSSAccessKeyId=abc' }),
      'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/original.png?OSSAccessKeyId=abc'
    );
  });

  it('uses direct signed URLs and falls back to original when a legacy thumbnail proxy is present', () => {
    const image = {
      id: 'img_4',
      url: 'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/original.png?OSSAccessKeyId=abc',
      downloadUrl: 'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/original.png?response-content-disposition=attachment',
      thumbStorageKey: 'images/thumbs/private.webp',
      thumbUrl: 'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/thumbs/private.webp?OSSAccessKeyId=abc'
    };
    assert.equal(
      imageListUrl(image, { api: '', assetBase: '', token: 'abc 123' }),
      'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/thumbs/private.webp?OSSAccessKeyId=abc'
    );
    assert.equal(
      imageFallbackUrl(image, { api: '', assetBase: '', token: 'abc 123' }),
      'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/original.png?OSSAccessKeyId=abc'
    );
    assert.equal(
      imageDownloadUrl(image, { api: '', assetBase: '', token: 'abc 123' }),
      'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/original.png?response-content-disposition=attachment'
    );
  });

  it('does not use the legacy thumbnail proxy as an image src', () => {
    assert.equal(
      imageListUrl({
        id: 'img_5',
        url: 'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/original.png?OSSAccessKeyId=abc',
        thumbUrl: '/api/images/img_5/thumb'
      }),
      'https://xungang.oss-cn-shenzhen.aliyuncs.com/images/original.png?OSSAccessKeyId=abc'
    );
  });
});
