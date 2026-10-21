// Riceve una sola immagine in memoria e limita la dimensione prima del controller.
import multer from 'multer';
import { ApiError } from './errors.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 8, parts: 9, fieldSize: 40000 },
  fileFilter(req, file, callback) {
    if (!IMAGE_TYPES.includes(file.mimetype)) {
      return callback(new ApiError(400, 'INVALID_IMAGE', 'Choose a PNG, JPEG or WebP image.'));
    }
    callback(null, true);
  },
}).single('image');
