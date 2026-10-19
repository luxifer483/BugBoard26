// Gestisce lettura del proprio account e creazione/elenco utenti per gli ADMIN.
import { User, ROLES } from '../models/index.js';
import { hashPassword } from '../services/auth.js';
import { userResponse, listResponse } from '../services/responses.js';
import { ApiError } from '../middleware/errors.js';
import * as validate from '../services/validation.js';

// Restituisce l'account gia' verificato dal middleware, senza password o hash.
export function me(req, res) {
  res.json(userResponse(req.user));
}

// Legge gli account in ordine di nome; la rotta ammette soltanto gli ADMIN.
export async function list(req, res) {
  const users = await User.findAll({ order: [['fullName', 'ASC'], ['id', 'ASC']] });
  res.json(listResponse(users.map(userResponse)));
}

// Controlla i campi e salva un nuovo account con password BCrypt.
export async function create(req, res) {
  const input = validate.body(req);
  const fullName = validate.text(input.fullName, 'fullName', 120);
  const email = validate.email(input.email);
  const password = validate.password(input.password);
  const role = validate.choice(input.role, 'role', ROLES);
  if (await User.findOne({ where: { email } })) {
    throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
  }
  const user = await User.create({ fullName, email, passwordHash: await hashPassword(password), role });
  res.status(201).json(userResponse(user));
}
