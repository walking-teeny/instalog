// Marks DM logs as pushed to 본부 OS, so find-unsynced-deals.ts stops returning them.
// Usage: npm run sync:mark -- <logId> [logId...]
import './env.js';
import { db, ensureDbReady } from './db.js';

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('사용법: npm run sync:mark -- <logId> [logId...]');
  process.exit(1);
}

await ensureDbReady();
const { rowCount } = await db.query('UPDATE dm_logs SET "osSyncedAt" = NOW() WHERE id = ANY($1)', [ids]);
console.log(`${rowCount}건을 동기화 완료로 표시했습니다.`);
await db.end();
