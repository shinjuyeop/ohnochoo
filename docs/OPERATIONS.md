# 운영 가이드

[README](../README.md) · [개발 가이드](DEVELOPMENT.md)

<a id="setup"></a>

## 처음 구성할 때

1. Supabase 프로젝트를 준비하고 아래의 DB 초기 설정을 적용합니다.
2. 첫 프로필과 관리자 계정을 연결하고, Realtime과 프로필 사진 버킷을 설정합니다.
3. [.env.example](../.env.example)을 바탕으로 `.env.local`과 Vercel 환경 변수를 입력합니다.
4. 로컬에서 화면·저장을 확인한 뒤 Vercel에 배포합니다. 운영 전용 검증을 제외한 자동 테스트는 예시 데이터로 실행됩니다.

### 환경 변수

| 변수 | 용도 | 브라우저 전달 |
|---|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 연결 | 예 |
| `SUPABASE_ANON_KEY` | 일반 데이터 조회·저장 | 예 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버의 알림·구독·커버 처리 | 아니요 |
| `VAPID_PUBLIC_KEY` | 기기의 Push 구독 | 예 |
| `VAPID_PRIVATE_KEY` | 서버 Push 서명 | 아니요 |
| `VAPID_SUBJECT` | Push 발신자 연락처, 예: `mailto:you@example.com` | 아니요 |
| `CRON_SECRET` | 예약 작업·직접 알림 API 인증 | 아니요 |

앱의 기본 연결에는 Supabase URL과 anon key가 필요합니다. Push·예약 작업·커버 동기화를 사용하려면 관련 서버 변수도 설정합니다. 비공개 변수에 `VITE_` 접두사를 붙이지 않으며, `.env.local`은 커밋하지 않습니다.

VAPID 키를 처음 만들 때에는 `npx web-push generate-vapid-keys`를 사용할 수 있습니다. 생성된 공개 키와 비공개 키를 각각 설정합니다. 이미 사용 중인 키를 교체하면 기존 기기의 구독도 함께 확인해야 합니다.

`CRON_SECRET`은 충분히 긴 무작위 문자열로 설정합니다. Vercel은 예약 요청에 이 값을 `Authorization: Bearer …`로 넣습니다. 앱은 비밀값 누락 시 503, 인증 불일치 시 401을 반환합니다. [Vercel Cron 인증 안내](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs)

### DB 초기 설정과 마이그레이션

| 환경 | 적용 방법 |
|---|---|
| 새 프로젝트 | [schema.sql](../supabase/schema.sql)로 테이블·함수·정책 구성 |
| 기존 프로젝트 | [migrations/](../supabase/migrations)의 미적용 파일만 파일명 순서대로 적용 |

운영 DB에 전체 스키마를 반복 실행하는 방식으로 업데이트하지 않습니다. 스키마와 첫 원자 저장 마이그레이션에는 중복 평가를 정리하는 SQL이 포함되어 있습니다. 적용 전 기존 데이터와 마이그레이션 이력을 확인하고 백업을 준비하세요. Git 푸시나 Vercel 배포는 SQL을 자동 적용하지 않습니다.

| 마이그레이션 | 내용 |
|---|---|
| [20260720190000_atomic_song_votes.sql](../supabase/migrations/20260720190000_atomic_song_votes.sql) | 곡·최초 평가 원자 저장, 평가 저장 RPC, 중복 방지 |
| [20260721190000_admin_auth.sql](../supabase/migrations/20260721190000_admin_auth.sql) | 관리자 계정 매핑과 Auth 기반 권한 |
| [20260721210000_admin_song_updates.sql](../supabase/migrations/20260721210000_admin_song_updates.sql) | 관리자 곡 정보 수정 |
| [20260721220000_profile_images.sql](../supabase/migrations/20260721220000_profile_images.sql) | 프로필 사진 컬럼과 Storage 정책 |
| [20260721221000_fix_profile_image_policies.sql](../supabase/migrations/20260721221000_fix_profile_image_policies.sql) | 사진 경로 검증 정책 보정 |
| [20260723130000_vote_replies.sql](../supabase/migrations/20260723130000_vote_replies.sql) | 답글·300자 제한·접근 정책 |

곡·평가 저장에는 `add_song_with_initial_vote`와 `save_member_vote`가 필요합니다. RPC가 없으면 앱이 503과 DB 업데이트 안내를 반환합니다. SQL Editor에서 아래의 **조회 전용 SQL**로 함수 존재 여부를 확인할 수 있습니다. 결과가 `null`이면 해당 함수가 없습니다.

```sql
select
  to_regprocedure('public.add_song_with_initial_vote(text,text,text,uuid,text,numeric,text)') as add_song_rpc,
  to_regprocedure('public.save_member_vote(uuid,text,uuid,text,numeric,text)') as save_vote_rpc;
```

