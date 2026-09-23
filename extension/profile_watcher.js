/**
 * ===================================================================
 * InstaLog - 프로필 페이지 감시 스크립트 (profile_watcher.js)
 * ===================================================================
 * 동작 방식:
 * 1) InstaLog에 기록된 계정의 인스타그램 프로필 페이지를 열람하면,
 *    이 스크립트가 화면에 이미 렌더링된 팔로워 수와 실제 이름(닉네임)을 그대로 읽습니다.
 *    (인스타그램 내부 API를 따로 호출하지 않으므로, DM 화면에서 API를 직접
 *     불러오다가 걸리던 429(요청 너무 잦음) 문제와 무관합니다)
 * 2) 읽어온 값을, InstaLog에 이미 기록되어 있고 해당 값이 비어있는 로그에만 채워 넣습니다.
 *    (이미 값이 있으면 덮어쓰지 않습니다) 이 스크립트는 새 로그를 추가하지 않습니다 —
 *    오직 DM 발송 감지(content.js)만 새 로그를 추가합니다.
 * ===================================================================
 */

const PW_TAG = '[InstaLog · 프로필 감시]';

const PW_SYSTEM_PATHS = ['direct', 'explore', 'accounts', 'reels', 'p', 'stories', ''];

function pwExtractUsernameFromPath_(pathname) {
  const match = String(pathname || '').match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
  if (match && !PW_SYSTEM_PATHS.includes(match[1])) return match[1];
  return null;
}

/**
 * "1.2만", "12.3K", "1.2M", "12,345" 같은 다양한 표기를 실제 숫자로 변환합니다.
 */
function pwParseAbbreviatedNumber_(text) {
  if (!text) return null;
  const t = String(text).trim().replace(/,/g, '');
  if (/^\d+$/.test(t)) return parseInt(t, 10);

  let m = t.match(/^([\d.]+)\s*만$/);
  if (m) return Math.round(parseFloat(m[1]) * 10000);

  m = t.match(/^([\d.]+)\s*천$/);
  if (m) return Math.round(parseFloat(m[1]) * 1000);

  m = t.match(/^([\d.]+)\s*K$/i);
  if (m) return Math.round(parseFloat(m[1]) * 1000);

  m = t.match(/^([\d.]+)\s*M$/i);
  if (m) return Math.round(parseFloat(m[1]) * 1000000);

  return null;
}

/** InstaLog 앱 표시 방식("45.2K")에 맞춰 숫자를 다시 문자열로 포맷합니다. */
function pwFormatFollowerCount_(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

const PW_NUMBER_PATTERN = '([\\d][\\d,.]*\\s*(?:만|천|K|M)?)';
const PW_FOLLOWER_TEXT_PATTERNS = [
  new RegExp('팔로워\\s*' + PW_NUMBER_PATTERN),
  new RegExp('followers?\\s*' + PW_NUMBER_PATTERN, 'i'),
];

function pwFindFollowerCount_() {
  const bodyText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
  for (const pattern of PW_FOLLOWER_TEXT_PATTERNS) {
    const m = bodyText.match(pattern);
    if (m) {
      const val = pwParseAbbreviatedNumber_(m[1]);
      if (val !== null) return val;
    }
  }
  return null;
}

/**
 * 인스타그램은 프로필 페이지의 <title>을 "실제 이름 (@계정아이디) • Instagram photos and videos"
 * 형식으로 채워 넣습니다. 화면 요소 대신 이 제목을 읽으면 실제 이름(닉네임)을 안정적으로 얻을 수 있습니다.
 */
const PW_NON_NAME_TEXT_PATTERN = /^(팔로우|팔로잉|팔로워|메시지|메시지 보내기|게시물|Posts?|Followers?|Following|Follow|Message|편집|프로필 편집)$/i;

function pwFindDisplayNameFromTitle_(username) {
  const m = String(document.title || '').match(/^(.+?)\s*\(@([a-zA-Z0-9._]+)\)/);
  if (!m) return null;
  if (m[2].toLowerCase() !== username.toLowerCase()) return null; // 다른 탭/페이지의 오래된 제목 방지
  return m[1].trim() || null;
}

/**
 * 프로필 헤더의 실제 이름은 보통 계정 아이디(@ 없이) 바로 아래에 일반 텍스트로 표시됩니다.
 * 계정 아이디와 정확히 일치하는 요소를 화면에서 찾은 뒤, 그 주변에서 계정 아이디도 아니고
 * "팔로우"/"게시물" 같은 화면 문구도 아닌 첫 텍스트를 실제 이름으로 간주합니다.
 */
function pwFindDisplayNameFromDom_(username) {
  const isLeafTextEl = (el) => el.children.length === 0 && !!(el.textContent || '').trim();
  const allEls = document.querySelectorAll('h1, h2, span, div');

  for (const el of allEls) {
    if (!isLeafTextEl(el)) continue;
    if (el.textContent.trim().toLowerCase() !== username.toLowerCase()) continue;

    // 계정 아이디를 찾았으니, 가까운 조상들 안에서 실제 이름으로 보이는 다음 텍스트를 찾습니다.
    let ancestor = el.parentElement;
    for (let depth = 0; depth < 6 && ancestor; depth++, ancestor = ancestor.parentElement) {
      const candidates = ancestor.querySelectorAll('h1, h2, span, div');
      for (const c of candidates) {
        if (!isLeafTextEl(c)) continue;
        const text = c.textContent.trim();
        if (text.toLowerCase() === username.toLowerCase()) continue;
        if (PW_NON_NAME_TEXT_PATTERN.test(text)) continue;
        if (/^[\d,.]+(만|천|K|M)?$/i.test(text)) continue; // 팔로워 수 등 순수 숫자 문구 제외
        return text;
      }
      if (ancestor.querySelectorAll('h1, h2, span, div').length > 40) break; // 헤더보다 너무 넓은 범위면 중단
    }
  }
  return null;
}

function pwFindDisplayName_(username) {
  return pwFindDisplayNameFromTitle_(username) || pwFindDisplayNameFromDom_(username);
}

function pwGetSettings_() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['instalogToken'], (data) => resolve(data));
  });
}

