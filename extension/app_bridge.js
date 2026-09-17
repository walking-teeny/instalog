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

// 확장 프로그램(팝업)이 "이 탭의 앱은 어떤 계정으로 로그인되어 있나?" 물어볼 때 응답합니다.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'INSTALOG_GET_APP_ACCOUNT') {
    sendResponse({ username: localStorage.getItem('instalog_auth_username') || null });
  }
});

// 앱 페이지(React)가 "확장 프로그램은 어떤 계정으로 로그인되어 있나?" 물어볼 때 응답합니다.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'instalog-app' || event.data?.type !== 'INSTALOG_GET_EXTENSION_ACCOUNT') return;

  chrome.storage.local.get(['instalogUsername'], (data) => {
    window.postMessage(
      { source: 'instalog-extension', type: 'INSTALOG_EXTENSION_ACCOUNT_RESULT', username: data.instalogUsername || null },
      window.location.origin
    );
  });
});