### 주요 데이터

| 테이블 | 담는 정보 |
|---|---|
| `songs` | 곡·아티스트·추천자·등록일·커버 |
| `members` | 프로필·프로필 사진 |
| `votes` | 승격·보류·방출, 별점, 이유 |
| `vote_replies` | 평가에 달린 답글 |
| `mutigoeul_songs` | 무티고을로 이동한 곡 |
| `admin_users` | Auth 계정과 관리자 프로필 연결 |
| `push_subscriptions` | 기기 구독과 활성 상태 |
| `notification_logs` | 알림 중복 방지와 발송 상태 |

추천자·평가자는 `adder_member_id`와 `member_id`로 우선 식별하며, 예전 데이터는 이름으로 호환합니다. Realtime publication에는 `songs`, `votes`, `vote_replies`, `members`, `mutigoeul_songs`를 포함합니다.

### 첫 프로필과 관리자

새 DB에는 첫 프로필이 자동 생성되지 않습니다. Supabase Table Editor에서 `members`에 프로필을 만들고, Supabase Authentication에서 관리자 계정을 준비합니다. `admin_users.user_id`에 Auth 사용자 ID, `member_id`에 연결할 프로필 ID를 입력합니다.

앱의 **내 정보**에서 관리자 계정으로 로그인하면 평가자 추가, 곡 정보 수정·삭제, 무티고을 이동 기능을 사용할 수 있습니다. 계정 비밀번호는 앱 코드나 환경 변수에 저장하지 않습니다.

### 프로필 사진

Supabase Storage에 아래 버킷을 직접 생성합니다. SQL 정책만으로 버킷이 만들어지지는 않습니다.

| 설정 | 값 |
|---|---|
| 버킷 이름 | `profile-images` |
| 공개 여부 | Public |
| 파일 크기 제한 | 1MB |
| 허용 MIME | `image/webp` |
| 파일 경로 | `member-id/avatar.webp` |

앱은 12MB 이하의 원본 이미지를 중앙 정사각형으로 잘라 512×512 WebP로 변환합니다. 같은 경로를 덮어쓰므로 이전 사진이 계속 쌓이지 않습니다. 기존 환경은 사진 관련 마이그레이션 **두 파일 모두** 적용되어 있어야 합니다.

## 배포

[vercel.json](../vercel.json)이 배포 설정의 기준입니다.

| 항목 | 설정 |
|---|---|
| Install | `npm install` |
| Build | `npm run build` |
| Output | `dist` |
| SPA rewrite | `/onochoo`, `/mutigoeul`, `/settings` → `/index.html` |
| 공개 키 alias | `/api/vapid-public-key` → `/api/config?resource=vapid-public-key` |
| 저장 함수 제한 시간 | `api/save-activity.js`: 60초 |

현재 배포는 12개의 독립 API 함수로 구성합니다. 공개 키 조회를 설정 조회와 통합해 함수 수를 줄였으므로, 새 API를 추가할 때 별도 함수가 필요한지와 현재 요금제의 제한을 확인하세요. `_`로 시작하는 파일은 서버 공통 모듈로 사용합니다.

배포 빌드는 `dist/version.json`을 생성합니다. 배포 전에 `npm run update-version`을 별도로 실행할 필요는 없습니다. Vercel 프로젝트에 설정한 Git 연결로 푸시 후 자동 배포가 진행되더라도, **커밋 푸시 성공과 배포 성공은 별개**입니다.

### 배포 전후 확인

- [ ] 필요한 DB 마이그레이션과 두 저장 RPC가 적용되어 있다.
- [ ] Production 환경 변수, Realtime, Storage, 관리자 매핑을 확인했다.
- [ ] 변경에 해당하는 테스트와 `npm run build`가 통과했다.
- [ ] Vercel 배포 상태가 성공이며 실제 배포된 커밋이 맞다.
- [ ] 앱과 `/api/config`, `/api/vapid-public-key`, `/version.json`이 정상 응답한다.
- [ ] 곡 상세·앨범 링크·모바일 배치와 iPhone 홈 화면 웹앱을 확인했다.

실제 저장·알림 발송 검증은 운영 데이터와 수신자에게 영향을 줍니다. 테스트 계정·데이터·수신 기기를 정한 뒤 진행하세요. 자동 테스트의 통과와 운영 서비스 설정 검증을 구분합니다.

## 알림과 예약 작업

| 알림 | 수신 대상 |
|---|---|
| 새 곡 | 추천자를 제외한 활성 구독자 |
| 새 평가·평가 수정 | 작성자를 제외한 활성 구독자 |
| 답글 | 답글 작성자와 다른 원 평가 작성자 |
| 테스트 알림 | 현재 프로필이며 endpoint·auth가 일치하는 현재 기기 |

