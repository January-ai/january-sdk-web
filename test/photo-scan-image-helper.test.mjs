import assert from 'node:assert/strict';
import test from 'node:test';
import { preparePhotoScanImage } from '../dist/index.js';

test('browser photo helper preserves aspect ratio, bounds the longest edge, and emits JPEG data', async () => {
  let encoded;
  let closed = false;
  const adapter = {
    async decode() {
      return { width: 4_000, height: 2_000, source: {}, close: () => { closed = true; } };
    },
    async encodeJpeg(_image, width, height, quality) {
      encoded = { width, height, quality };
      return new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
    },
  };

  const result = await preparePhotoScanImage(new Blob(['fixture'], { type: 'image/png' }), {}, adapter);

  assert.deepEqual(encoded, { width: 1_000, height: 500, quality: 0.7 });
  assert.deepEqual({ width: result.width, height: result.height, mimeType: result.mimeType }, { width: 1_000, height: 500, mimeType: 'image/jpeg' });
  assert.equal(result.dataUri, 'data:image/jpeg;base64,AQID');
  assert.equal(closed, true);
});
