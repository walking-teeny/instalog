// Seeds the database with the app's original mock data, scoped to the first
// (admin) account, for a first-time deploy so that account's dashboard isn't
// empty. Safe to re-run: skips if that account already has data.
import './env.js';
import { db, ensureDbReady } from './db.js';
import { ensureAdminUser } from './auth.js';
import { INITIAL_PROJECTS, INITIAL_DM_LOGS } from '../src/mockData.js';

await ensureDbReady();
await ensureAdminUser();

const { rows: userRows } = await db.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
const adminUser = userRows[0] as { id: string } | undefined;

if (!adminUser) {
  console.log('[seed] No user found; skipping.');
  process.exit(0);
}

const { rows: projectCountRows } = await db.query('SELECT COUNT(*)::int AS c FROM projects WHERE "userId" = $1', [
  adminUser.id,
]);
if (projectCountRows[0].c === 0) {
  for (const p of INITIAL_PROJECTS) {
    await db.query(
      `INSERT INTO projects (id, "userId", name, "projectType", brand, tag, status, "statusText", "iconType", "totalSent", "repliedCount", "confirmedCount", "latestLog", "createdAt", "updatedAt", description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        p.id,
        adminUser.id,
        p.name,
        p.projectType,
        p.brand,
        p.tag,
        p.status,
        p.statusText,
        p.iconType,
        p.totalSent,
        p.repliedCount,
        p.confirmedCount,
        p.latestLog ? JSON.stringify(p.latestLog) : null,
        p.createdAt,
        p.updatedAt,
        p.description ?? null,
      ]
    );
  }
  console.log(`[seed] Inserted ${INITIAL_PROJECTS.length} projects for ${adminUser.id}.`);
}

const { rows: logCountRows } = await db.query('SELECT COUNT(*)::int AS c FROM dm_logs WHERE "userId" = $1', [
  adminUser.id,
]);
if (logCountRows[0].c === 0) {
  for (const l of INITIAL_DM_LOGS) {
    await db.query(
      `INSERT INTO dm_logs (id, "userId", "projectId", "projectName", timestamp, "timeAgo", influencer, status, channel, "secondMessageSent", memo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        l.id,
        adminUser.id,
        l.projectId,
        l.projectName,
        l.timestamp,
        l.timeAgo,
        JSON.stringify(l.influencer),
        l.status,
        l.channel,
        !!l.secondMessageSent,
        l.memo,
      ]
    );
  }
  console.log(`[seed] Inserted ${INITIAL_DM_LOGS.length} DM logs for ${adminUser.id}.`);
}

const { rows: widgetRows } = await db.query('SELECT "userId" FROM widget_settings WHERE "userId" = $1', [
  adminUser.id,
]);
if (!widgetRows[0]) {
  await db.query(
    `INSERT INTO widget_settings ("userId", "isRecording", "selectedProjectId", "pairingAccount", "latencyMs", port, "todayLogsCount", "lastPing")
     VALUES ($1, true, $2, '@beauty_commerce_kr', 84, '9224', 142, '방금 전')`,
    [adminUser.id, INITIAL_PROJECTS[0]?.id || '']
  );
  console.log(`[seed] Inserted default widget settings for ${adminUser.id}.`);
}

console.log('[seed] Done.');
await db.end();
