// Prints how many DM logs (across all accounts) are still unsynced to 본부 OS.
// Used by run-deal-sync.sh to compute how many deals a sync run actually added.
import './env.js';
import { db, ensureDbReady } from './db.js';

await ensureDbReady();
const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM dm_logs WHERE "osSyncedAt" IS NULL');
console.log(rows[0].n);
await db.end();