저장에 성공한 변경만 서버가 후속 알림을 시도합니다. 알림 발송 실패가 이미 완료된 저장을 취소하지는 않습니다. 작성자·곡 정보는 DB에서 읽고, `notification_logs.dedupe_key`로 중복을 막습니다. 평가를 이전과 완전히 같은 내용으로 되돌리면 그 내용의 알림을 다시 보내지 않습니다.

알림을 누르면 곡·평가·답글 위치로 이동합니다. Service Worker는 같은 사이트의 주소만 열도록 제한합니다. Push endpoint가 404 또는 410을 반환하면 해당 구독을 비활성화합니다.

아래 시간은 [vercel.json](../vercel.json)의 UTC cron 표현식을 한국 시간으로 환산한 **설정 기준**입니다.

| 작업 | UTC | 한국 시간 | 대상 |
|---|---|---|---|
| 미평가 리마인드 | `0 12 * * *` | 매일 21:00 | 등록 후 24시간 이상 지났고 아직 평가하지 않은 오노추 곡 |
| 추천 리마인드 | `0 14 * * *` | 매일 23:00 | 해당 일의 추천 여부를 기준으로 미추천자에게 발송 |
| 구독 정리 | `0 18 * * *` | 매일 03:00 | 비활성 상태이며 갱신 후 30일이 지난 구독 삭제 |

Cron 요청과 독립 알림 API는 서버 인증을 통과해야 실행됩니다. 실행 상태는 Vercel의 Cron·함수 로그와 `notification_logs`에서 확인합니다.

<a id="permissions"></a>

## 권한과 데이터 보관

일반 프로필 선택은 본인 인증이 아닙니다. 같은 링크를 사용하는 사람은 다른 프로필을 선택할 수 있으며, 일반 저장 API도 이 기존 운영 전제를 유지합니다. Origin·JSON 검사는 다른 사이트의 폼 요청을 막기 위한 것으로 사용자 인증을 대신하지 않습니다.

관리자 기능은 Supabase Auth, `admin_users`, DB 정책으로 보호합니다. 프로필 사진 변경은 현재 선택한 프로필을 기준으로 허용합니다. 공개 가입 서비스로 확장하려면 일반 사용자의 인증과 데이터 정책도 함께 재설계해야 합니다.

초안과 선택한 프로필은 브라우저의 `localStorage`에 보관합니다. 초안은 기기 간 동기화되지 않으며 마지막 저장 후 7일이 지나면 복원하지 않습니다. 공유 기기에서는 같은 프로필을 선택한 사람이 초안을 볼 수 있습니다. 사이트 데이터를 지우면 저장하지 않은 초안도 함께 사라집니다.

## 문제 해결

| 증상 | 확인할 내용 |
|---|---|
| Supabase 연결 실패 | `/api/config` 응답, URL·anon key, 실제 프로젝트의 테이블·정책 |
| 저장에 필요한 DB 업데이트 안내 | 두 저장 RPC와 `20260720190000_atomic_song_votes.sql` 적용 여부 |
| `Bucket not found` | `profile-images` 버킷 이름과 생성 여부 |
| 사진 업로드 RLS 오류 | 사진 마이그레이션 두 파일, 로그인 상태별 정책, 업로드 경로 |
| Apple Music 앨범 대신 플레이리스트가 표시됨 | 해당 곡의 플레이리스트 포함 여부, 곡명·아티스트 일치, **앨범 다시 찾기** |
| iPhone 알림 미지원 | Safari 탭이 아닌 홈 화면 웹앱인지, 지원 OS인지, 기기 알림 권한 |
| 알림이 오지 않음 | HTTPS, VAPID 설정, 활성 구독, 내 정보의 테스트 알림과 함수 로그 |
| 예약 작업 503 / 401 | 각각 `CRON_SECRET` 누락 / 요청의 서버 인증 불일치 |
| 빌드는 성공했는데 배포 실패 | Build Logs뿐 아니라 배포 화면의 최종 오류, 함수 개수·요금제 제한 |
| 새 버전이 보이지 않음 | 배포 성공 여부, `/version.json`, 앱 복귀 후 업데이트 버튼, 앱 재실행 |
| 로컬 API만 이전 코드로 동작 | 개발 서버 재시작. CommonJS 모듈 캐시가 남아 있을 수 있음 |

새 버전을 확인하려고 곧바로 사이트 데이터를 삭제하지 마세요. 먼저 앱 재실행과 업데이트 버튼을 사용하면 작성 중인 초안을 보존할 수 있습니다.
