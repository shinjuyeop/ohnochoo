# 🎧 ohnochoo

친구들과 **오늘의 노래를 추천하고, 평가하고, 무티고을로 보내는** 플레이리스트 웹앱입니다.

오노추에 곡을 올리면 추가자의 추천 이유와 별점이 자동으로 함께 저장되고, 친구들은 각 곡에 대해 `승격` / `보류` / `방출` 평가를 남길 수 있습니다. 조건을 만족한 곡은 무티고을 플레이리스트로 이동할 수 있습니다.

> 오노추 = 오늘의 노래 추천  
> 무티고을 = 승격 조건을 통과한 곡이 모이는 플레이리스트

---

## 🔗 서비스 링크

- App: https://ohnochoo.vercel.app
- 오노추 Apple Music: https://music.apple.com/kr/playlist/o-n0-ch0o%24e/pl.u-Ymb09optgrM3117
- 무티고을 Apple Music: https://music.apple.com/kr/playlist/muti9oeul/pl.u-06oxDW6uWPKDjZe
- 무티고을 Instagram: https://www.instagram.com/muti9oeul

---

## ✨ 주요 기능

### 👤 프로필 기반 사용

- 앱 진입 시 사용할 프로필 선택
- 선택한 프로필은 `localStorage`에 저장
- `member_id` 기반으로 내가 추가한 곡, 내가 평가한 곡, 아직 평가하지 않은 곡을 구분
- 기존 이름 기반 데이터도 fallback으로 호환

### 🎵 노래 추가

- Apple Music 플레이리스트에서 곡 정보 동기화
- 수동 곡 추가 지원
- 앨범 커버 URL 저장
- 곡 추가 시 추천 이유와 별점 입력
- 곡 추가와 동시에 추가자의 `승격` 평가 자동 생성

### ⭐ 평가 시스템

- 평가 선택: `승격` / `보류` / `방출`
- 별점: 0.0 ~ 5.0점, 0.5점 단위
- 평가 이유 입력
- 같은 사용자가 같은 곡을 다시 평가하면 기존 평가 수정
- 실제 변경이 없는 저장은 중복 처리하지 않음

### 📋 플레이리스트 화면

- 오노추 플레이리스트와 무티고을 플레이리스트 분리
- 곡별 `승격` / `보류` / `방출` 개수 표시
- 노래 카드 클릭 시 상세 팝업 표시
- 상세 팝업에서 평가 목록 확인 및 평가 작성/수정
- 무티고을 플레이리스트는 기본 접힘 상태로 관리
- 모바일 중심 카드형 레이아웃 지원

### 📲 PWA & Push 알림

- 홈 화면에 앱처럼 설치 가능
- Service Worker 기반 Web Push 알림
- 프로필별 알림 구독/해제
- 테스트 알림 전송
- 알림 실패/만료 구독 비활성화 처리

### 🔄 자동 갱신

- Supabase Realtime으로 DB 변경 감지
- 친구가 곡을 추가하거나 평가를 남기면 현재 화면 자동 갱신
- `version.json` 기반 앱 버전 확인
- 앱 복귀 시 새 버전이 있으면 자동 새로고침

---

## 🧠 판정 기준

| 상태 | 조건 |
|---|---|
| 평가 중 | 아직 7일이 지나지 않았거나 판정 조건 미확정 |
| 승격 후보 | `승격 >= 방출 + 3` |
| 무티고을 이동 가능 | 등록 후 7일 경과 + 승격 조건 충족 |
| 방출 예정 | 등록 후 7일 경과 + 승격 조건 미충족 |

---

## 🔔 알림 케이스

