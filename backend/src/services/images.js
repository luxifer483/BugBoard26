// Verifica i byte dell'immagine e prepara i dati da salvare, senza scrivere sul database.
import sharp from 'sharp';
import { ApiError } from '../middleware/errors.js';
import { MAX_IMAGE_BYTES } from '../middleware/upload.js';

const CONTENT_TYPES = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

// Decodifica e riscrive l'immagine per rifiutare file falsi o corrotti e rimuovere i metadati.
export async function prepareImage(file) {
  if (!file) return null;
  try {
    const image = sharp(file.buffer, { limitInputPixels: 16000000, failOn: 'warning' });
    const metadata = await image.metadata();
    const contentType = CONTENT_TYPES[metadata.format];
    if (!contentType || contentType !== file.mimetype || (metadata.pages || 1) > 1) {
      throw new Error('Unsupported image');
    }
    const data = await image.rotate().toBuffer();
    if (data.length > MAX_IMAGE_BYTES) {
      throw new ApiError(413, 'IMAGE_TOO_LARGE', 'The image must be at most 5 MB after processing.');
    }
    return { contentType, data };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'INVALID_IMAGE', 'Choose a valid PNG, JPEG or WebP image (at most 16 megapixels, without animation).');
  }
}
