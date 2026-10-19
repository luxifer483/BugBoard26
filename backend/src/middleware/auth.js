// Riconosce l'utente dal Bearer token e controlla le operazioni riservate agli amministratori.
import { User } from '../models/index.js';
import { verifyToken } from '../services/auth.js';
import { ApiError, forbidden } from './errors.js';

// Rilegge l'account dal DB a ogni richiesta: il ruolo non viene preso dal browser.
export async function authenticate(req, res, next) {
  const header = req.get('authorization');
  let claims;
  try {
    const match = /^Bearer\s+(\S+)$/i.exec(header || '');
    if (!match) throw new Error('Missing token');
    claims = verifyToken(match[1]);
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required or token invalid/expired.');
  }
  const user = await User.findByPk(claims.sub);
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required or token invalid/expired.');
  req.user = user;
  next();
}

// Blocca le operazioni amministrative per gli account normali.
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') throw forbidden();
  next();
}
