/**
 * 크롬이 "새로 시작될 때"(컴퓨터를 켜거나, 완전히 종료했던 크롬을 다시 실행할 때)
 * 열려있던 인스타그램 탭들을 자동으로 한 번 새로고침해서, content script가
 * 확실히 들어가도록 만듭니다. (팝업 UI는 manifest.json의 default_popup이 처리하므로
 * 이 파일은 이 역할 하나만 담당합니다)
 */
chrome.runtime.onStartup.addListener(() => {
  chrome.tabs.query({ url: 'https://www.instagram.com/*' }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.reload(tab.id);
    }
  });
});
