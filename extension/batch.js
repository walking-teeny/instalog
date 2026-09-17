/**
 * ===================================================================
 * 팔로워 수 일괄 채우기 (batch.js)
 * ===================================================================
 * 1) InstaLog에서 팔로워 수가 비어있는 로그 목록을 가져와, 계정 단위로 중복 제거합니다.
 * 2) 계정을 하나씩 순서대로 처리합니다: 화면에 보이지 않는 배경 탭으로 그 계정의
 *    프로필 페이지를 열고, 몇 초 기다렸다가(그 사이 profile_watcher.js가 화면의
 *    팔로워 수를 읽어 자동으로 반영함) 탭을 닫습니다.
 * 3) 계정과 계정 사이에는 5~8초 정도 무작위로 쉬어갑니다. (너무 규칙적으로
 *    빠르게 반복하면 인스타그램이 자동화로 의심할 수 있어서, 사람이 하나씩
 *    눌러보는 것과 비슷한 속도/리듬을 흉내냅니다)
 * ===================================================================
 */

const TAB_OPEN_WAIT_MS = 4000;
const DELAY_MIN_MS = 5000;
const DELAY_MAX_MS = 8000;

let stopRequested = false;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

function setStatus_(text) {
  statusEl.textContent = text;
  log_(text);
}

function log_(text) {
  const line = document.createElement('div');
  const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  line.textContent = time + ' — ' + text;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function sleep_(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getToken_() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['instalogToken'], (data) => resolve(data.instalogToken));
  });
}

async function fetchMissingFollowerAccounts_(token) {
  const res = await fetch(`${INSTALOG_API_BASE}/api/logs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('목록 요청 실패 (상태코드 ' + res.status + ')');
  const logs = await res.json();

  const seen = new Set();
  const accounts = [];
  for (const l of logs) {
    const handle = l.influencer?.handle;
    if (!handle || l.influencer?.followers || seen.has(handle)) continue;
    seen.add(handle);
    accounts.push({ username: handle, url: `https://www.instagram.com/${handle}/` });
  }
  return accounts;
}

function openTabAndWait_(url, waitMs) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: url, active: false }, (tab) => {
      setTimeout(() => {
        chrome.tabs.remove(tab.id, () => resolve());
      }, waitMs);
    });
  });
}

async function runBatch_() {
  stopRequested = false;

  const token = await getToken_();
  if (!token) {
    setStatus_('❌ InstaLog에 로그인되어 있지 않습니다. 확장 프로그램 아이콘에서 먼저 로그인해주세요.');
    return;
  }

  setStatus_('목록을 불러오는 중...');

  let accounts;
  try {
    accounts = await fetchMissingFollowerAccounts_(token);
  } catch (err) {
    setStatus_('❌ 목록을 불러오지 못했습니다: ' + (err && err.message ? err.message : err));
    return;
  }

  if (accounts.length === 0) {
    setStatus_('✅ 팔로워 수가 비어있는 계정이 없습니다. 처리할 항목이 없어요.');
    return;
  }

  log_(accounts.length + '개 계정을 찾았습니다. 순서대로 처리를 시작합니다.');

  for (let i = 0; i < accounts.length; i++) {
    if (stopRequested) {
      setStatus_('⏸ 사용자 요청으로 중지되었습니다. (' + i + '/' + accounts.length + ' 처리함)');
      return;
    }

    const account = accounts[i];
    setStatus_('(' + (i + 1) + '/' + accounts.length + ') "' + account.username + '" 처리 중...');
    await openTabAndWait_(account.url, TAB_OPEN_WAIT_MS);

    if (i < accounts.length - 1) {
      const delay = DELAY_MIN_MS + Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));
      await sleep_(delay);
    }
  }

  setStatus_('✅ 빈 데이터를 모두 채웠어요. InstaLog 앱에서 확인해주세요.');
}

startBtn.addEventListener('click', () => {
  startBtn.disabled = true;
  stopBtn.disabled = false;
  runBatch_().finally(() => {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });
});

stopBtn.addEventListener('click', () => {
  stopRequested = true;
  stopBtn.disabled = true;
});