| 알림 | 트리거 | 대상 | Title | Body |
|---|---|---|---|---|
| 오노추 미등록 리마인드 | 매일 KST 20:00 | 오늘 곡을 안 올린 멤버 | `오노추 올리쇼.` | `오늘 안 올렸제, 빨리 올리쇼.` |
| 평가 리마인드 | 매일 KST 21:00 | 하루 이상 지난 미평가 곡이 있는 멤버 | `평가할 곡이 남아있어요 🎧` | `{곡명} - {아티스트} 평가해 주세요.` / `{곡명} 외 N곡을 평가해 주세요.` |
| 새 평가 알림 | 누군가 내 곡에 새 평가 저장 | 곡 추가자 | `내가 올린 곡에 새 평가가 달렸어요 💬` | `{평가자}이 {곡명}에 {결정} 평가를 남겼어요.` |
| 평가 수정 알림 | 누군가 내 곡의 평가 수정 | 곡 추가자 | `내가 올린 곡의 평가가 수정됐어요 ✏️` | `{평가자}이 {곡명} 평가를 수정했어요.` |
| 테스트 알림 | 알림 설정에서 테스트 클릭 | 현재 프로필 | `알림 테스트` | `알림 설정이 잘 되었어요.` |

Vercel Cron 기준:

```json
{
  "crons": [
    {
      "path": "/api/send-add-song-reminders",
      "schedule": "0 11 * * *"
    },
    {
      "path": "/api/send-reminders",
      "schedule": "0 12 * * *"
    }
  ]
}
```

> Vercel Cron은 UTC 기준이므로 `0 11 * * *`는 KST 20:00, `0 12 * * *`는 KST 21:00입니다.

---

## 🛠 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend API | Vercel Serverless Functions, Node.js |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime `postgres_changes` |
| Push | Web Push, VAPID, Service Worker |
| Parser | axios, cheerio |
| Deploy | Vercel |
| PWA | Web App Manifest, Service Worker |

---

## 🗂 프로젝트 구조

```text
ohnochoo/
├─ api/
│  ├─ _push-utils.js                  # Web Push 공통 유틸
│  ├─ config.js                       # 클라이언트용 Supabase 설정 반환
│  ├─ fetch-playlist.js               # Apple Music 플레이리스트 파싱
│  ├─ remove-subscription.js          # 푸시 구독 비활성화
│  ├─ save-subscription.js            # 푸시 구독 저장
│  ├─ send-add-song-reminders.js      # 오노추 미등록 리마인드
│  ├─ send-reaction-notification.js   # 새 평가/수정 평가 알림
│  ├─ send-reminders.js               # 미평가 곡 리마인드
│  ├─ send-test-notification.js       # 테스트 알림
│  ├─ update-song-covers.js           # 앨범 커버 URL 동기화
│  └─ vapid-public-key.js             # VAPID public key 반환
├─ assets/
│  └─ icons/                          # PWA / favicon / 알림 아이콘
├─ supabase/
│  └─ schema.sql                      # DB 테이블, RLS, 정책
├─ app.js                             # 클라이언트 상태/렌더링/Realtime 로직
├─ index.html                         # 메인 UI
├─ manifest.json                      # PWA 설정
├─ service-worker.js                  # PWA + Push 알림 처리
├─ styles.css                         # 반응형 스타일
├─ vercel.json                        # Cron 설정
├─ version.json                       # 자동 업데이트 감지용 버전 파일
├─ .env.example
└─ README.md
```

---

## 🧩 데이터베이스

`supabase/schema.sql`에서 사용하는 주요 테이블입니다.

| 테이블 | 역할 |
|---|---|
| `songs` | 오노추/무티고을 곡 정보 |
| `members` | 사용자 프로필 |
| `votes` | 곡별 평가, 별점, 이유 |
| `mutigoeul_songs` | 무티고을로 이동된 곡 |
| `push_subscriptions` | 멤버별 Web Push 구독 정보 |
| `notification_logs` | 알림 중복 방지 및 발송 상태 기록 |

### member_id 전환 구조

기존 데이터 호환을 위해 이름 기반 컬럼도 유지합니다.

- `songs.adder` + `songs.adder_member_id`
- `votes.voter` + `votes.member_id`

