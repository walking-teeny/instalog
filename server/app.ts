import './env.js';
import express from 'express';
import cors from 'cors';
import { login, requireAuth, ensureAdminUser } from './auth.js';
import { apiRouter } from './routes.js';
import { ensureDbReady } from './db.js';

// Runs once per cold start (serverless) or process start (long-running server):
// creates tables if missing, then the default admin account if the users table is empty.
let ready: Promise<void> | null = null;
function ensureAppReady() {
  if (!ready) ready = ensureDbReady().then(() => ensureAdminUser());
  return ready;
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    ensureAppReady().then(() => next(), next);
  });

  app.post('/api/auth/login', login);
  app.use('/api', requireAuth, apiRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server] unhandled error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  });

  return app;
}
