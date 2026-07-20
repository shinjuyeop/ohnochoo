# ohnochoo

친구들과 노래를 추천하고 `승격`·`보류`·`방출`로 평가하는 모바일 우선 플레이리스트 웹앱입니다. 승격 조건을 만족한 곡은 무티고을로 이동할 수 있습니다.

## 주요 기능

- 프로필 선택 및 `localStorage` 저장
- `member_id` 우선 처리와 기존 이름 데이터 fallback
- Apple Music 플레이리스트 동기화 및 수동 곡 추가
- 추천 이유, 0.5점 단위 별점, 최초 승격 평가 저장
- 평가 등록·수정 및 변경 없는 중복 저장 방지
- 오노추 필터와 곡 상세 평가 목록
- 무티고을 그리드·목록 보기 및 추가일 정렬
- Supabase Realtime 자동 갱신
- 프로필별 Web Push 구독·해제·테스트
- 새 곡, 새 평가, 평가 수정, 리마인드 알림
- PWA 설치와 앱 버전 갱신 감지
- 평가자 추가, 노래 삭제, 무티고을 이동 관리 기능

## 판정 기준

| 상태 | 조건 |
|---|---|
| 평가 중 | 등록 후 7일 미만 또는 판정 조건 미확정 |
| 승격 후보 | `승격 >= 방출 + 3` |
| 무티고을 이동 가능 | 등록 후 7일 경과 및 승격 조건 충족 |
| 방출 예정 | 등록 후 7일 경과 및 승격 조건 미충족 |

평균 별점은 0점 평가를 제외하고 계산합니다.

## 기술 구성

| 영역 | 기술 |
|---|---|
| Frontend | React, TypeScript, Vite, React Router |
| Server state | TanStack Query, Supabase Realtime |
| Forms | React Hook Form, Zod |
| UI | Tailwind CSS, Radix Dialog, Lucide React |
| Backend | Vercel Serverless Functions, Node.js |
| Database | Supabase PostgreSQL |
| Push | Web Push, VAPID, Service Worker |
| Apple Music parser | Axios, Cheerio |

## 프로젝트 구조

```text
ohnochoo/
├─ api/                         # Vercel Serverless Functions
│  ├─ _push-utils.js            # Push 및 service-role 공통 처리
│  ├─ config.js                 # 클라이언트용 Supabase 설정
│  ├─ fetch-playlist.js         # Apple Music 파싱
│  ├─ save-subscription.js      # Push 구독 저장
│  ├─ remove-subscription.js    # Push 구독 비활성화
│  ├─ send-*.js                 # 알림 및 리마인드 발송
│  └─ update-song-covers.js     # 앨범 커버 동기화
├─ assets/icons/                # 앱 아이콘 원본
├─ public/                      # Vite가 그대로 배포하는 정적 파일
│  ├─ assets/icons/             # 실제 사용 중인 PWA 아이콘
│  ├─ manifest.json
│  ├─ service-worker.js
│  └─ version.json
├─ scripts/
│  └─ update-version.js         # public/version.json 갱신
├─ src/
│  ├─ app/                      # Router, Provider, 앱 UI Context
│  ├─ pages/                    # 홈, 오노추, 무티고을, 내 정보
│  ├─ features/profile/         # 선택 프로필 상태
│  ├─ components/               # 화면 공통 컴포넌트
│  │  └─ ui/                    # Dialog, Toast, Avatar 등 UI 요소
│  ├─ hooks/                    # Query, mutation, Push, PWA 동작
│  ├─ lib/                      # Supabase, 규칙, API, 유틸리티
│  ├─ styles/globals.css        # 디자인 시스템과 반응형 스타일
│  └─ types/                    # 공통 TypeScript 타입
├─ supabase/schema.sql          # DB 테이블, RLS, 정책
├─ index.html                   # Vite 진입 문서
├─ vite.config.ts               # Vite 및 로컬 API 어댑터
├─ vercel.json                  # 빌드, SPA rewrite, Cron
└─ package.json
```

`public/`이 manifest, service worker, 배포용 아이콘, 버전 파일의 단일 소스입니다. 최종 서비스 워커 URL과 scope는 각각 `/service-worker.js`, `/`입니다.

## 환경 변수

