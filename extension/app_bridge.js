/**
 * ===================================================================
 * InstaLog - 앱 페이지 중계 스크립트 (app_bridge.js)
 * ===================================================================
 * InstaLog 웹 앱 페이지에 주입되어, 앱과 크롬 확장 프로그램이 서로 다른 계정으로
 * 로그인되는 것을 막기 위해 "상대방이 어떤 계정으로 로그인되어 있는지"를
 * 서로 물어볼 수 있도록 중계합니다.
 *
 * ⚠️ 크롬은 확장 프로그램을 새로고침해도 "이미 열려있던" 탭에는 이 스크립트를
 *    다시 주입하지 않습니다. manifest.json을 바꾼 뒤에는 chrome://extensions에서
 *    새로고침한 다음, 이 앱 탭도 반드시 새로고침(F5)해야 정상 동작합니다.
 * ===================================================================
 */

console.debug('[InstaLog] app_bridge.js 로드됨 (탭:', window.location.href, ')');

// 이 스크립트가 (다시) 주입될 때마다 — 페이지 새로고침, 브라우저 재시작 등 — 캐시된
// chrome.storage.local.instalogProfileName을 앱의 현재 값으로 한 번 맞춰둡니다.
// INSTALOG_PROFILE_CHANGED 브로드캐스트는 "전환되는 순간" 열려있던 탭에만 전달되므로,
// 그 순간 이 탭이 없었거나 이후에 새로고침된 경우를 커버하기 위한 보강입니다.
chrome.storage.local.set({ instalogProfileName: localStorage.getItem('instalog_profile_name') || '' });

// 확장 프로그램(팝업)이 "이 탭의 앱은 어떤 계정으로 로그인되어 있나?" 물어볼 때 응답합니다.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'INSTALOG_GET_APP_ACCOUNT') {
    sendResponse({
      username: localStorage.getItem('instalog_auth_username') || null,
      profileName: localStorage.getItem('instalog_profile_name') || null,
    });
  }
});

// 앱 페이지(React)가 "확장 프로그램은 어떤 계정으로 로그인되어 있나?" 물어볼 때 응답합니다.
window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.source !== 'instalog-app') return;

  if (event.data.type === 'INSTALOG_GET_EXTENSION_ACCOUNT') {
    chrome.storage.local.get(['instalogUsername'], (data) => {
      window.postMessage(
        { source: 'instalog-extension', type: 'INSTALOG_EXTENSION_ACCOUNT_RESULT', username: data.instalogUsername || null },
        window.location.origin
      );
    });
    return;
  }

  // 앱에서 프로필을 전환하면(설정 > 프로필 전환), 다음 로그인/기록 시작 시점까지 기다리지 않고
  // 그 순간부터 자동 기록되는 로그에 바로 새 프로필이 담당자로 찍히도록 즉시 반영합니다.
  if (event.data.type === 'INSTALOG_PROFILE_CHANGED') {
    chrome.storage.local.set({ instalogProfileName: event.data.profileName || '' });
  }
});
