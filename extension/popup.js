const loginView = document.getElementById('loginView');
const mainView = document.getElementById('mainView');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const loginForm = document.getElementById('loginForm');
const accountBtn = document.getElementById('accountBtn');
const accountUsername = document.getElementById('accountUsername');
const projectSelect = document.getElementById('projectSelect');
const listUpBtn = document.getElementById('listUpBtn');
const listUpStatus = document.getElementById('listUpStatus');
const recordingToggleBtn = document.getElementById('recordingToggleBtn');
const recordingIcon = document.getElementById('recordingIcon');
const recordingBtnText = document.getElementById('recordingBtnText');
const recordingError = document.getElementById('recordingError');
const openBatchBtn = document.getElementById('openBatchBtn');
const logoutConfirmModal = document.getElementById('logoutConfirmModal');
const logoutCancelBtn = document.getElementById('logoutCancelBtn');
const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');

function showView_(view) {
  loginView.classList.toggle('active', view === 'login');
  mainView.classList.toggle('active', view === 'main');
  accountBtn.hidden = view === 'login';
  if (view === 'login') accountUsername.textContent = '';
}

function getStorage_(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function setStorage_(items) {
  return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}

async function apiFetch_(path, token, options = {}) {
  const res = await fetch(`${INSTALOG_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
  return res.status === 204 ? null : res.json();
}

// 앱이 열려있는 탭에서, 앱이 현재 로그인된 계정명과 선택된 프로필명을 가져옵니다. (계정 불일치 로그인 방지 + 담당자 태깅용)
async function getAppAccountInfo_() {
  const tabs = await new Promise((resolve) =>
    chrome.tabs.query(
      {
        url: [
          'https://instalog-nu.vercel.app/*',
          'http://localhost:3000/*',
          'http://localhost:8787/*',
          'http://127.0.0.1:3000/*',
          'http://127.0.0.1:8787/*',
        ],
      },
      resolve
    )
  );
  console.debug('[InstaLog] 앱 탭 검색 결과:', tabs.map((t) => t.url));

  for (const tab of tabs) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { type: 'INSTALOG_GET_APP_ACCOUNT' }, (res) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(res);
        });
      });
      console.debug('[InstaLog] 탭', tab.url, '응답:', response);
      if (response?.username) return { username: response.username, profileName: response.profileName || '' };
    } catch (err) {
      console.debug('[InstaLog] 탭', tab.url, '응답 실패(콘텐츠 스크립트 없음 등):', err?.message || err);
    }
  }
  console.debug('[InstaLog] 앱 계정을 찾지 못함');
  return { username: null, profileName: '' };
}

async function loadMainView_() {
  const { instalogToken, instalogUsername, instalogProjectId, instalogRecording } = await getStorage_([
    'instalogToken',
    'instalogUsername',
    'instalogProjectId',
    'instalogRecording',
  ]);

  if (!instalogToken) {
    showView_('login');
    return;
  }

  accountUsername.textContent = instalogUsername || '';

  let projects;
  try {
    projects = await apiFetch_('/api/projects', instalogToken);
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') {
      await setStorage_({ instalogToken: '' });
      showView_('login');
      return;
    }
    projectSelect.innerHTML = '<option>불러오기 실패</option>';
    showView_('main');
    return;
  }

  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'waiting');

  projectSelect.innerHTML = '';
  if (activeProjects.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = projects.length === 0 ? '프로젝트가 없습니다' : '진행 중인 프로젝트가 없습니다';
    opt.value = '';
    projectSelect.appendChild(opt);
    // 선택해둔 프로젝트가 더 이상 진행 중이 아니게 됐다면(종료/보관), 그 id를 계속
    // 들고 있으면 content.js가 여전히 그 프로젝트에 DM을 기록해버린다 — 비워서 막는다.
    await setStorage_({ instalogProjectId: '', instalogProjectName: '' });
  } else {
    for (const p of activeProjects) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      projectSelect.appendChild(opt);
    }
    const mostRecentlyUpdated = activeProjects.reduce((latest, p) => (p.updatedAt > latest.updatedAt ? p : latest));
    const selectedId = activeProjects.some((p) => p.id === instalogProjectId) ? instalogProjectId : mostRecentlyUpdated.id;
    projectSelect.value = selectedId;
    const selectedProject = activeProjects.find((p) => p.id === selectedId);
    await setStorage_({ instalogProjectId: selectedId, instalogProjectName: selectedProject.name });
  }

  const isRecording = instalogRecording !== false; // 기본값: 켜짐
  updateRecordingUI_(isRecording);
  if (instalogRecording === undefined) await setStorage_({ instalogRecording: true });
  syncRecordingState_(instalogToken, isRecording);

  showView_('main');
}

// InstaLog 앱 헤더의 "기록중"/"기록 정지" 표시가 확장 프로그램의 실제 상태와 항상 같도록 서버에도 반영합니다.
async function syncRecordingState_(token, isRecording) {
  try {
    const current = await apiFetch_('/api/widget-settings', token);
    await apiFetch_('/api/widget-settings', token, {
      method: 'PUT',
      body: JSON.stringify({ ...current, isRecording }),
    });
  } catch (err) {
    console.warn('[InstaLog] 기록 상태 동기화 실패:', err && err.message ? err.message : err);
  }
}

const RECORDING_ICON_PAUSE = '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>';
const RECORDING_ICON_PLAY = '<path d="M7 4.5v15l13-7.5z"></path>';

function updateRecordingUI_(isRecording) {
  recordingIcon.innerHTML = isRecording ? RECORDING_ICON_PAUSE : RECORDING_ICON_PLAY;
  recordingBtnText.textContent = isRecording ? '일시 정지' : '기록 시작';
  recordingToggleBtn.classList.toggle('recording-on', isRecording);
  recordingToggleBtn.classList.toggle('recording-off', !isRecording);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) {
    loginError.textContent = '아이디와 비밀번호를 입력해주세요.';
    return;
  }

  loginBtn.disabled = true;
  loginError.textContent = '';
  try {
    const res = await fetch(`${INSTALOG_API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || '로그인에 실패했습니다.');

    const appInfo = await getAppAccountInfo_();
    if (appInfo.username && appInfo.username.toLowerCase() !== body.username.toLowerCase()) {
      loginError.textContent = 'InstaLog 앱과 로그인 계정이 일치하지 않습니다.';
      return;
    }

    await setStorage_({ instalogToken: body.token, instalogUsername: body.username, instalogProfileName: appInfo.profileName });
    loginPassword.value = '';
    await loadMainView_();
  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    loginBtn.disabled = false;
  }
});