앱에서는 `member_id`를 우선 사용하고, 값이 없으면 기존 이름 기반 데이터로 fallback합니다.

---

## ⚙️ 환경 변수

`.env.local` 또는 Vercel Environment Variables에 아래 값을 설정합니다.

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
VAPID_PUBLIC_KEY=your-web-push-public-key
VAPID_PRIVATE_KEY=your-web-push-private-key
VAPID_SUBJECT=mailto:you@example.com
```

### 보안 주의

- `SUPABASE_ANON_KEY`는 클라이언트에서 사용할 수 있습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 API에서만 사용해야 합니다.
- `VAPID_PRIVATE_KEY`도 서버/Vercel 환경변수에만 보관해야 합니다.
- `.env.local`은 Git에 커밋하지 않습니다.

---

## 🧱 Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Project Settings → API에서 아래 값 확인
   - Project URL
   - anon public key
   - service role key
4. Web Push용 VAPID key 생성 후 Vercel 환경변수에 등록

### Realtime 설정

실시간 화면 갱신을 사용하려면 Supabase Realtime publication에 아래 테이블을 추가해야 합니다.

- `public.songs`
- `public.votes`
- `public.mutigoeul_songs`
- `public.members`

SQL로 추가하는 경우:

```sql
alter publication supabase_realtime add table public.songs;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.mutigoeul_songs;
alter publication supabase_realtime add table public.members;
```

또는 Supabase Dashboard에서 `Database → Publications → supabase_realtime`에 들어가 위 테이블을 켜면 됩니다.

---

## 💻 로컬 실행

### 1. 저장소 클론

```bash
git clone https://github.com/shinjuyeop/ohnochoo.git
cd ohnochoo
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 파일 생성

```bash
cp .env.example .env.local
```

Windows PowerShell에서는:

```powershell
copy .env.example .env.local
```

### 4. `.env.local` 값 입력

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...
```

### 5. 개발 서버 실행

```bash
npx vercel dev
```

브라우저에서 접속:

```text
http://localhost:3000
```

> **💡 로컬 환경 Push 알림 테스트 팁**
> - Web Push 알림 및 Service Worker 동작은 일반적으로 HTTPS 환경이나 `localhost`에서만 작동합니다.
> - 로컬 개발 중 모바일 기기 등 외부 디바이스에서 접속하여 알림을 테스트하려면 `ngrok` 등의 포트 포워딩 도구를 활용해 임시 HTTPS 주소로 연결해야 합니다.


---

## 🚀 배포

1. GitHub 저장소를 Vercel에 Import
2. Vercel Environment Variables 등록
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
3. Deploy
4. Cron 동작 확인
5. PWA 설치 및 테스트 알림 확인

---

## 📡 API

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/config` | 클라이언트에 Supabase URL / anon key 반환 |
| `GET` | `/api/fetch-playlist?url=...` | Apple Music 플레이리스트 파싱 |
| `POST` | `/api/update-song-covers` | Apple Music 커버 URL 저장 |
| `GET` | `/api/vapid-public-key` | Web Push public key 반환 |
| `POST` | `/api/save-subscription` | 현재 프로필의 푸시 구독 저장 |
| `POST` | `/api/remove-subscription` | 푸시 구독 비활성화 |
| `POST` | `/api/send-test-notification` | 테스트 알림 전송 |
| `GET/POST` | `/api/send-add-song-reminders` | 오늘 오노추 미등록 멤버에게 리마인드 |
| `GET/POST` | `/api/send-reminders` | 미평가 곡 리마인드 |
| `POST` | `/api/send-reaction-notification` | 새 평가/수정 평가 알림 |

---

## 🔄 업데이트 정책

앱은 `version.json`의 값을 기준으로 새 버전을 감지합니다.

배포하기 전 아래 명령어를 실행하면 한국 시간(KST) 기준의 타임스탬프로 `version.json` 버전명이 자동 갱신됩니다.

