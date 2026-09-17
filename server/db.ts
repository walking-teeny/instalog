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
  `);
}

// Runs once per cold start (cached across requests in the same warm serverless instance).
let ready: Promise<void> | null = null;
export function ensureDbReady(): Promise<void> {
  if (!ready) ready = migrate();
  return ready;
}
