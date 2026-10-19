// Prepara Express, CORS, rotte ed errori; importare questo file non avvia alcun server.
import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import { ApiError, errors, notFound } from './middleware/errors.js';

const app = express();
const origins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim());
app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    callback(new ApiError(403, 'FORBIDDEN', 'Access denied.'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', routes);
app.use((req, res, next) => next(notFound('Endpoint')));
app.use(errors);

export default app;
