// Isola la validazione delle immagini: usa sharp reale senza richiedere PostgreSQL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomFillSync } from 'node:crypto';
import sharp from 'sharp';
import { prepareImage } from '../src/services/images.js';
import { MAX_IMAGE_BYTES } from '../src/middleware/upload.js';

test('prepareImage preserves the absence of an optional image', async () => {
  assert.equal(await prepareImage(), null);
});

test('prepareImage returns a decoded PNG with private metadata removed', async () => {
  const buffer = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#123456' } })
    .withMetadata({ exif: { IFD0: { Artist: 'Private author' } } }).png().toBuffer();
  const result = await prepareImage({ buffer, mimetype: 'image/png' });
  assert.equal(result.contentType, 'image/png');
  const metadata = await sharp(result.data).metadata();
  assert.equal(metadata.width, 8);
  assert.equal(metadata.height, 6);
  assert.equal(metadata.exif, undefined);
});

test('prepareImage rejects an actual image whose MIME type is false', async () => {
  const buffer = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#123456' } }).png().toBuffer();
  await assert.rejects(prepareImage({ buffer, mimetype: 'image/jpeg' }),
    { status: 400, code: 'INVALID_IMAGE' });
});

test('prepareImage retains its defensive size limit after re-encoding', async () => {
  const pixels = randomFillSync(Buffer.alloc(1500 * 1500 * 3));
  const buffer = await sharp(pixels, { raw: { width: 1500, height: 1500, channels: 3 } }).png().toBuffer();
  assert.ok(buffer.length > MAX_IMAGE_BYTES);
  await assert.rejects(prepareImage({ buffer, mimetype: 'image/png' }),
    { status: 413, code: 'IMAGE_TOO_LARGE' });
});
