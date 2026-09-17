const loginView = document.getElementById('loginView');
const mainView = document.getElementById('mainView');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const accountBtn = document.getElementById('accountBtn');
const accountUsername = document.getElementById('accountUsername');
const projectSelect = document.getElementById('projectSelect');
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

// 앱이 열려있는 탭에서, 앱이 현재 로그인된 계정명을 가져옵니다. (계정 불일치 로그인 방지용)
async function getAppAccountUsername_() {
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
      if (response?.username) return response.username;
    } catch (err) {
      console.debug('[InstaLog] 탭', tab.url, '응답 실패(콘텐츠 스크립트 없음 등):', err?.message || err);
    }
  }
  console.debug('[InstaLog] 앱 계정을 찾지 못함');
  return null;
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

  projectSelect.innerHTML = '';
  if (projects.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = '프로젝트가 없습니다';
    opt.value = '';
    projectSelect.appendChild(opt);
  } else {
    for (const p of projects) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      projectSelect.appendChild(opt);
    }
    const selectedId = projects.some((p) => p.id === instalogProjectId) ? instalogProjectId : projects[0].id;
    projectSelect.value = selectedId;
    const selectedProject = projects.find((p) => p.id === selectedId);
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

loginBtn.addEventListener('click', async () => {
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

    const appAccount = await getAppAccountUsername_();
    if (appAccount && appAccount.toLowerCase() !== body.username.toLowerCase()) {
      loginError.textContent = 'InstaLog 앱과 로그인 계정이 일치하지 않습니다.';
      return;
    }

    await setStorage_({ instalogToken: body.token, instalogUsername: body.username });
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
  await setStorage_({ instalogToken: '', instalogUsername: '', instalogProjectId: '', instalogProjectName: '' });
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

recordingToggleBtn.addEventListener('click', async () => {
  const { instalogToken, instalogUsername, instalogRecording } = await getStorage_([
    'instalogToken',
    'instalogUsername',
    'instalogRecording',
  ]);
  const next = !(instalogRecording !== false);

  if (next) {
    // 기록을 시작하려면 InstaLog 앱이 열려있고, 같은 계정으로 로그인되어 있어야 합니다.
    const appAccount = await getAppAccountUsername_();
    if (!appAccount || appAccount.toLowerCase() !== instalogUsername.toLowerCase()) {
      recordingError.textContent = `InstaLog 앱에서 ${instalogUsername} 계정으로 로그인해주세요.`;
      return;
    }
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
