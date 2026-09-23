/**
 * ===================================================================
 * InstaLog - 인스타그램 DM 자동 기록기 (content script)
 * ===================================================================
 * 동작 방식:
 * 1) 인스타그램 웹의 DM(다이렉트 메시지) 대화 화면에서, 메시지를 "보낼 때"를
 *    자동으로 감지합니다. (Enter 키로 전송 / 보내기 버튼 클릭 둘 다 감지)
 * 2) 전송이 감지되면, 현재 대화 상대(수신자)의 계정 아이디(@handle)와 화면에 보이는
 *    표시 이름(닉네임)을 화면에서 읽습니다.
 * 3) InstaLog 서버(/api/logs)로 새 DM 로그를 등록하고, 팝업에서 선택해둔 프로젝트의
 *    발송 통계를 갱신합니다.
 *
 * ※ 이 확장 프로그램은 DM을 "자동으로 발송"하지 않습니다.
 *    DM은 여전히 사람이 인스타그램 화면에서 직접 보내고, 이 도구는 발송 직후
 *    "계정 정보 기록"만 자동화합니다.
 * ※ 팔로워 수는 이 스크립트가 아니라 별도의 profile_watcher.js가 채웁니다.
 *    (인스타그램 프로필 페이지를 직접 열람할 때, 화면에 이미 나와 있는 팔로워 수를
 *    읽어 기록해 넣습니다 — DM 화면에서 내부 API를 직접 호출하던 예전 방식은
 *    인스타그램의 요청 제한(429)에 자주 걸려서 이 방식으로 분리했습니다)
 * ※ 인스타그램 화면 구조/코드가 바뀌면 계정 인식이 실패할 수 있습니다.
 *    그 경우 화면 우측 하단 알림에 실패 사유가 표시됩니다.
 * ===================================================================
 */

const TAG = '[InstaLog]';
console.log(TAG, 'content script 로드됨 ->', location.href);

// 같은 전송이 중복으로 감지되는 것을 막기 위한 최소 간격(ms)
const DEBOUNCE_MS = 1200;
let lastTriggeredAt = 0;

/**
 * 우측 하단에 잠깐 뜨는 상태 알림(토스트)을 보여줍니다.
 */
const TOAST_DURATION_MS = 3500;

function hideToastNow_() {
  const toast = document.getElementById('instalog-toast');
  if (toast) toast.classList.remove('show');
}

function showToast(message) {
  let toast = document.getElementById('instalog-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'instalog-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(showToast._timer);
  showToast._hideAt = Date.now() + TOAST_DURATION_MS;
  showToast._timer = setTimeout(hideToastNow_, TOAST_DURATION_MS);
}

// 탭이 비활성 상태일 때는 브라우저가 타이머를 늦추거나 잠시 멈출 수 있어서,
// 다른 탭/페이지로 갔다가 돌아왔을 때 토스트가 그대로 남아있을 수 있습니다.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (showToast._hideAt && Date.now() >= showToast._hideAt) {
    hideToastNow_();
  }
});

const SYSTEM_PATHS = ['direct', 'explore', 'accounts', 'reels', 'p', 'stories'];

/**
 * href가 "계정 프로필 링크" 모양인지 확인하고, 맞으면 계정 아이디를 반환합니다.
 */
function extractUsernameFromHref_(href) {
  const match = String(href || '').match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
  if (match && !SYSTEM_PATHS.includes(match[1])) return match[1];
  return null;
}

/**
 * 현재 열려있는 "대화 상대방 헤더" 영역(전화/화상통화/대화정보 아이콘이 있는 상단 바)을 찾습니다.
 * 왼쪽의 대화 목록(내 메모, 다른 대화들)과 섞이지 않도록, 그 아이콘들의 공통 조상 안에서만
 * 계정 링크를 찾기 위한 범위(scope)입니다.
 */
function findThreadHeaderScope_() {
  const ICON_LABEL_PATTERN = /전화|Audio call|화상|Video call|대화 정보|Conversation information/i;
  const iconEls = Array.from(document.querySelectorAll('[aria-label]')).filter((el) =>
    ICON_LABEL_PATTERN.test(el.getAttribute('aria-label') || '')
  );
  for (const icon of iconEls) {
    let node = icon.closest('div');
    for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
      if (node.querySelector('a[href^="/"][role="link"]')) {
        return node;
      }
    }
  }
  return null;
}

