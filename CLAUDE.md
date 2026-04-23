# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 안내 문서입니다.

> **규칙: 이 파일(CLAUDE.md)은 항상 한국어로 작성한다.**

## 앱 실행 방법

빌드 과정 없음. `index.html`을 브라우저에서 직접 열면 됨 — 서버나 npm 불필요.

localStorage 동작 확인은 브라우저 DevTools → Application → Local Storage에서 한다.

## 아키텍처

프레임워크 없는 정적 파일 3개:

- **[index.html](index.html)** — 정적 셸. 습관 추가 `<form>`과 `#habit-list` `<ul>` 포함. 로직 없음.
- **[style.css](style.css)** — 전체 스타일. CSS 커스텀 프로퍼티로 테마 관리; `@media (prefers-color-scheme: dark)`로 다크모드 지원.
- **[app.js](app.js)** — 전체 로직. 단일 script 태그로 로드되며 4개의 plain-object 모듈로 구성:

| 모듈 | 역할 |
|---|---|
| `Storage` | localStorage 읽기/쓰기. 키: `habit_tracker_habits`(배열), `habit_tracker_completions`(flat 객체). 모든 접근을 try/catch로 감쌈. |
| `State` | 인메모리 캐시: `habits[]`, `completions{}`, `today`(YYYY-MM-DD). `DOMContentLoaded` 시 1회 초기화. |
| `Logic` | 순수 함수 — `calculateStreak`, `isCompleteToday`, `subtractDays`, `formatDate`, `escapeHtml`. DOM 접근 없음. |
| `UI` | `render()` + 이벤트 핸들러. 상태 변경마다 `#habit-list`의 innerHTML을 전체 재생성. 리스트에 단일 클릭 리스너로 이벤트 위임 처리. |

## 주요 데이터 설계 결정

**completions 키 형식:** `"habitId::YYYY-MM-DD"` — 오늘 완료 여부를 O(1)로 조회하고, 중첩 객체 없이 습관별 기록을 깔끔하게 관리.

**스트릭 알고리즘** (`Logic.calculateStreak`): 오늘(오늘 미완료 시 어제)부터 거꾸로 날짜를 탐색하다 공백이 생기면 중단. `new Date(dateStr + "T00:00:00")` 형식 사용 필수 — 날짜 문자열만 넘기면 UTC 기준으로 파싱되어 UTC- 타임존에서 날짜가 하루 어긋남.

**렌더 방식:** `UI.render()`는 상태 변경마다 `#habit-list`의 innerHTML을 전부 재생성 — diffing 없음, 점진적 업데이트 없음. 이 데이터 규모에서는 단순하고 정확한 방식이라 의도적으로 선택.

**XSS 방지:** 습관 이름을 innerHTML에 쓰기 전 반드시 `Logic.escapeHtml()`을 호출.

**Storage 가용성 체크:** `Storage.init()`은 시작 시 localStorage에 테스트 값을 쓰고 삭제해 사용 가능 여부를 확인. 실패 시 `Storage.available = false`로 설정되고 `#storage-warning` 배너가 노출됨. 이후 모든 `save*` 호출은 조기 반환.

**중복 이름 방지:** `UI.handleAddHabit`에서 대소문자 무시 중복 검사 수행. 중복 시 `input.setCustomValidity()` + `reportValidity()`로 브라우저 내장 인라인 오류 표시 — 별도 오류 요소 없음. `input` 이벤트 발생 시 유효성 오류는 자동 초기화.

**이벤트 위임 패턴:** 카드 버튼에 `data-action="toggle"` / `data-action="delete"` 속성 부여. `#habit-list`의 단일 클릭 핸들러에서 `e.target.closest("[data-action]")`으로 감지 — `render()` 호출 시마다 리스너 재등록 불필요.
