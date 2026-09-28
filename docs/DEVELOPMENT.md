# 개발 가이드

[README](../README.md) · [운영 가이드](OPERATIONS.md)

## 기술 구성

| 영역 | 사용 기술 |
|---|---|
| 화면 | React 19, TypeScript, Vite, React Router |
| 서버 데이터 | TanStack Query, Supabase Realtime |
| 입력 | React Hook Form, Zod |
| UI | Tailwind CSS, Radix Dialog, Lucide React, Pretendard |
| API | Vercel Functions, Node.js CommonJS |
| 데이터·관리자 인증·사진 | Supabase PostgreSQL, Auth, Storage |
| 알림 | Web Push, VAPID, Service Worker |
| 검증 | Vitest, Node.js test runner, Playwright |

정확한 의존성은 [package.json](../package.json)과 [package-lock.json](../package-lock.json)을 기준으로 합니다. 설치에는 `npm ci`를 사용합니다.

## 프로젝트 지도

```text
ohnochoo/
├─ api/                         # Vercel API와 서버 전용 공통 모듈
│  ├─ _apple-music-album.js      # 앨범 주소 추출·검증
│  ├─ _push-utils.js            # Push, 발송 기록, service-role 연결
│  ├─ _request-guards.js        # Origin·JSON·Cron 인증 검사
│  ├─ config.js                 # 공개 설정과 VAPID 공개 키
│  ├─ fetch-playlist.js         # Apple Music 곡·커버·앨범 파싱
│  ├─ save-activity.js          # 곡·평가·답글 저장과 후속 알림
│  └─ ...                      # 구독, 알림, 리마인드, 커버 동기화
├─ public/                      # 배포되는 정적 파일의 원본
│  ├─ assets/fonts/            # Pretendard와 라이선스
│  ├─ assets/icons/            # 실제 사용하는 PWA 아이콘
│  ├─ manifest.json
│  ├─ service-worker.js
│  └─ version.json
├─ src/
│  ├─ app/                     # 라우팅, Provider, 공통 UI 상태
│  ├─ pages/                   # 홈, 오노추, 무티고을, 내 정보
│  ├─ components/              # 곡 상세, 앨범 링크, 추천·평가·답글 입력
│  │  └─ ui/                   # Dialog, Toast, Avatar, 별점 등
│  ├─ features/                # 프로필 선택과 관리자 인증
│  ├─ hooks/                   # Query, mutation, Push, PWA, 상세 URL
│  ├─ lib/                     # 판정 규칙, 초안, 페이지 조회, API
│  ├─ styles/                  # globals.css 공통 화면, admin.css 관리 도구
│  └─ types/                   # 데이터 타입
├─ supabase/
│  ├─ schema.sql               # 새 환경용 DB 스키마
│  └─ migrations/              # 기존 환경용 변경 SQL
├─ tests/api/                  # 외부 발송 없이 API 검증
├─ tests/e2e/                  # 예시 데이터로 브라우저 검증
├─ docs/                       # 개발·운영 문서와 화면 이미지
├─ scripts/update-version.js   # 개발용 버전 갱신
├─ vite.config.ts              # 빌드와 로컬 API 어댑터
└─ vercel.json                 # 배포, rewrite, 예약 작업
```

배포되는 아이콘은 `public/assets/icons/`의 파일입니다. 루트의 `assets/icons/`는 원본 자료이며, 정적 파일의 실행 경로는 `public/`을 기준으로 합니다.

## 데이터가 흐르는 방식

| 작업 | 처리 경로 |
|---|---|
| 목록 조회 | React → Supabase anon 연결 → 곡·평가 요약·프로필·무티고을 목록 |
| 상세 조회 | 곡을 열 때 해당 곡의 평가 이유와 답글만 추가 조회 |
| 곡·평가 저장 | 입력 폼 → `/api/save-activity` → 프로필 조회 → DB RPC → 성공한 변경에 서버 알림 |
| 답글 저장 | 입력 폼 → `/api/save-activity` → 답글 저장 → 원 평가 작성자 알림 |
| 앨범 열기 | 저장된 앨범 URL 우선 → 일반 곡은 필요 시 플레이리스트 조회 |
| 실시간 갱신 | Supabase 변경 이벤트 → 목록과 상세 Query 무효화 → 다시 조회 |

