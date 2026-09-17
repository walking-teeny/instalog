# InstaLog 크롬 확장 프로그램

인스타그램 웹(instagram.com)에서 DM을 보내면 상대 계정 정보를 자동으로 읽어
InstaLog 서버에 기록합니다.

## 설치 (개발자 모드)

1. `chrome://extensions` 접속
2. 우측 상단 "개발자 모드" 켜기
3. "압축해제된 확장 프로그램을 로드합니다" 클릭 → 이 `extension/` 폴더 선택

## 사용법

1. 확장 프로그램 아이콘 클릭 → InstaLog 계정으로 로그인
2. 기록할 프로젝트 선택 (드롭다운)
3. 인스타그램 DM 화면에서 평소처럼 메시지 전송 → 자동으로 InstaLog에 기록됨
4. 팔로워 수는 그 계정의 프로필 페이지를 한 번 열람하면 자동으로 채워짐
   (또는 팝업의 "팔로워 수 일괄 채우기"로 한 번에 처리 가능)
5. 자동 기록을 잠시 끄고 싶으면 팝업의 "일시 정지" 버튼 사용

## 서버 주소 설정 (`config.js`)

로컬 개발 서버 기준으로 기본값이 설정되어 있습니다:

```js
const INSTALOG_API_BASE = 'http://localhost:8787';
```

**실제 서버에 배포한 뒤에는 다음 두 곳을 배포된 주소로 함께 변경해야 합니다:**

1. `config.js`의 `INSTALOG_API_BASE`
2. `manifest.json`의 `host_permissions` (`http://localhost:8787/*` 자리)

두 곳의 주소가 다르면 브라우저가 요청 자체를 막습니다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `manifest.json` | 확장 프로그램 설정 (권한, 실행 대상 페이지 등) |
| `config.js` | 서버 주소 설정 (배포 시 변경 필요) |
| `popup.html` / `popup.js` / `popup.css` | 로그인, 프로젝트 선택, 기록 on/off 팝업 UI |
| `content.js` / `content.css` | DM 전송 감지 → 로그 자동 등록 (+ 화면 우측 하단 알림) |
| `profile_watcher.js` | 프로필 페이지 열람 시 팔로워 수 자동 채움 |
| `batch.html` / `batch.js` | 팔로워 수가 비어있는 계정을 한 번에 순회하며 채우는 도구 |
| `background.js` | 크롬 재시작 시 열려있던 인스타그램 탭 새로고침 |
