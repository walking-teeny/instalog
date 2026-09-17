// CLI: resets an existing account's password without needing the old one (admin action).
// Usage: npm run reset-password -- <username> <new-password>
import './env.js';
import bcrypt from 'bcryptjs';
import { db, ensureDbReady } from './db.js';

const [username, newPassword] = process.argv.slice(2);

if (!username || !newPassword) {
  console.error('사용법: npm run reset-password -- <아이디> <새 비밀번호>');
  process.exit(1);
}

await ensureDbReady();

const { rows } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
const user = rows[0] as { id: string } | undefined;
if (!user) {
  console.error(`존재하지 않는 아이디입니다: ${username}`);
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(newPassword, 10);
await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);

console.log(`비밀번호가 변경되었습니다: ${username}`);
await db.end();
