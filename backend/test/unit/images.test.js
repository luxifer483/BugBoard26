// Isola la validazione delle immagini: usa sharp reale senza richiedere PostgreSQL.
import '../setup.js';
import QUnit from 'qunit';
import { randomFillSync } from 'node:crypto';
import sharp from 'sharp';
import { prepareImage } from '../../src/services/images.js';
import { MAX_IMAGE_BYTES } from '../../src/middleware/upload.js';

// Mantiene i test QUnit riconoscibili anche all'analisi statica SonarQube.
const { test } = QUnit;

QUnit.module('Unita prepareImage', () => {
  // Verifica che non scegliere una immagine restituisca null senza elaborazioni.
  test('prepareImage preserves the absence of an optional image', async (assert) => {
    assert.strictEqual(await prepareImage(), null);
  });

  // Verifica la decodifica PNG e la rimozione dei metadati privati.
  test('prepareImage returns a decoded PNG with private metadata removed', async (assert) => {
    const buffer = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#123456' } })
      .withMetadata({ exif: { IFD0: { Artist: 'Private author' } } }).png().toBuffer();
    const result = await prepareImage({ buffer, mimetype: 'image/png' });
    assert.strictEqual(result.contentType, 'image/png');
    const metadata = await sharp(result.data).metadata();
    assert.strictEqual(metadata.width, 8);
    assert.strictEqual(metadata.height, 6);
    assert.strictEqual(metadata.exif, undefined);
  });

  // Verifica il rifiuto di una immagine reale con tipo MIME dichiarato falso.
  test('prepareImage rejects an actual image whose MIME type is false', async (assert) => {
    const buffer = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#123456' } }).png().toBuffer();
    await assert.rejects(prepareImage({ buffer, mimetype: 'image/jpeg' }),
      (error) => error.status === 400 && error.code === 'INVALID_IMAGE');
  });

  // Verifica il controllo della dimensione anche dopo la ricodifica della immagine.
  test('prepareImage retains its defensive size limit after re-encoding', async (assert) => {
    const pixels = randomFillSync(Buffer.alloc(1500 * 1500 * 3));
    const buffer = await sharp(pixels, { raw: { width: 1500, height: 1500, channels: 3 } }).png().toBuffer();
    assert.ok(buffer.length > MAX_IMAGE_BYTES);
    await assert.rejects(prepareImage({ buffer, mimetype: 'image/png' }),
      (error) => error.status === 413 && error.code === 'IMAGE_TOO_LARGE');
  });

});
