/**
 * 이 확장 프로그램이 데이터를 기록할 InstaLog 서버 주소입니다.
 * ⚠️ 실제 서버에 배포한 뒤에는 아래 주소를 배포된 주소로 바꾸고,
 *    manifest.json의 host_permissions에도 같은 주소를 추가해주세요.
 */
const INSTALOG_API_BASE = 'https://instalog-nu.vercel.app';

/**
 * ===================================================================
 * content.js와 profile_watcher.js가 공통으로 쓰는 헬퍼
 * (두 content script 모두 manifest.json에서 이 파일을 먼저 로드합니다)
 * ===================================================================
 */

/** "YYYY-MM-DD HH:MM:SS" 형식 타임스탬프 (InstaLog 앱과 동일한 형식) */
function ilNowTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 같은 프로젝트 안에, 이미 기록되어 있는 이 계정의 로그가 있는지 찾습니다. (있으면 가장 최근 것) */
async function ilFindExistingLog(token, projectId, username) {
  const res = await fetch(`${INSTALOG_API_BASE}/api/logs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const logs = await res.json();
  const matches = logs
    .filter((l) => l.projectId === projectId && l.influencer.handle.toLowerCase() === username.toLowerCase())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return matches[0] || null;
}

/** 대시보드 통계(발송 건수/최근 업데이트)가 갱신되도록, 해당 프로젝트도 함께 업데이트합니다. */
async function ilBumpProjectStats(token, projectId, log, { action, incrementTotalSent }) {
  try {
    const res = await fetch(`${INSTALOG_API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const projects = await res.json();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const updated = {
      ...project,
      totalSent: incrementTotalSent ? (project.totalSent || 0) + 1 : project.totalSent,
      latestLog: {
        handle: `@${log.influencer.handle}`,
        action,
        timeAgo: '방금',
      },
      updatedAt: log.timestamp,
    };

    await fetch(`${INSTALOG_API_BASE}/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updated),
    });
  } catch (err) {
    console.warn('[InstaLog]', '프로젝트 통계 갱신 실패:', err);
  }
}