async function pwRun_() {
  const username = pwExtractUsernameFromPath_(location.pathname);
  if (!username) return; // 프로필 페이지가 아니면 아무 것도 하지 않음

  const { instalogToken } = await pwGetSettings_();
  if (!instalogToken) return; // 로그인되어 있지 않으면 조용히 종료

  // 인스타그램 SPA가 화면을 그리는 데 시간이 걸리므로 잠깐 기다립니다.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const followerCount = pwFindFollowerCount_();
  const formattedFollowers = followerCount !== null ? pwFormatFollowerCount_(followerCount) : null;
  const displayName = pwFindDisplayName_(username);

  if (formattedFollowers === null && displayName === null) {
    console.warn(PW_TAG, '"' + username + '" 프로필에서 팔로워 수/닉네임을 찾지 못했습니다. (화면 구조가 바뀌었을 수 있음)');
    return;
  }

  console.log(PW_TAG, `"${username}" 인식 — 팔로워: ${formattedFollowers ?? '(못 찾음)'}, 닉네임: ${displayName ?? '(못 찾음)'}`);

  try {
    const res = await fetch(`${INSTALOG_API_BASE}/api/logs`, {
      headers: { Authorization: `Bearer ${instalogToken}` },
    });
    if (!res.ok) return;
    const logs = await res.json();

    const targets = logs.filter(
      (l) =>
        l.influencer?.handle?.toLowerCase() === username.toLowerCase() &&
        (!l.influencer?.followers || !l.influencer?.nickname)
    );
    if (targets.length === 0) return;

    let updatedCount = 0;
    for (const log of targets) {
      const influencer = { ...log.influencer };
      let changed = false;
      if (!influencer.followers && formattedFollowers !== null) {
        influencer.followers = formattedFollowers;
        changed = true;
      }
      if (!influencer.nickname && displayName) {
        influencer.nickname = displayName;
        changed = true;
      }
      if (!changed) continue;

      await fetch(`${INSTALOG_API_BASE}/api/logs/${log.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${instalogToken}`,
        },
        body: JSON.stringify({ ...log, influencer }),
      });
      updatedCount++;
    }
    console.log(PW_TAG, `"${username}" 로그 ${updatedCount}건에 계정 정보 반영 완료.`);
  } catch (err) {
    console.warn(PW_TAG, '계정 정보 반영 실패:', err && err.message ? err.message : err);
  }
}

