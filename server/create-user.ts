// CLI: creates a new InstaLog account without going through Claude or a signup form.
// Usage: npm run create-user -- <username> <password>
import './env.js';
import bcrypt from 'bcryptjs';
import { db, ensureDbReady } from './db.js';

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error('사용법: npm run create-user -- <아이디> <비밀번호>');
  process.exit(1);
}

await ensureDbReady();

const { rows } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
if (rows[0]) {
  console.error(`이미 사용 중인 아이디입니다: ${username}`);
  process.exit(1);
}

const id = `user_${Date.now()}`;
const passwordHash = bcrypt.hashSync(password, 10);
await db.query('INSERT INTO users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)', [
  id,
  username,
  passwordHash,
  new Date().toISOString(),
]);

console.log(`계정이 생성되었습니다: ${username}`);
await db.end();
