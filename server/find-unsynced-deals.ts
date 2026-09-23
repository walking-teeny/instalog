// Read-only: lists DM logs not yet pushed to 본부 OS as deals, grouped by the
// pipeline they map to. A scheduled Claude task runs this, calls add_deal for
// each group via the fanding-os MCP connector, then runs mark-deals-synced.ts
// with the ids that succeeded.
// Usage: npm run sync:find
import './env.js';
import { db, ensureDbReady } from './db.js';

type Influencer = { handle: string; nickname: string; profileUrl: string };
type DmStatus = 'waiting' | 'list_up' | 'in_talks' | 'confirmed' | 'rejected' | '';

// instalog 소통 상태 -> 본부 OS 단계(이 두 파이프라인 한정 — 다른 파이프라인은 "리스트업" 등 다른 이름을 쓴다).
const STAGE_BY_DM_STATUS: Record<string, string> = {
  waiting: '컨택 이전',
  list_up: '컨택 이전',
  in_talks: '컨택 중',
  confirmed: '계약 체결',
  rejected: '보류·거절',
};

// 본부 OS 단계 -> 상태(add_deal의 status enum: 진행/성사/불발)
const OS_STATUS_BY_STAGE: Record<string, '진행' | '성사' | '불발'> = {
  '컨택 이전': '진행',
  '컨택 중': '진행',
  '계약 체결': '성사',
  '보류·거절': '불발',
};

await ensureDbReady();

const { rows } = await db.query<{
  id: string;
  projectId: string;
  projectName: string;
  influencer: string;
  status: DmStatus;
  profileName: string;
  username: string;
  osPipeline: string | null;
}>(
  `SELECT l.id, l."projectId", l."projectName", l.influencer, l.status, l."profileName", u.username, p."osPipeline"
   FROM dm_logs l
   JOIN users u ON u.id = l."userId"
   JOIN projects p ON p.id = l."projectId"
   WHERE l."osSyncedAt" IS NULL ORDER BY l.timestamp ASC`
);

// add_deal은 stage/status를 호출 전체에 한 번만 받는다(타깃별 지정 불가) — 그래서
// 프로젝트만이 아니라 (프로젝트, 단계) 조합별로 그룹을 나눠, 그룹당 한 번의 add_deal
// 호출로 stage/status를 맞춰 보낸다.
const groups = new Map<
  string,
  { projectId: string; projectName: string; pipeline: string; stage: string; status: string; targets: { logId: string; name: string; url: string; kind: string; owners: string[] }[] }
>();
const unmapped: { projectId: string; projectName: string; logIds: string[] }[] = [];

for (const row of rows) {
  const influencer = JSON.parse(row.influencer) as Influencer;
  const name = influencer.nickname || `@${influencer.handle}`;
  const stage = STAGE_BY_DM_STATUS[row.status] || '컨택 이전';
  const status = OS_STATUS_BY_STAGE[stage];

  const pipeline = row.osPipeline;
  if (!pipeline) {
    const bucket = unmapped.find((u) => u.projectId === row.projectId);
    if (bucket) bucket.logIds.push(row.id);
    else unmapped.push({ projectId: row.projectId, projectName: row.projectName, logIds: [row.id] });
    continue;
  }

  const groupKey = `${row.projectId}::${stage}`;
  if (!groups.has(groupKey)) {
    groups.set(groupKey, { projectId: row.projectId, projectName: row.projectName, pipeline, stage, status, targets: [] });
  }
  groups.get(groupKey)!.targets.push({
    logId: row.id,
    name,
    url: influencer.profileUrl,
    kind: 'influencer', // 본부 OS의 실제 저장값 — 화면엔 "인플루언서"로 보이지만 한글로 보내면 새 옵션이 생겨버린다
    // instalog 프로필(담당자) 그대로 — 프로필 기능 도입 이전의 예전 로그처럼 비어 있으면,
    // 특정 계정 이름을 하드코딩하는 대신 그 로그를 실제로 남긴 instalog 계정명으로 대체한다
    // (여러 계정이 함께 동기화되므로 어느 계정 하나의 이름을 기본값으로 박아두면 안 된다).
    owners: [row.profileName || row.username],
  });
}

console.log(JSON.stringify({ groups: [...groups.values()], unmapped }, null, 2));
await db.end();