pwRun_();

/**
 * =================================================================
 * 리스트업 (팝업의 "리스트업" 버튼)
 * =================================================================
 * 기록 시작/일시정지 상태와 무관하게, 팝업에서 요청이 오면 현재 프로필 페이지의
 * 계정 정보를 읽어 InstaLog에 status: 'list_up'으로 기록합니다.
 * (이미 기록된 계정이면 새 줄을 만들지 않고 최근 업데이트 시각/상태만 갱신합니다)
 */

async function pwHandleListUp_() {
  const username = pwExtractUsernameFromPath_(location.pathname);
  if (!username) return { ok: false, error: '인스타그램 프로필 페이지가 아닙니다.' };

  const { instalogToken, instalogProjectId, instalogProjectName, instalogProfileName } = await new Promise((resolve) =>
    chrome.storage.local.get(['instalogToken', 'instalogProjectId', 'instalogProjectName', 'instalogProfileName'], resolve)
  );
  if (!instalogToken) return { ok: false, error: 'InstaLog에 로그인되어 있지 않습니다.' };
  if (!instalogProjectId) return { ok: false, error: '기록할 프로젝트가 선택되지 않았습니다.' };

  const followerCount = pwFindFollowerCount_();
  const formattedFollowers = followerCount !== null ? pwFormatFollowerCount_(followerCount) : '';
  const displayName = pwFindDisplayName_(username) || '';
  const timestamp = ilNowTimestamp();

  try {
    const existing = await ilFindExistingLog(instalogToken, instalogProjectId, username);

    if (existing) {
      // 이미 한 단계라도 진행된 상태(회신 대기 이상)를 리스트업으로 되돌리지 않도록,
      // 아직 아무 상태도 안 찍힌 공란일 때만 상태를 리스트업으로 올립니다.
      // ('회신 대기'는 실제 DM을 보낸 뒤의 상태라 리스트업보다 다음 단계입니다 — content.js 참고)
      const shouldMarkListUp = existing.status === '';
      const updatedLog = {
        ...existing,
        timestamp,
        timeAgo: '방금',
        status: shouldMarkListUp ? 'list_up' : existing.status,
        influencer: {
          ...existing.influencer,
          nickname: existing.influencer.nickname || displayName,
          followers: existing.influencer.followers || formattedFollowers,
        },
      };

      const res = await fetch(`${INSTALOG_API_BASE}/api/logs/${existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instalogToken}` },
        body: JSON.stringify(updatedLog),
      });
      if (res.status === 401) { chrome.storage.local.remove('instalogToken'); return { ok: false, error: '로그인이 만료되었습니다. 팝업에서 다시 로그인해주세요.' }; }
      if (!res.ok) return { ok: false, error: `서버 오류 (${res.status})` };

      await ilBumpProjectStats(instalogToken, instalogProjectId, updatedLog, {
        action: '리스트업',
        incrementTotalSent: false,
      });
      return { ok: true, username, nickname: updatedLog.influencer.nickname };
    }

    const newLog = {
      id: `ext_${Date.now()}`,
      projectId: instalogProjectId,
      projectName: instalogProjectName || '',
      timestamp,
      timeAgo: '방금',
      influencer: {
        handle: username,
        nickname: displayName,
        profileUrl: `https://www.instagram.com/${username}/`,
        followers: formattedFollowers,
        verified: false,
      },
      status: 'list_up',
      channel: 'none',
      secondMessageSent: false,
      memo: '',
      profileName: instalogProfileName || '',
    };

    const res = await fetch(`${INSTALOG_API_BASE}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instalogToken}` },
      body: JSON.stringify(newLog),
    });
    if (res.status === 401) { chrome.storage.local.remove('instalogToken'); return { ok: false, error: '로그인이 만료되었습니다. 팝업에서 다시 로그인해주세요.' }; }
    if (!res.ok) return { ok: false, error: `서버 오류 (${res.status})` };

    await ilBumpProjectStats(instalogToken, instalogProjectId, newLog, {
      action: '리스트업',
      incrementTotalSent: true,
    });
    return { ok: true, username, nickname: newLog.influencer.nickname };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'INSTALOG_LIST_UP') return;
  pwHandleListUp_().then(sendResponse);
  return true; // 비동기 응답
});
