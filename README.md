# ohnochoo

친구들과 플레이리스트 후보곡을 모으고, 각 곡을 **승격 / 방출**로 투표하는 웹 앱입니다.

## 주요 기능

- 노래 추가
  - 입력값: `노래`, `아티스트`
  - `추가자`는 자유 입력이 아니라 **평가자 목록에서 선택**
- 평가자 관리
  - 평가자 이름 추가
  - 추가된 평가자는 노래 추가/투표 등록 선택 목록에 자동 반영
- 투표 등록
  - 현재 플레이리스트 곡 선택
  - 평가자 선택
  - `승격 / 방출` 텍스트 토글 버튼 선택
  - 이유 작성
- 현재 플레이리스트
  - 곡별 `승격/방출` 현황 표시
  - `투표 보기` 버튼으로 해당 곡의 투표 기록 토글
- 반응형 UI
  - 모바일에서 카드형 레이아웃으로 보기 편하게 전환

## 기술 스택

- Frontend: HTML, CSS, Vanilla JavaScript
- Database: Supabase (PostgreSQL)
- Deployment: Vercel

## 프로젝트 구조

```text
ohnochoo/
  api/
    config.js
  supabase/
    schema.sql
  index.html
  app.js
  styles.css
  .env.example
```

## 환경 변수

로컬(`.env.local`) 또는 Vercel Environment Variables에 아래 값을 설정합니다.

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```

## Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. `Project Settings > API`에서 아래 값 확인
   - `Project URL`
   - `anon public key`

## 로컬 실행

1. 프로젝트 루트에 `.env.local` 생성 후 환경 변수 입력
2. Vercel 개발 서버 실행

```powershell
vercel dev
```

3. 브라우저에서 `http://localhost:3000` 접속

## 배포 (Vercel)

1. GitHub 저장소를 Vercel에 Import
2. Environment Variables에 아래 등록
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Deploy

## 동작 방식

- 클라이언트는 `/api/config`에서 환경 변수 기반 Supabase 설정을 받아옵니다.
- 데이터는 Supabase 테이블 `songs`, `members`, `votes`에 저장됩니다.

## 트러블슈팅

- `Supabase 연결을 준비 중입니다...`에서 멈춤
  - 브라우저 캐시 제거 후 새로고침 (`Ctrl+F5`)
  - Vercel의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 확인
  - Vercel Authentication/Deployment Protection이 API 호출을 막고 있지 않은지 확인
- Vercel에서 env key 에러
  - Key 칸에는 URL이 아니라 변수명(`SUPABASE_URL`)을 입력해야 합니다.
