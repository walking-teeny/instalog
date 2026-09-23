import { Pool } from 'pg';

// Vercel Postgres / Neon / any standard Postgres connection string.
export const db = new Pool({ connectionString: process.env.POSTGRES_URL });

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      "projectType" TEXT NOT NULL,
      brand TEXT NOT NULL,
      tag TEXT NOT NULL,
      status TEXT NOT NULL,
      "statusText" TEXT NOT NULL,
      "iconType" TEXT NOT NULL,
      "totalSent" INTEGER NOT NULL DEFAULT 0,
      "repliedCount" INTEGER NOT NULL DEFAULT 0,
      "confirmedCount" INTEGER NOT NULL DEFAULT 0,
      "latestLog" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS dm_logs (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL DEFAULT '',
      "projectId" TEXT NOT NULL,
      "projectName" TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      "timeAgo" TEXT NOT NULL,
      influencer TEXT NOT NULL,
      status TEXT NOT NULL,
      channel TEXT NOT NULL,
      "secondMessageSent" BOOLEAN NOT NULL DEFAULT false,
      memo TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS widget_settings (
      "userId" TEXT PRIMARY KEY,
      "isRecording" BOOLEAN NOT NULL,
      "selectedProjectId" TEXT NOT NULL,
      "pairingAccount" TEXT NOT NULL,
      "latencyMs" INTEGER NOT NULL,
      port TEXT NOT NULL,
      "todayLogsCount" INTEGER NOT NULL,
      "lastPing" TEXT NOT NULL
    );

    ALTER TABLE widget_settings ADD COLUMN IF NOT EXISTS "hasOpenedSettings" BOOLEAN NOT NULL DEFAULT false;

    -- NULL = not yet pushed to 본부 OS as a deal; set once server/mark-deals-synced.ts
    -- confirms the add_deal call succeeded. New rows default to NULL automatically.
    ALTER TABLE dm_logs ADD COLUMN IF NOT EXISTS "osSyncedAt" TIMESTAMPTZ;

    -- Which profile (picked on the OTT-style profile screen after login) entered this log.
    ALTER TABLE dm_logs ADD COLUMN IF NOT EXISTS "profileName" TEXT NOT NULL DEFAULT '';

    -- Which 본부 OS 파이프라인 this project's dm_logs become deals in (see find-unsynced-deals.ts).
    -- NULL/empty = not connected yet, so its logs sit in "unmapped" instead of silently guessing.
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS "osPipeline" TEXT;

    -- Profile names (per this account) that have dismissed the "인스타그램과 연동하세요" tooltip.
    -- Server-persisted (not localStorage) so dismissal survives across devices/browsers,
    -- same guarantee "hasOpenedSettings" used to give before it was replaced by this,
    -- but now scoped per profile instead of per account. JSON array of profile-name strings.
    ALTER TABLE widget_settings ADD COLUMN IF NOT EXISTS "dismissedTooltipProfiles" TEXT NOT NULL DEFAULT '[]';
  `);
}

// Runs once per cold start (cached across requests in the same warm serverless instance).
let ready: Promise<void> | null = null;
export function ensureDbReady(): Promise<void> {
  if (!ready) ready = migrate();
  return ready;
}