```bash
npm run update-version
```

갱신 후 생성되는 `version.json` 예시:

```json
{
  "version": "2026-07-07-112939"
}
```

배포 시 버전을 변경하면, 사용자가 앱에 다시 들어오거나 화면으로 복귀했을 때 새 버전을 감지하고 자동으로 새로고침됩니다.


> 자동 업데이트 기능이 들어가기 전 버전을 이미 켜둔 사용자는 한 번 직접 새로고침하거나 앱을 완전히 종료 후 다시 열어야 합니다.

---

## 🧪 테스트 체크리스트

- [ ] 프로필 선택/변경
- [ ] Apple Music 동기화
- [ ] 수동 노래 추가
- [ ] 노래 추가 시 자동 승격 평가 생성
- [ ] 평가 저장/수정
- [ ] 노래 상세 팝업 열기/닫기
- [ ] 무티고을 접기/펼치기
- [ ] 무티고을 이동
- [ ] 알림 켜기/끄기
- [ ] 테스트 알림 수신
- [ ] Realtime 자동 갱신
- [ ] 앱 버전 업데이트 감지

---

## 🛡 운영 메모

- 현재 관리자성 동작(평가자 추가, 노래 삭제, 무티고을 이동)은 클라이언트에서 비밀번호를 확인하는 간단한 방식입니다.
- 친구들끼리 쓰는 소규모 앱 기준으로는 충분하지만, 공개 서비스로 확장하려면 서버 인증 또는 Supabase Auth + RLS 강화가 필요합니다.
- 알림 발송에는 service role key가 필요하므로 서버 API 외부로 노출되면 안 됩니다.
- **Supabase RLS 주의**: `push_subscriptions` 및 `notification_logs` 테이블은 보안상 클라이언트(`anon`)에서 직접 접근이 불가능하며(`using (false)`), `service_role` 키를 사용하는 백엔드 API를 통해서만 CRUD가 가능하도록 설계되어 있습니다.
- 홈 화면 앱 아이콘은 브라우저/OS 캐시 때문에 늦게 바뀔 수 있습니다. 아이콘을 바꿀 때는 파일명을 변경하고 `manifest.json`도 함께 수정하는 것을 권장합니다.

---

## 🧯 트러블슈팅

### Supabase 연결 실패

- Vercel 환경변수 확인
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- `/api/config` 응답 확인
- 배포 보호 설정으로 API 접근이 막히지 않았는지 확인

### Apple Music 동기화 실패

- 플레이리스트 URL 확인
- Apple Music 페이지 구조 변경 가능성 확인
- 잠시 후 재시도

### 알림이 오지 않음

- 앱에서 알림 권한이 허용되어 있는지 확인
- 브라우저/OS 알림 설정 확인
- Vercel 환경변수 확인
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `push_subscriptions`에 현재 멤버의 active 구독이 있는지 확인
- `notification_logs`의 dedupe key로 이미 발송 처리되었는지 확인

### 실시간 갱신이 안 됨

- Supabase Realtime publication에 `songs`, `votes`, `mutigoeul_songs`, `members` 테이블이 추가되어 있는지 확인
- 브라우저 콘솔에서 Realtime 연결 오류 확인
- 앱을 한 번 새로고침 후 재시도

### 새 버전이 바로 안 보임

- `version.json`의 `version` 값을 변경했는지 확인
- iOS/Android PWA는 앱을 완전히 종료 후 다시 실행
- 필요 시 브라우저 강력 새로고침

---

## 🗺 앞으로 개선하면 좋은 점

- 알림 종류별 on/off 설정
- 노래 추가 + 자동 평가 저장을 서버 API 또는 DB 함수로 transaction 처리
- 관리자 기능 서버 인증화
- 테스트 코드 추가
- 더 세밀한 변경 알림 UI
- Apple Music API 기반 정식 연동 검토

---

## License

ISC
