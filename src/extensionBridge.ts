// 크롬 확장 프로그램(app_bridge.js)에게 "현재 어떤 계정으로 로그인되어 있나?"를 물어봅니다.
// 확장 프로그램이 설치되어 있지 않거나 응답이 없으면(타임아웃) null을 반환합니다.
export function getExtensionAccountUsername(): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      console.warn('[InstaLog] 확장 프로그램 응답 없음 (설치되지 않았거나, 확장 프로그램을 새로고침한 뒤 이 탭을 새로고침하지 않은 경우일 수 있습니다)');
      resolve(null);
    }, 800);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.source !== 'instalog-extension' || event.data?.type !== 'INSTALOG_EXTENSION_ACCOUNT_RESULT') return;
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      resolve(event.data.username ?? null);
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ source: 'instalog-app', type: 'INSTALOG_GET_EXTENSION_ACCOUNT' }, window.location.origin);
  });
}