`.env.local`과 Vercel Environment Variables에 다음 값을 설정합니다.

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
VAPID_PUBLIC_KEY=your-web-push-public-key
VAPID_PRIVATE_KEY=your-web-push-private-key
VAPID_SUBJECT=mailto:you@example.com
```

- `SUPABASE_ANON_KEY`만 브라우저 연결에 사용합니다.
- `SUPABASE_SERVICE_ROLE_KEY`와 `VAPID_PRIVATE_KEY`는 Serverless Function에서만 사용합니다.
- `.env.local`은 Git에 커밋하지 않습니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

기본 주소는 `http://localhost:5173`입니다. Vite 개발 서버는 `api/`의 기존 CommonJS Serverless Functions를 로컬에서 실행하는 어댑터를 포함합니다.

## 명령어

```bash
npm run dev          # 개발 서버
npm run typecheck    # TypeScript 검사
npm run build        # 타입 검사 후 프로덕션 빌드
npm run preview      # dist 미리보기
npm run update-version
```

`npm run update-version`은 KST 타임스탬프로 `public/version.json`을 갱신합니다. 앱은 화면으로 복귀할 때 이 파일을 확인하고 저장된 버전과 다르면 새로고침합니다.

## 데이터베이스

주요 테이블은 다음과 같습니다.

| 테이블 | 역할 |
|---|---|
| `songs` | 곡, 추가자, 앨범 커버 |
| `members` | 평가자 프로필 |
| `votes` | 결정, 별점, 평가 이유 |
| `mutigoeul_songs` | 무티고을 이동 정보 |
| `push_subscriptions` | 프로필별 Push 구독 |
| `notification_logs` | 알림 중복 방지 및 발송 상태 |

`songs.adder_member_id`와 `votes.member_id`를 우선 사용하며, 이전 데이터는 `adder`와 `voter` 이름으로 호환합니다. Realtime publication에는 `songs`, `votes`, `members`, `mutigoeul_songs`가 포함되어야 합니다.

## API

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/config` | Supabase URL과 anon key 반환 |
| `GET` | `/api/fetch-playlist` | Apple Music 플레이리스트 파싱 |
| `POST` | `/api/update-song-covers` | 앨범 커버 URL 갱신 |
| `GET` | `/api/vapid-public-key` | VAPID public key 반환 |
| `POST` | `/api/save-subscription` | Push 구독 저장 |
| `POST` | `/api/remove-subscription` | Push 구독 비활성화 |
| `POST` | `/api/send-test-notification` | 테스트 알림 전송 |
| `POST` | `/api/send-song-added-notification` | 새 곡 알림 |
| `POST` | `/api/send-reaction-notification` | 새 평가·수정 알림을 활성 구독 전체에 전송 |
| `GET/POST` | `/api/send-add-song-reminders` | 곡 추가 리마인드 |
| `GET/POST` | `/api/send-reminders` | 미평가 곡 리마인드 |
| `GET/POST` | `/api/cleanup-push-subscriptions` | 오래된 구독 정리 |

Cron 일정은 `vercel.json`을 기준으로 관리합니다.

## 알림 동작

- 새 곡: 곡 추가자를 제외하고 활성 구독자에게 전송
- 새 평가 및 평가 수정: 활성 구독이 있는 모든 평가자에게 전송
- 테스트 알림: 현재 프로필의 활성 기기로 전송
- 만료된 endpoint: Push 발송 중 404 또는 410 응답 시 비활성화
- 중복 발송: `notification_logs.dedupe_key`로 평가자별 방지

## 배포

Vercel은 다음 설정을 사용합니다.

- Install: `npm install`
- Build: `npm run build`
- Output: `dist`
- SPA routes: `/onochoo`, `/mutigoeul`, `/settings`
- API routes: `/api/*`

배포 전에 `npm run update-version`을 실행하면 기존 사용자가 새 버전을 자동으로 감지할 수 있습니다.

## 운영 주의

- 평가자 추가, 노래 삭제, 무티고을 이동은 현재 클라이언트 비밀번호 확인 방식입니다.
- 공개 범위가 커지면 Supabase Auth와 서버 권한 검증으로 교체해야 합니다.
- `supabase/schema.sql`과 실제 운영 데이터는 별도의 명시적인 마이그레이션 없이 변경하지 않습니다.

## License

ISC