목록과 상세의 DB 조회는 [pagination.ts](../src/lib/pagination.ts)로 마지막 페이지까지 읽습니다. 정렬에는 ID를 포함하고, 요청 크기보다 서버가 적게 반환해도 실제 반환 수만큼 다음 페이지로 이동합니다. 중간 오류는 부분 성공으로 숨기지 않습니다.

곡과 평가 저장 RPC에는 **anon key**를 사용합니다. 서버의 알림·구독·커버 처리에 사용하는 service-role key와 구분합니다. 프로필 이름은 선택한 `memberId`로 조회합니다.

### 앨범 링크

[SongAlbumLink.tsx](../src/components/SongAlbumLink.tsx)가 오노추 또는 무티고을 플레이리스트를 조회하고 곡명·아티스트를 비교합니다. 현재 비교는 앞뒤 공백과 대소문자를 정리하는 방식이며, 다른 표기나 번역명을 추측해서 연결하지 않습니다.

서버는 HTTPS의 `music.apple.com` 앨범 주소만 허용하며 트랙 선택 쿼리와 해시를 제거합니다. 추천 시 `add_song_with_metadata` RPC가 곡·앨범 정보·최초 평가를 함께 저장합니다. 앨범 정보도 추천 초안에 포함하며, 곡명이나 아티스트를 바꾸면 연결된 커버·앨범 정보를 비웁니다. 기존 곡은 동기화와 보관 직전 조회로 비어 있는 정보를 보완합니다.

보관된 곡은 저장된 링크만 사용하며 더 이상 현재 플레이리스트를 조회하지 않습니다. 링크가 없으면 검색에 사용할 곡 정보를 안내합니다. 커버는 외부 URL이므로 이미지 자체의 영구 보존을 보장하지 않습니다.

### 초안과 상세 URL

추천·평가·답글 초안은 [drafts.ts](../src/lib/drafts.ts)가 `localStorage`에 저장합니다. 키는 프로필과 폼 종류·곡 또는 평가 ID를 구분합니다. 마지막 저장 후 7일 이내의 유효한 초안만 복원하며, 저장 성공 시 지우고 실패 시 유지합니다.

상세 화면은 `?song=곡ID`로 열고, `vote`와 `reply`가 있으면 해당 평가·답글을 강조합니다. 뒤로가기로 상세를 닫아도 기존 목록 필터를 유지합니다. 예: `/onochoo?filter=pending&song=곡ID&vote=평가ID&reply=답글ID`.

### 연속 평가와 기록

`ReviewSessionProvider`는 시작 시 판정일 순으로 미평가 곡 ID를 고정합니다. 완료 수는 신규 평가의 저장 성공 때만 증가하며, 수정·실패·중복 응답은 추가하지 않습니다. 새 추천은 현재 목록에 끼워 넣지 않고, 다른 기기에서 평가했거나 보관·이동된 곡은 제외 사유와 함께 건너뜁니다. 프로필별 `sessionStorage`에 24시간까지 보관하고 새로고침·상세창 닫기 후 이어갈 수 있습니다. 브라우저 탭을 닫으면 해당 세션은 끝납니다. 다음 곡은 사용자가 직접 이동하고 URL은 replace하므로 뒤로가기는 원래 목록으로 돌아갑니다.

방출 보관은 `songs.archived_at`을 설정합니다. `archive_songs` RPC는 관리자만 호출하고 여러 곡을 한 트랜잭션으로 처리합니다. 곡 행 잠금을 평가·답글·무티고을 이동과 공유하며 최신 7일/표 조건을 검사합니다. DB 트리거는 보관된 곡·평가·답글의 변경과 보관 곡의 무티고을 이동을 거부하고, 과거 클라이언트의 곡 삭제도 차단합니다. 무티고을의 새 평가·평가 수정도 DB에서 차단합니다. 현재 목록과 평가 알림은 보관 곡을 제외합니다. 월간 결산과 재추천 회차는 아직 구현하지 않았습니다.

