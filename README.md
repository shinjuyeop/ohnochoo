# ohnochoo

친구들과 노래를 추천하고 `승격`·`보류`·`방출`로 평가하는 모바일 우선 플레이리스트 웹앱입니다. 승격 조건을 만족한 곡은 무티고을로 이동할 수 있습니다.

## 주요 기능

- 프로필 선택, `localStorage` 저장 및 프로필 사진 등록
- `member_id` 우선 처리와 기존 이름 데이터 fallback
- Apple Music 플레이리스트 동기화 및 수동 곡 추가
- 추천 이유, 0.5점 단위 별점, 최초 승격 평가 저장
- 평가 등록·수정 및 변경 없는 중복 저장 방지
- DB RPC를 통한 곡·최초 평가 원자적 저장
- 오노추 필터와 곡 상세 평가 목록
- 무티고을 그리드·목록 보기 및 추가일 정렬
- Supabase Realtime 자동 갱신
- 프로필별 Web Push 구독·해제·테스트
- 새 곡, 새 평가, 평가 수정, 리마인드 알림
- PWA 설치와 앱 버전 갱신 감지
- Supabase Auth 기반 관리자 로그인
- 평가자 추가, 곡 정보 수정, 무티고을 이동, 방출 예정 필터와 곡 일괄 삭제 관리 기능

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
| Apple Music parser | Node.js Fetch, JSON |
| Test | Vitest |

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
│  └─ update-version.js         # 개발용 public/version.json 갱신
├─ src/
│  ├─ app/                      # Router, Provider, 앱 UI Context
│  ├─ pages/                    # 홈, 오노추, 무티고을, 내 정보
│  ├─ features/                 # 프로필 상태와 관리자 인증
│  ├─ components/               # 화면 공통 컴포넌트
│  │  └─ ui/                    # Dialog, Toast, Avatar 등 UI 요소
│  ├─ hooks/                    # Query, mutation, Push, PWA 동작
│  ├─ lib/                      # Supabase, 규칙, API, 유틸리티
│  │  └─ *.test.ts              # 핵심 규칙 단위 테스트
│  ├─ styles/globals.css        # 디자인 시스템과 반응형 스타일
│  └─ types/                    # 공통 TypeScript 타입
├─ supabase/
│  ├─ schema.sql                # 새 환경용 전체 DB 스키마
│  └─ migrations/               # 운영 DB에 순서대로 적용할 변경 SQL
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

