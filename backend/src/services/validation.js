// Controlla i dati ricevuti prima di eseguire scritture sul database.
import validator from 'validator';
import { ApiError } from '../middleware/errors.js';

// Controlla che la richiesta contenga un oggetto JSON e non un array o un valore singolo.
export function body(req) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'The request contains missing or invalid values.');
  }
  return req.body;
}

export function invalid(field, message) {
  throw new ApiError(400, 'VALIDATION_ERROR', 'Check the submitted fields.', { [field]: message });
}

export function text(value, field, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    invalid(field, `must not be blank and must contain at most ${max} characters`);
  }
  return value.trim();
}

export function email(value) {
  const normalized = text(value, 'email', 254).toLowerCase();
  if (!validator.isEmail(normalized)) invalid('email', 'must be a well-formed email address');
  return normalized;
}

export function choice(value, field, allowed) {
  if (!allowed.includes(value)) invalid(field, `must be one of ${allowed.join(', ')}`);
  return value;
}

// Mantiene gli ID come stringhe per non perdere precisione nei BIGINT di PostgreSQL.
export function id(value, field = 'id', optional = false) {
  if (optional && (value === null || value === undefined)) return null;
  if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))
      || (typeof value === 'number' && !Number.isSafeInteger(value))
      || BigInt(value) > 9223372036854775807n) {
    throw new ApiError(400, 'INVALID_REQUEST', `Invalid ${field}.`);
  }
  return String(value);
}

// BCrypt considera al massimo 72 byte: il controllo evita password troncate.
export function password(value) {
  if (typeof value !== 'string' || !value.trim() || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Password must contain at least 8 characters and at most 72 UTF-8 bytes.');
  }
  return value;
}