### 보류한 주제 기능과 모션

주제 관련 DB·RPC·컴포넌트는 이후 도입을 위해 남겨두되 현재 화면에서는 사용하지 않습니다. 주제 조회와 Realtime 구독을 실행하지 않으며 기존 `?theme=` 링크는 일반 오노추 목록으로 열립니다. 주제 마이그레이션 없이도 기록 기능을 적용할 수 있습니다.

페이지 진입 모션은 경로가 바뀔 때만 실행하며 상세 열기 같은 query 변경에는 다시 재생하지 않습니다. Radix의 `data-state` CSS 애니메이션을 사용하고 상세 콘텐츠를 닫힘 동안 유지합니다. 운영체제 `prefers-reduced-motion`을 따릅니다.

<a id="api"></a>

## API 안내

| 메서드 | 경로 | 역할 |
|---|---|---|
| GET | `/api/config` | Supabase URL·anon key |
| GET | `/api/vapid-public-key` | Web Push 공개 키. `config.js`로 내부 연결 |
| GET | `/api/fetch-playlist?url=…` | Apple Music 곡·아티스트·커버·앨범 정보 |
| POST | `/api/save-activity` | `kind: song / vote / reply` 저장과 후속 알림 |
| POST | `/api/update-song-covers` | 일치하는 곡의 비어 있는 커버 보완 |
| POST | `/api/save-subscription` | 기기 Push 구독 저장 |
| POST | `/api/remove-subscription` | 기기 Push 구독 비활성화 |
| POST | `/api/send-test-notification` | 현재 프로필·기기의 구독으로 테스트 발송 |
| POST | `/api/send-song-added-notification` | 서버 인증 후 새 곡 알림 |
| POST | `/api/send-reaction-notification` | 서버 인증 후 평가·수정·답글 알림 |
| GET / POST | `/api/send-add-song-reminders` | 곡 추천 리마인드 |
| GET / POST | `/api/send-reminders` | 미평가 곡 리마인드 |
| GET / POST | `/api/cleanup-push-subscriptions` | 오래된 비활성 구독 정리 |