/**
 * 계정 링크 요소 안에서, 계정 아이디(username)가 아닌 "표시 이름" 텍스트를 찾아냅니다.
 */
const STATUS_TEXT_PATTERN = /^(활동\s*중|온라인|\d+\s*(분|시간|일)\s*전에?\s*활동함?|active\s*now|active\s+.*ago)$/i;

function extractDisplayNameFromLink_(linkEl, username) {
  if (!linkEl) return null;
  const candidates = linkEl.querySelectorAll('span, div');
  for (const el of candidates) {
    if (el.children.length > 0) continue; // 텍스트만 있는 말단 요소만 봄
    const text = (el.textContent || '').trim();
    if (!text) continue;
    if (text.toLowerCase() === String(username || '').toLowerCase()) continue;
    if (STATUS_TEXT_PATTERN.test(text)) continue;
    return text.replace(/님$/, '').trim();
  }
  return null;
}

/**
 * 현재 대화창 상대방(수신자)의 계정 아이디(username)와 화면에 보이는 표시 이름을 추측합니다.
 * 반환값: { username: string, displayName: string|null }
 */
function guessRecipientInfo() {
  const scope = findThreadHeaderScope_();
  if (scope) {
    const links = scope.querySelectorAll('a[href^="/"][role="link"]');
    for (const link of links) {
      const username = extractUsernameFromHref_(link.getAttribute('href'));
      if (username) {
        const displayName = extractDisplayNameFromLink_(link, username);
        console.log(TAG, '헤더 범위에서 계정 인식:', username, '| 표시 이름:', displayName, link);
        return { username, displayName };
      }
    }
  }

  const LIST_CONTAINER_SELECTOR = '[role="list"], [role="listitem"], nav';
  const allLinks = document.querySelectorAll('a[href^="/"][role="link"]');
  for (const link of allLinks) {
    if (link.closest(LIST_CONTAINER_SELECTOR)) continue;
    const username = extractUsernameFromHref_(link.getAttribute('href'));
    if (username) {
      const displayName = extractDisplayNameFromLink_(link, username);
      console.log(TAG, '예비 방법으로 계정 인식:', username, '| 표시 이름:', displayName, link);
      return { username, displayName };
    }
  }

  console.warn(TAG, '계정을 찾지 못함');
  return { username: '', displayName: null };
}

function isComposerElement(el) {
  if (!el) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return true;
  return false;
}

function isSendButtonClick(el) {
  const btn = el && el.closest ? el.closest('button, div[role="button"]') : null;
  if (!btn) return false;
  const label = (btn.getAttribute('aria-label') || btn.textContent || '').trim();
  return /보내기|Send/i.test(label);
}

function getSettings_() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['instalogToken', 'instalogRecording', 'instalogProjectId', 'instalogProjectName', 'instalogProfileName'],
      (data) => resolve(data)
    );
  });
}

/**
 * DM 전송이 감지됐을 때 실행되는 메인 처리 함수.
 * (팔로워 수는 여기서 조회하지 않습니다 — profile_watcher.js가 별도로 채워 넣습니다)
 */
