// Verifica password BCrypt e prepara JWT con le stesse impostazioni del backend Spring.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiError } from '../middleware/errors.js';

const development = (process.env.NODE_ENV || 'development') === 'development';
const secret = process.env.JWT_SECRET || (development
  ? 'bugboard26-development-only-secret-change-before-deploying' : '');
if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('JWT_SECRET must contain at least 32 UTF-8 bytes.');
const ttl = Number(process.env.JWT_TTL_SECONDS || 3600);
if (!Number.isSafeInteger(ttl) || ttl < 60) throw new Error('JWT_TTL_SECONDS must be an integer of at least 60.');

export const jwtSettings = {
  key: Buffer.from(secret, 'utf8'),
  issuer: process.env.JWT_ISSUER || 'bugboard26',
  audience: process.env.JWT_AUDIENCE || 'bugboard26-frontend',
};
const dummyHash = await bcrypt.hash('unused-login-timing-placeholder', 10);

export const invalidCredentials = () => new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

// Confronta anche gli hash $2a$ gia' salvati da Spring, senza modificarli.
export async function matchesPassword(value, hash) {
  const valid = typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72;
  const matches = await bcrypt.compare(valid ? value : 'invalid-length-placeholder', hash || dummyHash);
  return valid && Boolean(hash) && matches;
}

// Prepara l'hash da salvare per una nuova password.
export function hashPassword(value) {
  return bcrypt.hash(value, 10);
}

// Crea un token firmato e la data di scadenza, senza inserire password nel contenuto.
export function createToken(user) {
  const token = jwt.sign({}, jwtSettings.key, {
    algorithm: 'HS256', subject: String(user.id), issuer: jwtSettings.issuer,
    audience: jwtSettings.audience, expiresIn: ttl,
  });
  return { token, expiresAt: new Date(jwt.decode(token).exp * 1000).toISOString() };
}

// Controlla firma, scadenza, destinatario e identita' contenuti nel token ricevuto.
export function verifyToken(token) {
  const claims = jwt.verify(token, jwtSettings.key, {
    algorithms: ['HS256'], issuer: jwtSettings.issuer, audience: jwtSettings.audience,
    clockTolerance: 60,
  });
  if (typeof claims.sub !== 'string' || !/^[1-9]\d*$/.test(claims.sub)
      || BigInt(claims.sub) > 9223372036854775807n || typeof claims.exp !== 'number') {
    throw new Error('Invalid token claims');
  }
  return claims;
}