`save-activity`와 테스트 알림 요청은 같은 Origin의 JSON POST인지 확인합니다. 직접 알림 발송과 예약 작업은 `Authorization: Bearer <CRON_SECRET>`이 필요합니다. 전체 API에 동일한 사용자 인증이 적용된다는 뜻은 아닙니다. [실제 권한 범위](OPERATIONS.md#permissions)를 확인하세요.

현재 URL은 13개지만 별도 배포 함수는 12개입니다. `/api/vapid-public-key`는 `/api/config?resource=vapid-public-key`로 rewrite합니다. `_`로 시작하는 공통 모듈은 별도 함수가 되지 않습니다. [Vercel의 공통 모듈 규칙](https://vercel.com/docs/functions/configuring-functions/advanced-configuration#adding-utility-files-to-the-api-directory)

<a id="testing"></a>

## 실행과 검증

| 명령어 | 확인하는 것 |
|---|---|
| `npm run dev` | 앱과 로컬 API 실행 |
| `npm run typecheck` | TypeScript 검사 |
| `npm run test` | 판정, 별점, 답글, 페이지 조회 규칙 |
| `npm run test:watch` | 단위 테스트 변경 감지 |
| `npm run test:api` | 저장·알림 경계, 공개 설정, 앨범 추출·URL 검증 |
| `npm run test:e2e` | 화면 크기, 초안, 저장 실패·재시도, 앨범·알림 링크 |
| `npm run build` | 타입 검사, 배포용 `dist/`, 새 버전 파일 생성 |
| `npm run preview` | 빌드된 정적 화면 확인. API 서버는 포함하지 않음 |
| `npm run update-version` | 개발용 `public/version.json` 갱신 |

```bash
npx playwright install chromium
npm run test
npm run test:api
npm run test:e2e
npm run build
```

API 테스트는 외부 연결을 대체하고, 브라우저 테스트는 [fixture.ts](../tests/e2e/fixture.ts)로 API와 DB 응답을 대체합니다. 테스트 실행으로 운영 데이터나 실제 Push를 변경하지 않습니다. `npm run dev`에서 직접 쓰는 환경은 `.env.local`이 가리키는 실제 DB이므로, 자동 테스트와 구분하세요.

브라우저 테스트는 `127.0.0.1:5173`을 사용하며 로컬에 실행 중인 개발 서버가 있으면 재사용합니다. 320·390·768·1024·1440px 화면을 검사하고 `test-results/layout/`에 캡처를 저장합니다. `test-results/`와 `playwright-report/`는 Git에서 제외합니다.

기록 마이그레이션은 `tests/db/records.cjs`로 새 DB와 기존 DB 업그레이드를 각각 검증합니다. 별도 설치한 PGlite에서 실행하므로 운영 DB에 연결하지 않습니다. 예를 들어 검증용 디렉터리에 `npm install --prefix /tmp/ohnochoo-db-check @electric-sql/pglite`로 설치한 뒤 `NODE_PATH=/tmp/ohnochoo-db-check/node_modules node tests/db/records.cjs`를 실행할 수 있습니다. 관리자 권한, 보관의 원자성, 수정·삭제 차단, 재시도, 앨범 저장, 기존 추천·평가 호환성을 검사합니다.

## 화면과 PWA를 수정할 때

- 배경·텍스트·강조·판정 색상은 `src/styles/globals.css`의 CSS 변수로 관리합니다. 곡 목록은 커버·곡명·아티스트·평가 수·상태를 표시하고, 승격·보류·방출의 상세 수치는 곡 상세에서 확인합니다.
- 모바일은 상단 추천 버튼과 하단 네 개 탭, 900px 이상은 사이드바를 사용합니다. 홈은 1200px 이상에서 평가할 곡과 최근 무티고을을 나란히 배치합니다. 관리 도구의 세부 스타일은 `src/styles/admin.css`에 있습니다.
- `tests/e2e/design.spec.ts`는 목록의 키보드 조작, 반쪽 별점 표시와 입력, 빈 목록의 추천·탐색 동선을 확인합니다. 별점은 하나의 슬라이더로 동작하며 방향키로 0.5점씩 조절합니다.
- 폰트는 `public/assets/fonts/`에서 직접 제공하며 [OFL.txt](../public/assets/fonts/OFL.txt)를 함께 배포합니다.
- 홈 화면 웹앱의 모바일 헤더는 `safe-area-inset-top`에 16px를 더해 로고와 프로필을 아래로 배치합니다. iOS 시스템 블러는 데스크톱 모의 화면으로 재현할 수 없어 실제 기기 확인도 필요합니다.
- Service Worker의 경로와 scope는 각각 `/service-worker.js`, `/`입니다. 현재 오프라인용 응답 캐시는 구현하지 않습니다.
- 배포 빌드는 `dist/version.json`을 새로 생성합니다. 앱은 화면 복귀 시 버전을 확인하고 사용자가 업데이트를 눌렀을 때 새로고침합니다.
- README 이미지는 예시 데이터로 촬영한 `docs/images/` 파일입니다. 화면 변경 시 개인 프로필·실제 댓글이 포함되지 않은 캡처로 갱신하세요.

로컬 API는 CommonJS 모듈을 불러옵니다. API 파일을 수정했는데 응답이 이전과 같으면 개발 서버를 다시 시작하세요. 새 rewrite를 추가할 때에는 [vite.config.ts](../vite.config.ts)의 로컬 경로 처리도 맞춰야 합니다.
