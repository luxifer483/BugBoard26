// Riceve le credenziali e restituisce il token di accesso e l'utente pubblico.
import { User } from '../models/index.js';
import { matchesPassword, createToken, invalidCredentials } from '../services/auth.js';
import { userResponse } from '../services/responses.js';
import * as validate from '../services/validation.js';

// Non distingue nella risposta tra email inesistente e password sbagliata.
export async function login(req, res) {
  const input = validate.body(req);
  const email = validate.email(input.email);
  if (typeof input.password !== 'string' || !input.password.trim()) validate.invalid('password', 'must not be blank');
  if (input.password.length > 72) validate.invalid('password', 'must contain at most 72 characters');
  const user = await User.findOne({ where: { email } });
  const matches = await matchesPassword(input.password, user?.passwordHash);
  if (!user || !matches) throw invalidCredentials();
  res.json({ ...createToken(user), user: userResponse(user) });
}
