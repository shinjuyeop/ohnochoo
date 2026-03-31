# ohnochoo

친구들과 곡 후보를 모으고 평가를 남기는 플레이리스트 웹 앱입니다.

오노추 플레이리스트에서 곡을 관리하고, 조건을 만족한 곡은 무티고을 플레이리스트로 이동할 수 있습니다.

## 주요 기능

- Apple Music 플레이리스트 불러오기
  - 오노추/무티고을 Apple Music 링크를 서버 API로 파싱
  - 오노추 곡 목록을 중복 제외 후 선택 가능
  - 앨범 커버 URL 동기화
- 수동 노래 추가
  - 곡명, 아티스트, 추가자(평가자 목록에서 선택) 입력
- 평가자 관리
  - 평가자 추가
  - 추가된 평가자는 곡 추가/평가 드롭다운에 자동 반영
- 평가 등록
  - `승격` / `방출` / `보류`
  - 별점 0.0~5.0 (0.5 단위)
  - 이유 텍스트
  - 같은 곡에 같은 평가자가 다시 저장하면 기존 평가를 교체
- 플레이리스트/평가 현황
  - 오노추/무티고을 목록 분리
  - 곡별 승격/방출/보류 개수 표시
  - 평가 내역 펼치기/숨기기
  - 모바일 전용 접기/펼치기 레이아웃
- 자동 상태 규칙
  - 승격 대상: `승격 >= 방출 + 3`
  - 방출 대상: 위 승격 조건 미충족 + 곡 등록 후 7일 경과
  - 무티고을 이동 가능: 곡 등록 후 7일 경과 + 승격 조건 충족
- 곡 삭제 / 무티고을 이동
  - 관리자 비밀번호 확인 후 실행

## 기술 스택

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend(API): Vercel Serverless Functions (Node.js)
- DB/Auth: Supabase (PostgreSQL + anon key)
- Parser: axios, cheerio

## 프로젝트 구조

```text
ohnochoo/
  api/
    config.js           # Supabase 환경변수 노출 API
    fetch-playlist.js   # Apple Music 페이지 파싱 API
  supabase/
    schema.sql          # DB 테이블/RLS/정책
  index.html            # 메인 UI
  app.js                # 클라이언트 로직
  styles.css            # 스타일
  .env.example
  .env.local
```

## 환경 변수

`.env.local`(로컬) 또는 Vercel Environment Variables에 아래 값을 설정합니다.

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```

## Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql`을 실행합니다.
3. `Project Settings > API`에서 아래 값을 확인해 환경 변수에 입력합니다.
   - Project URL
   - anon public key

`schema.sql`에서 생성/사용하는 주요 테이블:

- `songs`
- `members`
- `votes` (decision: 승격/방출/보류, rating: 0~5, 0.5 단위)
- `mutigoeul_songs`

## 로컬 실행

1. 의존성 설치

```powershell
npm install
```

2. `.env.local` 설정

```powershell
copy .env.example .env.local
```

3. `.env.local`에 환경 변수 입력

4. Vercel 개발 서버 실행

```powershell
npx vercel dev
```

5. 브라우저에서 `http://localhost:3000` 접속

## 배포 (Vercel)

1. GitHub 저장소를 Vercel에 Import
2. Environment Variables 등록
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Deploy

## API

- `GET /api/config`
  - Supabase URL / anon key를 반환
- `GET /api/fetch-playlist?url=<apple_music_playlist_url>`
  - Apple Music 페이지를 파싱해서 곡 목록(`title`, `artist`, `coverImageUrl`) 반환

## 운영 메모

- 현재 관리자 비밀번호(`평가자 추가`, `노래 삭제`, `무티고을 이동`)는 클라이언트 코드에 고정 문자열로 들어 있습니다.
- 실제 운영 시에는 서버 측 인증(예: Supabase Auth + RLS 강화)으로 교체하는 것을 권장합니다.

## 트러블슈팅

- `Supabase 연결을 준비 중입니다...`에서 멈춤
  - `.env.local` 또는 Vercel 환경 변수의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 확인
  - 브라우저 강력 새로고침(`Ctrl+F5`)
  - 배포 보호 설정(Deployment Protection 등)으로 API 접근이 막히지 않았는지 확인
- Apple Music 불러오기 실패
  - 플레이리스트 URL 유효성 확인
  - 일시적인 파싱 실패 가능성 있으므로 재시도
- Vercel 환경 변수 등록 오류
  - Key에는 값(URL)이 아니라 변수명(`SUPABASE_URL`)을 넣어야 함