Node.js 20 이상과 npm 10 이상을 권장합니다.

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
npm run test         # Vitest 단위 테스트 1회 실행
npm run test:watch   # 변경을 감지하며 테스트
npm run build        # 타입 검사 후 프로덕션 빌드
npm run preview      # dist 미리보기
npm run update-version
```

프로덕션 빌드는 배포 시각을 `dist/version.json`에 자동으로 기록합니다. `npm run update-version`은 개발 중 `public/version.json`을 수동으로 갱신할 때만 사용합니다. 앱은 화면으로 복귀할 때 버전을 확인하고 저장된 값과 다르면 새로고침합니다.

`npm run preview`는 정적 `dist/`만 제공하므로 `/api/*` Vercel Functions를 실행하지 않습니다. API까지 확인할 때는 환경 변수를 설정한 뒤 `npm run dev`를 사용합니다.

## 데이터베이스

주요 테이블은 다음과 같습니다.

| 테이블 | 역할 |
|---|---|
| `songs` | 곡, 추가자, 앨범 커버 |
| `members` | 평가자 프로필과 프로필 사진 URL |
| `votes` | 결정, 별점, 평가 이유 |
| `mutigoeul_songs` | 무티고을 이동 정보 |
| `admin_users` | Supabase Auth 사용자와 관리자 프로필 연결 |
| `push_subscriptions` | 프로필별 Push 구독 |
| `notification_logs` | 알림 중복 방지 및 발송 상태 |

`songs.adder_member_id`와 `votes.member_id`를 우선 사용하며, 이전 데이터는 `adder`와 `voter` 이름으로 호환합니다. Realtime publication에는 `songs`, `votes`, `members`, `mutigoeul_songs`가 포함되어야 합니다.

`supabase/schema.sql`에는 다음 데이터 정합성 규칙이 포함됩니다.

- 기존 중복 평가는 프로필·곡별 최신 항목 하나만 유지
- 프로필·곡별 평가 고유 인덱스
- `add_song_with_initial_vote`: 곡과 최초 평가를 하나의 트랜잭션으로 저장
- `save_member_vote`: 같은 평가는 건너뛰고 기존 평가는 원자적으로 수정

새 Supabase 프로젝트는 `supabase/schema.sql`을 적용해 전체 구조를 만들 수 있습니다. 이미 운영 중인 프로젝트는 기존 데이터를 보존하기 위해 `supabase/migrations/`의 아직 적용하지 않은 SQL만 파일명 순서대로 실행합니다. 각 마이그레이션은 한 번만 적용하고, 적용 여부가 불분명하면 먼저 SQL Editor에서 관련 테이블·함수·정책을 조회합니다.

운영 DB에 새 RPC를 적용하기 전에도 앱은 기존 저장 방식으로 동작하며, 최초 평가 저장이 실패하면 추가된 곡을 자동 정리합니다. 완전한 원자성과 DB 수준 중복 방지를 활성화하려면 `20260720190000_atomic_song_votes.sql`을 적용해야 합니다.

주요 마이그레이션은 다음과 같습니다.

| 파일 | 내용 |
|---|---|
| `20260720190000_atomic_song_votes.sql` | 곡·최초 평가 원자 저장, 평가 저장 RPC와 중복 방지 인덱스 |
| `20260721190000_admin_auth.sql` | `admin_users`와 Supabase Auth 기반 관리자 권한 |
| `20260721210000_admin_song_updates.sql` | 관리자의 곡 제목·아티스트·추가자·등록일 수정 권한 |
| `20260721220000_profile_images.sql` | 프로필 사진 컬럼과 Storage 접근 정책 |
| `20260721221000_fix_profile_image_policies.sql` | Storage 경로 검증 정책 보정 |

프로필 사진을 사용하려면 Supabase Storage에서 공개 버킷 `profile-images`를 직접 생성한 뒤 파일 크기 제한을 1MB, Allowed MIME types를 `image/webp`로 설정합니다. PNG 원본도 브라우저에서 업로드 전에 512×512 WebP로 변환되므로 현재 앱에서는 `image/png` 허용이 필수는 아닙니다. 파일은 `member-id/avatar.webp`의 고정 경로를 덮어써 이전 사진이 누적되지 않습니다.

기존 운영 DB에는 `20260721220000_profile_images.sql`과 정책 보정 파일인 `20260721221000_fix_profile_image_policies.sql`까지 순서대로 적용해야 합니다. 버킷 이름이 다르거나 두 번째 정책이 빠지면 `Bucket not found` 또는 `new row violates row level security policy` 오류가 발생합니다.

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

`npm run build`가 `dist/version.json`에 매번 새 버전을 생성하므로 배포 전에 별도 버전 갱신 명령을 실행할 필요가 없습니다.

## 운영 주의

- 평가자 추가, 노래 삭제, 무티고을 이동은 Supabase Auth 계정과 `admin_users` 매핑으로 보호합니다.
- 운영 DB에는 `supabase/migrations/`의 SQL을 파일명 순서대로 적용합니다.
- 관리자 계정 비밀번호는 코드나 환경 변수에 저장하지 않고 Supabase Authentication에서 관리합니다.
- 프로필 사진 변경은 로그인 없이 현재 선택한 프로필을 기준으로 허용됩니다. 링크를 아는 사람만 사용하는 소규모 앱이라는 현재 운영 전제에 맞춘 정책입니다.
- `supabase/schema.sql`과 실제 운영 데이터는 별도의 명시적인 마이그레이션 없이 변경하지 않습니다.

## 문제 해결

- Supabase 연결 실패: `/api/config` 응답과 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 설정을 확인합니다.
- 프로필 사진 업로드 실패: `profile-images` 버킷 이름·공개 설정·`image/webp` 허용 여부와 최신 Storage 정책 적용 여부를 확인합니다.
- Push 미수신: 브라우저 알림 권한, HTTPS 환경, VAPID 환경 변수와 설정 화면의 구독 상태를 확인합니다.
- 새 배포 미반영: 앱을 다시 열거나 `version.json` 응답과 서비스 워커 등록 상태를 확인합니다.

## License

ISC