async function handleDmSent() {
  const now = Date.now();
  if (now - lastTriggeredAt < DEBOUNCE_MS) return;
  lastTriggeredAt = now;

  // 메시지가 실제로 화면에 반영될 시간을 약간 기다립니다.
  await new Promise((resolve) => setTimeout(resolve, 700));

  const settings = await getSettings_();

  if (!settings.instalogToken) {
    showToast('⚠️ InstaLog에 로그인되어 있지 않습니다. 확장 프로그램 아이콘을 눌러 로그인해주세요.');
    return;
  }
  if (!settings.instalogRecording) {
    showToast('⏸ 자동 기록이 꺼져 있습니다. 확장 프로그램 아이콘에서 켜주세요.');
    return;
  }
  if (!settings.instalogProjectId) {
    showToast('⚠️ 기록할 프로젝트가 선택되지 않았습니다. 확장 프로그램 아이콘에서 선택해주세요.');
    return;
  }

  const { username, displayName } = guessRecipientInfo();
  if (!username) {
    showToast('⚠️ 수신자 계정을 화면에서 찾지 못했습니다. (기록 실패)');
    return;
  }

  showToast('📋 "' + (displayName || username) + '" 계정 정보를 확인하는 중...');

  const timestamp = ilNowTimestamp();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  try {
    const existing = await ilFindExistingLog(settings.instalogToken, settings.instalogProjectId, username);

    if (existing) {
      // 이미 기록된 계정이면 중복으로 새 줄을 만들지 않고, 최근 업데이트 시각만 갱신합니다.
      const diffMs = Date.now() - new Date(existing.timestamp.replace(' ', 'T')).getTime();
      const shouldMarkSecondMessage = diffMs >= THREE_DAYS_MS;
      // "리스트업"(DM 이전 단계)에 머물러 있던 계정이면, 실제로 DM을 보낸 지금은
      // "회신 대기"로 올려야 한다 — 이미 그보다 앞서간 상태(소통 중/성사/거절)는 건드리지 않는다.
      const shouldAdvancePastListUp = existing.status === 'list_up' || existing.status === '';

      const updatedLog = {
        ...existing,
        timestamp,
        timeAgo: '방금',
        status: shouldAdvancePastListUp ? 'waiting' : existing.status,
        secondMessageSent: existing.secondMessageSent || shouldMarkSecondMessage,
      };

      const res = await fetch(`${INSTALOG_API_BASE}/api/logs/${existing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.instalogToken}`,
        },
        body: JSON.stringify(updatedLog),
      });
      if (res.status === 401) return handleUnauthorized_();
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);

      await ilBumpProjectStats(settings.instalogToken, settings.instalogProjectId, updatedLog, {
        action: '제안 발송',
        incrementTotalSent: false,
      });

      console.log(TAG, '기존 로그 업데이트 완료:', updatedLog);
      showToast(
        '🔄 "' + (updatedLog.influencer.nickname || updatedLog.influencer.handle) + '"은(는) 이미 기록된 계정이라 최근 업데이트 시각만 갱신했습니다.' +
        (shouldMarkSecondMessage ? ' (3일 이상 경과 — 2차 발송 체크됨)' : '')
      );
      return;
    }

    // 처음 보는 계정이면 새 로그를 만듭니다.
    const newLog = {
      id: `ext_${Date.now()}`,
      projectId: settings.instalogProjectId,
      projectName: settings.instalogProjectName || '',
      timestamp,
      timeAgo: '방금',
      influencer: {
        handle: username,
        // 화면에서 실제 이름을 못 찾으면 계정 아이디로 채우지 않고 비워둡니다.
        // (채워두면 나중에 profile_watcher.js가 실제 이름을 찾아도 "이미 값이 있다"고 보고
        //  덮어쓰지 않게 되어, 계정 아이디가 실제 이름인 것처럼 계속 잘못 남기 때문입니다)
        nickname: displayName || '',
        profileUrl: `https://www.instagram.com/${username}/`,
        followers: '',
        verified: false,
      },
      status: 'waiting',
      channel: 'none',
      secondMessageSent: false,
      memo: '',
      profileName: settings.instalogProfileName || '',
    };

    const res = await fetch(`${INSTALOG_API_BASE}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.instalogToken}`,
      },
      body: JSON.stringify(newLog),
    });

    if (res.status === 401) return handleUnauthorized_();
    if (!res.ok) throw new Error(`서버 오류 (${res.status})`);

    await ilBumpProjectStats(settings.instalogToken, settings.instalogProjectId, newLog, {
      action: '제안 발송',
      incrementTotalSent: true,
    });

    console.log(TAG, 'DM 로그 등록 완료:', newLog);
    showToast('📨 "' + (newLog.influencer.nickname || newLog.influencer.handle) + '" 계정을 InstaLog에 기록했습니다.');
  } catch (err) {
    console.error(TAG, 'InstaLog 전송 실패:', err);
    showToast('❌ InstaLog 전송 실패: ' + err.message);
  }
}

function handleUnauthorized_() {
  chrome.storage.local.remove('instalogToken');
  showToast('❌ 로그인이 만료되었습니다. 확장 프로그램 아이콘에서 다시 로그인해주세요.');
}

// Enter 키로 전송하는 경우 감지 (Shift+Enter는 줄바꿈이므로 제외)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  if (!isComposerElement(e.target)) return;
  handleDmSent();
}, true);

// 마우스로 "보내기" 버튼을 클릭하는 경우 감지
document.addEventListener('click', (e) => {
  if (!isSendButtonClick(e.target)) return;
  handleDmSent();
}, true);
