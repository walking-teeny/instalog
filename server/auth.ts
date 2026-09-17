import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-in-production';
const TOKEN_TTL = '7d';

// Each account's data is fully isolated (own projects/logs/widget settings),
// so every authenticated route needs to know which account is calling it.
export interface AuthedRequest extends Request {
  userId?: string;
}

// First-boot convenience: create the admin user from env vars if no users exist yet,
// so a fresh cloud deploy doesn't need a manual seed step.
export async function ensureAdminUser() {
  const { rows } = await db.query('SELECT COUNT(*)::int AS c FROM users');
  if (rows[0].c > 0) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = bcrypt.hashSync(password, 10);

  await db.query('INSERT INTO users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)', [
    `user_${Date.now()}`,
    username,
    passwordHash,
    new Date().toISOString(),
  ]);

  console.log(`[auth] Created default admin user "${username}". Set ADMIN_USERNAME/ADMIN_PASSWORD env vars to change this.`);
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' });
  }

  const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0] as { id: string; username: string; password_hash: string } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token, username: user.username });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '인증이 필요합니다.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
  }
}
