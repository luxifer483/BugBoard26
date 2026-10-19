// Converte gli errori in risposte JSON compatibili con il frontend esistente.
import { UniqueConstraintError, ValidationError, ForeignKeyConstraintError, DatabaseError } from 'sequelize';

export class ApiError extends Error {
  constructor(status, code, message, errors = {}) {
    super(message);
    Object.assign(this, { status, code, errors });
  }
}

export const notFound = (resource) => new ApiError(404, 'NOT_FOUND', `${resource} not found.`);
export const forbidden = () => new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this operation.');

// Invia un errore uniforme, senza esporre query, password o dettagli interni.
export function errors(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = status === 500 ? 'An unexpected error occurred.' : error.message;
  let fields = error.errors instanceof Array ? {} : error.errors || {};
  if (error instanceof UniqueConstraintError) {
    const email = error.errors.some((item) => item.path === 'email');
    status = 409;
    code = email ? 'EMAIL_EXISTS' : 'CONFLICT';
    message = email ? 'An account with this email already exists.' : 'The operation conflicts with existing data.';
  } else if (error instanceof ValidationError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Check the submitted fields.';
    fields = Object.fromEntries(error.errors.map((item) => [item.path, item.message]));
  } else if (error instanceof ForeignKeyConstraintError) {
    status = 409; code = 'CONFLICT'; message = 'The operation conflicts with existing data.';
  } else if (error instanceof DatabaseError) {
    status = 500; code = 'INTERNAL_ERROR'; message = 'An unexpected error occurred.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_REQUEST'; message = 'The request contains missing or invalid values.';
  } else if (error.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'The request body is too large.';
  }
  res.status(status).json({ timestamp: new Date().toISOString(), status, code, message,
    path: req.originalUrl.split('?')[0], errors: fields });
}
