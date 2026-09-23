import { Router, type Response, type NextFunction } from 'express';
import { db } from './db.js';
import type { AuthedRequest } from './auth.js';

export const apiRouter = Router();

// Express 4 doesn't catch rejected promises from async handlers on its own;
// this routes any of them into the error-handling middleware in server/app.ts.
function ah(fn: (req: AuthedRequest, res: Response) => Promise<void>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// Every route below runs after requireAuth, so req.userId is always set;
// all queries are scoped to it so accounts never see each other's data.

// ---- Instagram profile lookup ----
// Runs server-side (not in the browser) specifically to avoid the CORS wall
// that blocks a direct fetch to instagram.com from client-side JS.

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
};
const decodeHtmlEntities = (s: string) => s.replace(/&(amp|quot|#039|apos|lt|gt);/g, (m) => HTML_ENTITIES[m] ?? m);

function extractInstagramHandle(rawUrl: string): string | null {
  const match = String(rawUrl || '').match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
  return match ? match[1].replace(/\.$/, '') : null;
}

apiRouter.get('/instagram-profile', async (req: AuthedRequest, res) => {
  const handle = extractInstagramHandle(String(req.query.url || ''));
  if (!handle) {
    return res.status(400).json({ error: '인스타그램 프로필 URL 형식이 아닙니다.' });
  }

  try {
    const igRes = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!igRes.ok) {
      return res.status(404).json({ error: '계정을 찾을 수 없거나 비공개 계정입니다.' });
    }

    const html = await igRes.text();
    const metaMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (!metaMatch) {
      return res.status(422).json({ error: '계정 정보를 읽어오지 못했습니다. (비공개 계정이거나 인스타그램이 요청을 제한했을 수 있습니다)' });
    }

    // Instagram's public og:description reads like:
    // "146K Followers, 232 Following, 96 Posts - See Instagram photos and videos from Display Name (@handle)"
    const desc = decodeHtmlEntities(metaMatch[1]);
    const parsed = desc.match(/^([\d.,]+\w*)\s+Followers,.*from (.+?)\s*\(@/);
    if (!parsed) {
      return res.status(422).json({ error: '계정 정보를 파싱하지 못했습니다.' });
    }

    res.json({ handle, nickname: parsed[2], followers: parsed[1] });
  } catch (err) {
    console.error('[instagram-profile] lookup failed:', err);
    res.status(502).json({ error: '인스타그램에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// ---- Projects ----

function rowToProject(row: any) {
  return {
    ...row,
    latestLog: row.latestLog ? JSON.parse(row.latestLog) : undefined,
  };
}

apiRouter.get(
  '/projects',
  ah(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM projects WHERE "userId" = $1 ORDER BY "createdAt" DESC', [
      req.userId,
    ]);
    res.json(rows.map(rowToProject));
  })
);

apiRouter.post(
  '/projects',
  ah(async (req, res) => {
    const p = req.body;
    await db.query(
      `INSERT INTO projects (id, "userId", name, "projectType", brand, tag, status, "statusText", "iconType", "totalSent", "repliedCount", "confirmedCount", "latestLog", "createdAt", "updatedAt", description, "osPipeline")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        p.id,
        req.userId,
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
        p.osPipeline ?? null,
      ]
    );
    res.status(201).json(p);
  })
);

apiRouter.put(
  '/projects/:id',
  ah(async (req, res) => {
    const p = req.body;
    await db.query(
      `UPDATE projects SET name=$1, "projectType"=$2, brand=$3, tag=$4, status=$5,
         "statusText"=$6, "iconType"=$7, "totalSent"=$8, "repliedCount"=$9,
         "confirmedCount"=$10, "latestLog"=$11, "createdAt"=$12, "updatedAt"=$13, description=$14, "osPipeline"=$15
       WHERE id=$16 AND "userId"=$17`,
      [
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
        p.osPipeline ?? null,
        req.params.id,
        req.userId,
      ]
    );
    res.json(p);
  })
);

apiRouter.delete(
  '/projects/:id',
  ah(async (req, res) => {
    await db.query('DELETE FROM projects WHERE id = $1 AND "userId" = $2', [req.params.id, req.userId]);
    await db.query('DELETE FROM dm_logs WHERE "projectId" = $1 AND "userId" = $2', [req.params.id, req.userId]);
    res.status(204).end();
  })
);

// ---- DM Logs ----

function rowToLog(row: any) {
  return {
    ...row,
    influencer: JSON.parse(row.influencer),
  };
}

apiRouter.get(
  '/logs',
  ah(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM dm_logs WHERE "userId" = $1 ORDER BY timestamp DESC', [
      req.userId,
    ]);
    res.json(rows.map(rowToLog));
  })
);

apiRouter.post(
  '/logs',
  ah(async (req, res) => {
    const l = req.body;
    await db.query(
      `INSERT INTO dm_logs (id, "userId", "projectId", "projectName", timestamp, "timeAgo", influencer, status, channel, "secondMessageSent", memo, "profileName")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        l.id,
        req.userId,
        l.projectId,
        l.projectName,
        l.timestamp,
        l.timeAgo,
        JSON.stringify(l.influencer),
        l.status,
        l.channel,
        !!l.secondMessageSent,
        l.memo,
        l.profileName ?? '',
      ]
    );
    res.status(201).json(l);
  })
);

apiRouter.put(
  '/logs/:id',
  ah(async (req, res) => {
    const l = req.body;
    await db.query(
      `UPDATE dm_logs SET "projectId"=$1, "projectName"=$2, timestamp=$3, "timeAgo"=$4,
         influencer=$5, status=$6, channel=$7, "secondMessageSent"=$8, memo=$9, "profileName"=$10
       WHERE id=$11 AND "userId"=$12`,
      [
        l.projectId,
        l.projectName,
        l.timestamp,
        l.timeAgo,
        JSON.stringify(l.influencer),
        l.status,
        l.channel,
        !!l.secondMessageSent,
        l.memo,
        l.profileName ?? '',
        req.params.id,
        req.userId,
      ]
    );
    res.json(l);
  })
);

apiRouter.delete(
  '/logs/:id',
  ah(async (req, res) => {
    await db.query('DELETE FROM dm_logs WHERE id = $1 AND "userId" = $2', [req.params.id, req.userId]);
    res.status(204).end();
  })
);

// ---- Widget Settings (one row per account) ----

apiRouter.get(
  '/widget-settings',
  ah(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM widget_settings WHERE "userId" = $1', [req.userId]);
    let row = rows[0];

    // Brand new accounts have no row yet; give them sensible, empty-state defaults
    // (no project to select yet) instead of leaving the client waiting on `null`.
    if (!row) {
      row = {
        userId: req.userId,
        isRecording: true,
        selectedProjectId: '',
        pairingAccount: '',
        latencyMs: 0,
        port: '',
        todayLogsCount: 0,
        lastPing: '',
        hasOpenedSettings: false,
        dismissedTooltipProfiles: '[]',
      };
      await db.query(
        `INSERT INTO widget_settings ("userId", "isRecording", "selectedProjectId", "pairingAccount", "latencyMs", port, "todayLogsCount", "lastPing", "hasOpenedSettings", "dismissedTooltipProfiles")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          row.userId,
          row.isRecording,
          row.selectedProjectId,
          row.pairingAccount,
          row.latencyMs,
          row.port,
          row.todayLogsCount,
          row.lastPing,
          row.hasOpenedSettings,
          row.dismissedTooltipProfiles,
        ]
      );
    }

    res.json({ ...row, dismissedTooltipProfiles: JSON.parse(row.dismissedTooltipProfiles || '[]') });
  })
);

apiRouter.put(
  '/widget-settings',
  ah(async (req, res) => {
    const s = req.body;
    await db.query(
      `INSERT INTO widget_settings ("userId", "isRecording", "selectedProjectId", "pairingAccount", "latencyMs", port, "todayLogsCount", "lastPing", "hasOpenedSettings", "dismissedTooltipProfiles")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT ("userId") DO UPDATE SET
         "isRecording"=$2, "selectedProjectId"=$3, "pairingAccount"=$4, "latencyMs"=$5, port=$6, "todayLogsCount"=$7, "lastPing"=$8, "hasOpenedSettings"=$9, "dismissedTooltipProfiles"=$10`,
      [
        req.userId,
        !!s.isRecording,
        s.selectedProjectId,
        s.pairingAccount,
        s.latencyMs,
        s.port,
        s.todayLogsCount,
        s.lastPing,
        !!s.hasOpenedSettings,
        JSON.stringify(s.dismissedTooltipProfiles ?? []),
      ]
    );
    res.json(s);
  })
);
