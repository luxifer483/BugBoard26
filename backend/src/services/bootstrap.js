// Crea l'admin iniziale di sviluppo senza cambiare account o password gia' presenti.
import { User } from '../models/index.js';
import { hashPassword } from './auth.js';
import * as validate from './validation.js';

// Inserisce il primo admin solo quando manca e l'ambiente e' quello di sviluppo.
export async function bootstrapAdmin() {
  if ((process.env.NODE_ENV || 'development') !== 'development') return;
  const email = validate.email(process.env.ADMIN_EMAIL || 'admin@bugboard26.dev');
  if (await User.findOne({ where: { email } })) return;
  const password = validate.password(process.env.ADMIN_PASSWORD || 'ChangeMe123!');
  await User.findOrCreate({ where: { email }, defaults: {
    fullName: validate.text(process.env.ADMIN_FULL_NAME || 'BugBoard Administrator', 'fullName', 120),
    passwordHash: await hashPassword(password), role: 'ADMIN',
  } });
}