accountBtn.addEventListener('click', () => {
  logoutConfirmModal.classList.add('show');
});

logoutCancelBtn.addEventListener('click', () => {
  logoutConfirmModal.classList.remove('show');
});

logoutConfirmBtn.addEventListener('click', async () => {
  const { instalogToken } = await getStorage_(['instalogToken']);
  if (instalogToken) await syncRecordingState_(instalogToken, false); // 로그아웃하면 더 이상 기록되지 않으므로 앱 배지도 정지 상태로 반영
  await setStorage_({ instalogToken: '', instalogUsername: '', instalogProjectId: '', instalogProjectName: '', instalogProfileName: '' });
  logoutConfirmModal.classList.remove('show');
  showView_('login');
});

projectSelect.addEventListener('change', async () => {
  const { instalogToken } = await getStorage_(['instalogToken']);
  const projects = await apiFetch_('/api/projects', instalogToken).catch(() => []);
  const selected = projects.find((p) => p.id === projectSelect.value);
  await setStorage_({
    instalogProjectId: projectSelect.value,
    instalogProjectName: selected ? selected.name : '',
  });
});

function setListUpStatus_(message, kind) {
  listUpStatus.textContent = message;
  listUpStatus.classList.toggle('is-error', kind === 'error');
  listUpStatus.classList.toggle('is-success', kind === 'success');
}

// 리스트업은 기록 시작/일시정지 상태와 무관하게 항상 동작합니다.
listUpBtn.addEventListener('click', async () => {
  if (!projectSelect.value) {
    setListUpStatus_('프로젝트를 먼저 선택해주세요.', 'error');
    return;
  }

  listUpBtn.disabled = true;
  setListUpStatus_('현재 프로필 정보를 확인하는 중...', null);

  try {
    const [tab] = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
    // profile_watcher.js(리스트업 수신 측)는 manifest.json에서 /direct/*를 exclude_matches로
    // 뺀 페이지에만 주입되므로, 여기 URL 체크도 같은 예외를 둬야 DM 탭에서 눌렀을 때
    // "리스트업에 실패했습니다" 같은 엉뚱한 메시지 대신 정확한 안내가 뜬다.
    if (!tab || !/^https:\/\/www\.instagram\.com\//.test(tab.url || '') || /^https:\/\/www\.instagram\.com\/direct\//.test(tab.url || '')) {
      setListUpStatus_('인스타그램 프로필 페이지를 열고 시도해주세요.', 'error');
      return;
    }

    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: 'INSTALOG_LIST_UP' }, (res) => {
        if (chrome.runtime.lastError) resolve({ ok: false, error: '인스타그램 프로필 페이지를 열고 시도해주세요.' });
        else resolve(res);
      });
    });

    if (response && response.ok) {
      setListUpStatus_(`${response.nickname || response.username}님의 데이터가 추가되었습니다.`, 'success');
    } else {
      setListUpStatus_((response && response.error) || '리스트업에 실패했습니다.', 'error');
    }
  } finally {
    listUpBtn.disabled = false;
  }
});

recordingToggleBtn.addEventListener('click', async () => {
  const { instalogToken, instalogUsername, instalogRecording } = await getStorage_([
    'instalogToken',
    'instalogUsername',
    'instalogRecording',
  ]);
  const next = !(instalogRecording !== false);

  if (next) {
    // 기록을 시작하려면 InstaLog 앱이 열려있고, 같은 계정으로 로그인되어 있어야 합니다.
    // 이 타이밍에 앱이 선택된 프로필도 함께 가져와, 그 사이 프로필이 바뀌었어도 최신 값으로 맞춥니다.
    const appInfo = await getAppAccountInfo_();
    if (!appInfo.username || appInfo.username.toLowerCase() !== instalogUsername.toLowerCase()) {
      recordingError.textContent = `InstaLog 앱에서 ${instalogUsername} 계정으로 로그인해주세요.`;
      return;
    }
    await setStorage_({ instalogProfileName: appInfo.profileName });
  }

  recordingError.textContent = '';
  await setStorage_({ instalogRecording: next });
  updateRecordingUI_(next);
  syncRecordingState_(instalogToken, next);
});

openBatchBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('batch.html') });
});

loadMainView_();
