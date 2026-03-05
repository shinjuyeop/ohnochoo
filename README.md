# ohnochoo

친구들과 플레이리스트 후보곡을 추가하고, 각 곡에 대해 **방출 / 승격** 투표와 이유를 남길 수 있는 웹사이트입니다.

## 기능

- 노래 추가: `노래`, `아티스트`, `추가자`
- 평가자 관리: 평가자 이름 목록 추가
- 투표 등록:
  - 현재 플레이리스트의 노래 선택
  - 평가자 선택
  - 방출 / 승격 선택
  - 이유 작성
- 투표 기록 확인
- Supabase DB 저장 (공유 가능)

## 로컬 실행

- `index.html` 파일을 브라우저에서 열면 바로 사용 가능합니다.

## Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. Project Settings > API에서 아래 값을 확인합니다.
- `Project URL`
- `anon public key`

## Vercel 배포

1. Vercel에 Git 저장소를 연결해 프로젝트를 생성합니다.
2. Vercel 프로젝트 환경변수에 아래를 추가합니다.
- `SUPABASE_URL` = Supabase Project URL
- `SUPABASE_ANON_KEY` = Supabase anon public key
3. 배포를 실행합니다.

## 동작 방식

- 프론트엔드는 `/api/config`를 호출해 Vercel 환경변수에서 Supabase 설정을 받아옵니다.
- 노래/평가자/투표 데이터는 Supabase 테이블 `songs`, `members`, `votes`에 저장됩니다.
