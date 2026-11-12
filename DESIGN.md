---
name: ohnochoo Apple Music Editorial System
description: Monochrome-first Apple Music Web & iOS 26 Liquid Glass design system for the ohnochoo music club app
colors:
  primary: "#262626"
  secondary: "#007AFF"
  accent: "#927023"
  background: "#FAFAFA"
  surface: "#FFFFFF"
  text: "#202020"
  muted: "#656565"
  border: "#DEDEDE"
  error: "#A34444"
  success: "#316148"
  warning: "#806019"
typography:
  headingFont: "-apple-system, BlinkMacSystemFont, \"Pretendard Variable\", \"Apple SD Gothic Neo\", sans-serif"
  bodyFont: "-apple-system, BlinkMacSystemFont, \"Pretendard Variable\", \"Apple SD Gothic Neo\", sans-serif"
  monoFont: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace"
  baseSize: "14px"
  scaleRatio: 1.25
rounded: "md"
spacing: "normal"
components:
  button:
    rounded: "md"
    style: "solid"
  card:
    rounded: "lg"
    shadow: "none"
    border: true
  input:
    rounded: "md"
    border: "subtle"
  nav:
    style: "sidebar-and-floating-glass-pill"
    backdrop: "blur"
---

## Overview

`ohnochoo`(한글 표기: `오노추`)는 소규모 친구 모임이 오늘의 노래(`오노추`), 최종 아카이브 플레이리스트(`무티고을`), 함께 듣는 명반 컬렉션(`앨범스`), 그리고 14일 평가 후 탈락한 곡의 기록(`방출`)을 함께 운영하는 음악 큐레이션·평가·아카이빙 웹 애플리케이션이다.

이 디자인 시스템의 유일한 북극성은 **최신 Apple Music(데스크톱 웹 `https://music.apple.com` 및 모바일 Apple Music iOS 26 앱, Apple Human Interface Guidelines)**의 시각 언어와 조작 경험을 최대한 충실하게 구현하는 것이다. 독자적인 실험적 스타일, 일반적인 SaaS 대시보드, 또는 AI가 흔히 생성하는 장식적 카드 UI를 배제하고, 앨범 아트워크가 화면의 주인공이 되도록 극도로 절제된 무채색(흑·백·회색) 캔버스를 유지한다.

동시에 `ohnochoo`만의 고유 기능(오노추·무티고을·앨범스·방출 컬렉션, 0.5점 단위 별점과 코멘트·답글, 14일 평가 유예와 `승격 ≥ 방출 + 3` 판정 규칙, 간편 프로필 전환 및 관리자 도구)은 이질적인 외부 위젯처럼 보이지 않고 **원래 Apple Music 안에 존재하는 네이티브 기능처럼 자연스럽게 통합**되어야 한다.

### 핵심 디자인 헌장 (Core Design Charter)

1. **흑백·회색 중심의 미니멀리즘과 아트워크 중심 구성**: 화면의 색채는 앨범 커버 아트워크에서만 나오도록 배경·표면·타이포그래피·기본 컨트롤을 무채색(`#FAFAFA`, `#FFFFFF`, `#F3F3F3`, `#202020`, `#656565`)으로 통일한다. 이전 분석에서 제안되었던 빨간색/핑크색(`#FA243C`) 강조 컬러는 사용하지 않는다.
2. **데스크톱 사이드바의 제한적 파란색 아이콘 규칙**: 첨부된 Apple Music 웹(`music.apple.com/kr/home`) 레퍼런스를 기준으로, 데스크톱 좌측 사이드바 아이콘에만 Apple 시스템 블루(`#007AFF` / 다크 모드 `#0A84FF`)를 적용한다. 사이드바 메뉴 텍스트는 검정 계열(`--text`)을 유지하고, 선택된 메뉴는 연한 회색 배경(`rgba(60, 60, 67, 0.08)` / `#E8E8ED`)으로 표현한다. 파란색을 일반 버튼이나 무관한 액션에 남발하지 않는다.
3. **플랫폼별 네이티브 문법 구분 (Web vs. iOS 26)**: 데스크톱(`> 780px`)은 Apple Music 웹의 고정 사이드바 + 다열 선반(Shelf) 및 트랙 테이블 문법을 따르고, 모바일(`≤ 780px`)은 Apple Music iOS 26의 Large Title + 하단 부유형 **Liquid Glass 캡슐 내비게이션**과 바텀 시트/리스트 문법을 따른다.
4. **기존 강점 보존 및 불필요한 기능 배제**: 현재 잘 작동하는 홈 캐러셀(`SongCarousel`), 아트워크 중심 비율, 모바일 Liquid Glass 하단 바(`.bottom-nav`), `tabular-nums` 수치 정렬, 라이트/다크 모드 토큰 구조는 그대로 유지한다. 연속 평가 기능 복원, 불필요한 평가 대시보드·배지 추가, 14일 카운트다운 중복 표시, 2×2 플레이리스트 히어로 헤더 추가 등 제품 본질과 무관한 UI 확장은 하지 않는다.

### 문서 구성 및 8대 범위 매핑

Codex와 Antigravity가 공통 기준으로 참조할 수 있도록, 본 문서는 표준 섹션 구조 안에 다음 8가지 범위를 모두 포함하며 각 항목마다 **① 현재 실제로 구현된 디자인**, **② Apple Music 레퍼런스와의 차이**, **③ 앞으로 적용할 권장 디자인 원칙**, **④ 아직 확정되지 않은 사항**을 명확히 구분해 기술한다.

| 번호 | 문서화 범위 | 수록 섹션 |
| :--- | :--- | :--- |
| **1** | 컬러 및 타이포그래피 | `## Colors`, `## Typography` |
| **2** | 레이아웃과 여백 | `## Layout` |
| **3** | 데스크톱 사이드바와 모바일 내비게이션 | `## Layout`, `## Components` (3.1 내비게이션) |
| **4** | 아트워크, 곡 리스트, 캐러셀 | `## Elevation & Depth`, `## Shapes`, `## Components` (4.1~4.3) |
| **5** | 버튼, Hover, 선택 및 포커스 상태 | `## Components` (5.1~5.3) |
| **6** | 모달, 바텀 시트, 상세 화면 (`SongDetailDialog`) | `## Components` (6.1~6.2) |
| **7** | 라이트/다크 모드와 반응형 규칙 | `## Colors` (7.1), `## Layout` (7.2) |
| **8** | `ohnochoo` 고유 기능의 디자인 원칙 | `## Components` (8.1~8.5) |

---

## Colors

### 1.1 컬러 시스템 (Color Palette & Tokens)

#### 현재 실제로 구현된 디자인 (`src/styles/globals.css`)

현재 앱은 `:root`(라이트 모드)와 `:root[data-theme="dark"]`(다크 모드)에 시맨틱 CSS 변수 세트를 정의해 사용하고 있으며, 순수 흑백·회색 기반 위에 오노추 판정(`승격`, `보류`, `방출`)과 별점(`--star`)에만 저채도 시맨틱 컬러를 부여하고 있다.

| 구분 | CSS 토큰 | 라이트 모드 (`:root`) | 다크 모드 (`[data-theme="dark"]`) | 현재 사용처 |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas (배경)** | `--canvas` | `#FAFAFA` | `#141414` | `body` 전체 배경 |
| **Surface (표면)** | `--surface` | `#FFFFFF` | `#1D1D1D` | 모달(`.dialog`), 카드, 설정 패널, 입력창 기본 표면 |
| **Raised (보조 표면)** | `--raised` | `#EEEEEE` | `#282828` | 아트워크 플레이스홀더, 인라인 수정 폼, 댓글/투표 서브 박스 |
| **Sidebar (사이드바)** | `--sidebar` | `#F3F3F3` | `#191919` | 데스크톱 좌측 고정 사이드바 배경 |
| **Navigation (상단바)** | `--navigation` | `#FAFAFAF2` | `#141414F2` | 모바일 상단 헤더(`.mobile-topbar`) 배경 |
| **Primary Text** | `--text` | `#202020` | `#EFEFEF` | 제목, 곡명, 본문 텍스트, 기본 아이콘 |
| **Muted Text** | `--muted` | `#656565` | `#ACACAC` | 아티스트명, 부제, 날짜, 카운트, 비활성 탭 |
| **Brand / Primary** | `--brand` | `#262626` | `#EDEDED` | 주요 솔리드 버튼 배경(`.primary-button`), 현재 활성 내비게이션 텍스트 |
| **On Brand** | `--on-brand` | `#FFFFFF` | `#1A1A1A` | `--brand` 솔리드 버튼 위 텍스트/아이콘 |
| **Brand Soft** | `--brand-soft` | `#00000008` | `#FFFFFF09` | 곡 리스트 행(`SongCard`) 및 내비게이션 항목 활성/Hover 배경 |
| **Accent Nav (블루)** | `--accent-nav` | `#007AFF` | `#0A84FF` | 데스크톱 사이드바 아이콘(`.nav-link svg`) 및 모바일 하단 활성 탭(`.bottom-link.active`) |
| **Control Fill** | `--control` | `#EDEDF0` | `#2A2A2E` | 세그먼트 컨트롤(`.segmented`), 보조 버튼, 칩 배경 |
| **Control Hover** | `--control-hover` | `#E3E3E7` | `#34343A` | 보조 컨트롤 Hover 배경 |
| **Hairline Border** | `--line` | `#DEDEDE` | `#2E2E2E` | 사이드바 경계선, 모달/카드 외곽선, 섹션 구분선 |
| **Soft Hairline** | `--line-soft` | `#E9E9E9` | `#252525` | 곡 리스트 행 간 구분선, 내부 테이블 구분선 |
| **Field Border** | `--field-border` | `#C8C8C8` | `#3D3D3D` | 검색창 및 입력 폼 기본 테두리 |
| **Promote (승격)** | `--promote` / `--promote-soft` | `#316148` / `#3161480C` | `#A3C9B0` / `#A3C9B014` | `승격` 투표 버튼 활성 상태, 승격 후보/이동 가능 배지 |
| **Hold (보류)** | `--hold` | `#656565` | `#ACACAC` | `보류` 투표 및 중립 상태 텍스트 |
| **Release (방출)** | `--release` / `--release-soft` | `#A34444` / `#A344440C` | `#E3AAAA` / `#E3AAAA14` | `방출` 투표 버튼 활성 상태, 방출 예정 배지, 오류/삭제 텍스트 |
| **Warning** | `--warning` | `#806019` | `#E2C278` | 판정 마감 임박/주의 안내 |
| **Star (별점 채움)** | `--star` | `#927023` | `#D8C389` | 채워진 별/반별 아이콘 및 평균 별점 텍스트 강조 |
| **Star Empty (빈 별)** | `--star-empty` | `#767676` | `#888888` | 미선택 별 아이콘 외곽선/채움 |
| **Glass Tint** | `--glass-tint` | `#F8F8FA99` | `#141419AD` | 모바일 하단 Liquid Glass 캡슐 배경 |
| **Glass Edge** | `--glass-edge` | `#FFFFFFB3` | `#FFFFFF29` | 모바일 하단 Liquid Glass 외곽 반사 테두리 |
| **Glass Selection** | `--glass-selection` | `#FFFFFF80` | `#00000038` | 모바일 하단 내비게이션 활성 탭 알약 배경 |

#### Apple Music 레퍼런스 반영 현황 및 차이

1. **데스크톱 사이드바 아이콘 및 모바일 활성 탭 컬러 (구현 완료)**: 첨부된 Apple Music 웹(`music.apple.com/kr/home`) 및 iOS 26(`보관함`) 레퍼런스에 맞춰, 데스크톱 사이드바의 모든 메뉴 아이콘(`.nav-link svg`)과 모바일 하단 Liquid Glass 내비게이션의 활성 탭 아이콘·라벨(`.bottom-link.active`)에 `--accent-nav`(`#007AFF` / 다크 `#0A84FF`)가 적용되어 있다. 데스크톱 사이드바의 메뉴 텍스트는 무채색(`--muted` / 활성 `--text`), 활성 메뉴 배경은 연한 회색(`--brand-soft`)을 유지한다.
2. **메인 캔버스 명도 차이**: Apple Music 웹 데스크톱과 iOS 앱 라이트 모드는 본문 배경이 순백색(`#FFFFFF`)이고 사이드바만 미색(`#F9F9F9`~`#F3F3F3`)인 반면, 현재 `ohnochoo`는 본문 배경(`--canvas`)이 `#FAFAFA`로 미세하게 회색기를 띤다.

#### 앞으로 적용할 권장 디자인 원칙

- **The Monochrome Canvas & Selective Blue Rule (무채색 기조 및 제한적 블루 사용 규칙)**:
  - 앱 전체의 흑백·회색 미니멀 기조(`--canvas`, `--surface`, `--text`, `--muted`, `--brand`)를 유지하며, **빨간색/핑크색 강조 컬러는 도입하지 않는다.**
  - 내비게이션 강조 토큰 `--accent-nav`(`#007AFF`, 다크 모드 `#0A84FF`)는 **데스크톱 사이드바 아이콘과 모바일 하단 내비게이션 활성 탭에만 제한적으로 사용**한다.
  - 파란색(`--accent-nav`)을 일반 주요 버튼(`.primary-button`), 세그먼트 컨트롤, 배지 등에 무분별하게 확장하지 않는다. 주요 CTA 버튼은 현재의 차콜/블랙 솔리드 스타일(`--brand: #262626`)을 유지한다.
- **시맨틱 판정 및 별점 컬러 유지**:
  - `ohnochoo` 고유 기능인 `승격`(`--promote`), `보류`(`--hold`), `방출`(`--release`)과 별점(`--star`)은 앨범 커버와 시각적으로 충돌하지 않도록 현재의 절제된 저채도 시맨틱 톤(딥 세이지 그린, 뮤트 테라코타 레드, 엔틱 골드)을 그대로 유지한다.

#### 아직 확정되지 않은 사항 (Undecided)

- **라이트 모드 `--canvas` 순백색(`#FFFFFF`) 전환 여부**: 데스크톱 Apple Music 웹처럼 본문 배경(`--canvas`)을 `#FFFFFF`로 두고 사이드바(`#F3F3F3`)와의 명도 대비를 더 또렷하게 할지, 현재의 차분한 `#FAFAFA`를 유지할지는 추후 미세 조정 항목으로 둔다.

---

### 7.1 라이트/다크 모드 컬러 적응 규칙 (Light & Dark Theme Parity)

#### 현재 실제로 구현된 디자인

- `ThemeContext`(`src/features/settings/ThemeContext.tsx`)가 `<html data-theme="light|dark">` 속성과 `<meta name="theme-color">`를 제어하며, 기본값은 시스템 설정(`prefers-color-scheme`)을 따른다.
- 다크 모드는 순수 블랙(`#000000`) 대신 눈의 피로를 줄이는 다크 그레이 계층(`--canvas: #141414` → `--sidebar: #191919` → `--surface: #1D1D1D` → `--raised: #282828`)으로 표면 깊이를 구분한다.
- 모바일 Liquid Glass 하단 바는 라이트 모드에서 반투명 화이트(`--glass-tint: #F8F8FA99`) + 밝은 림 하이라이트(`--glass-edge: #FFFFFFB3`)를, 다크 모드에서 반투명 다크 차콜(`--glass-tint: #141419AD`) + 미세한 화이트 림(`--glass-edge: #FFFFFF29`)을 사용한다.

#### Apple Music 레퍼런스와의 차이

- Apple Music 웹과 iOS 다크 모드는 앨범 아트워크의 외곽선이 어두운 배경에 묻히지 않도록 `inset 0 0 0 1px rgba(255, 255, 255, 0.1)`의 내부 테두리를 일관되게 적용한다. 현재 `ohnochoo`는 일부 썸네일에 외곽선이 없거나 바깥쪽 `border`를 사용한다.

#### 앞으로 적용할 권장 디자인 원칙

- 모든 컬러 스타일링은 하드코딩된 Hex/RGB 값 대신 `:root` 및 `:root[data-theme="dark"]`의 CSS 변수를 통해서만 참조한다.
- 데스크톱 사이드바 아이콘용 파란색 토큰(`--accent-nav`) 추가 시 라이트 모드는 `#007AFF`, 다크 모드는 명도를 높인 `#0A84FF`로 매핑해 어두운 사이드바(`#191919`) 위에서도 충분한 명도 대비를 확보한다.

#### 아직 확정되지 않은 사항 (Undecided)

- 다크 모드에서 곡 상세 화면(`SongDetailDialog`) 상단에 앨범 커버 색상을 추출한 은은한 앰비언트 배경 블러를 넣을지 여부는 확정되지 않았으며, 현재는 깔끔한 무채색 표면(`--surface: #1D1D1D`) 유지를 기본으로 한다.

---

## Typography

### 1.2 타이포그래피와 정보 계층 (Typography & Hierarchy)

#### 현재 실제로 구현된 디자인 (`src/styles/globals.css`)

- **폰트 패밀리**:
  - 본문 및 제목 통합 스택: `-apple-system, BlinkMacSystemFont, "Pretendard Variable", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif` (`public/assets/fonts/`에 `Pretendard Variable 1.3.9` woff2 로컬 번들 포함).
  - 숫자 정렬: `.home-stat-strip strong`, `.song-row-stats`, `.due-badge`, `.star-rating-value`, `.records-month-count` 등 모든 통계·별점·날짜·카운트다운 요소에 `font-variant-numeric: tabular-nums`가 적용되어 있다.
- **현재 타입 스케일**:

| 계층 (Role) | 선택자 / 요소 | 글자 크기 (`font-size`) | 굵기 (`font-weight`) | 행간 / 자간 | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title (Desktop/Mobile)** | `.page-heading h1` | `clamp(26px, 3vw, 32px)` | `700` | `line-height: 1.12`, `letter-spacing: -0.025em` | 페이지 최상단 대제목 (`홈`, `오노추`, `무티고을`, `앨범스`, `방출`, `내 정보`) |
| **Mobile Topbar Title** | `.mobile-topbar-title strong` | `20px` | `700` | `letter-spacing: -0.02em` | 모바일 상단 고정 헤더 타이틀 |
| **Detail Song Title** | `.detail-copy h3` | `clamp(20px, 2.6vw, 24px)` | `700` | `line-height: 1.2`, `letter-spacing: -0.02em` | 곡 상세 화면의 곡 제목 |
| **Section Heading** | `.section-heading h2`, `.detail-section h4`, `.dialog-header h2` | `17px` ~ `18px` | `700` | `line-height: 1.25`, `letter-spacing: -0.015em` | 홈 캐러셀 섹션 헤더, 모달 헤더, 상세 하위 섹션 |
| **Track / Card Title** | `.song-title`, `.carousel-card-title` | `14px` ~ `15px` | `600` | `line-height: 1.3`, 1줄 말줄임(`ellipsis`) | 곡 목록 및 캐러셀의 곡/앨범 제목 |
| **Body / Artist / Nav** | `body`, `.song-artist`, `.nav-link`, `.vote-reason` | `13px` ~ `14px` | `400` ~ `500` | `line-height: 1.45` | 기본 본문, 아티스트명(`--muted`), 사이드바 메뉴 |
| **Meta / Caption / Badge** | `.song-subline`, `.status-badge`, `.due-badge`, `.bottom-nav-link span` | `11px` ~ `12px` | `500` ~ `600` | `line-height: 1.2`, `tabular-nums` | 추천자, 날짜, 판정 배지, 모바일 하단 탭 라벨 |

#### Apple Music 레퍼런스와의 차이

1. **페이지 대제목(`h1`)과 상단 구분선**: 데스크톱 Apple Music 웹(`music.apple.com/kr/home`)에서는 상단 `홈`(`32px~34px`, `700`) 아래에 얇은 전체 폭 구분선(`1px solid var(--line-soft)`)이 놓여 대제목과 첫 번째 섹션(`인기 추천곡`)을 명확히 분리한다. 모바일 iOS 26(`보관함`)에서는 별도 상단 고정 바 타이틀 없이 본문 최상단에 `34px` Bold Large Title(`보관함`)이 한 번만 등장한다.
2. **모바일 타이틀 중복 표시**: 현재 `ohnochoo` 모바일 화면에서는 `.mobile-topbar`에 페이지 제목(`홈`, `오노추` 등 `20px`)이 표시되고, 바로 아래 `.page-heading h1`에 동일한 제목(`26px`)이 한 번 더 표시되어 상단 수직 공간을 중복 점유한다.
3. **곡 상세 화면의 제목 중복**: `SongDetailDialog`에서도 상단 `.dialog-header`에 곡 제목·아티스트가 나오고 바로 아래 `.detail-hero`에 동일한 곡 제목·아티스트가 반복된다.
4. **섹션 헤더 링크 표현**: Apple Music 웹에서는 클릭 가능한 캐러셀 섹션 제목 옆에 회색 셰브론(`최근 재생한 음악 >`)을 붙여 섹션 제목 자체를 이동 링크로 삼는 반면, 현재 `ohnochoo`는 우측 끝에 별도의 `더보기` 텍스트 버튼을 배치한다.

#### 앞으로 적용할 권장 디자인 원칙

- **시스템 산세리프 + Pretendard Variable 단일 서체 원칙**: 장식용 세리프나 외부 디스플레이 폰트를 추가하지 않고, Apple 시스템 산세리프(`SF Pro Display` / `SF Pro Text`)와 `Pretendard Variable`의 굵기(`400`, `500`, `600`, `700`)와 자간(`-0.025em` ~ `0`)만으로 위계를 설계한다.
- **수치 데이터의 고정폭 정렬 필수화**: 별점(`4.5`), 득표수(`승격 4 · 방출 0`), 남은 일수(`D-12`), 트랙 수(`14곡`) 등 모든 숫자에는 반드시 `font-variant-numeric: tabular-nums`를 적용한다.
- **중복 타이포그래피 제거 원칙**: 한 화면(또는 한 모달 뷰포트) 안에서 동일한 페이지명이나 곡 제목이 위아래로 연달아 두 번 출력되지 않도록 단일 타이틀 계층으로 정리한다.

#### 아직 확정되지 않은 사항 (Undecided)

- 홈 화면 각 캐러셀 섹션 헤더(`오노추`, `무티고을`, `앨범스`)의 우측 `더보기` 버튼을 현재처럼 유지할지, 혹은 Apple Music 웹 레퍼런스처럼 섹션 제목 옆 인라인 셰브론(`오노추 ›`) 형태로 통합할지는 선택적 개선 사항으로 남겨둔다.

---

## Layout

### 2.1 전체 레이아웃과 여백 (Layout Grid & Spacing)

#### 현재 실제로 구현된 디자인

- **데스크톱 앱 셸 (`.app-shell`, `> 780px`)**:
  - 좌측 고정 사이드바(`.sidebar`, 너비 `210px`, `1120px` 이상에서 `224px`)와 우측 본문 영역(`.page-container`, `padding-left: 210px`/`224px`, `max-width: 1280px`)의 2단 구조로 구성된다.
  - 본문 패딩은 상단 `28px`, 좌우 `clamp(18px, 3vw, 36px)`, 하단 `56px`이다.
- **모바일 앱 셸 (`≤ 780px`)**:
  - 상단 고정 바(`.mobile-topbar`, 높이 `72px`) + 본문(`.page-container`, 좌우 패딩 `16px`, 하단 패딩 `calc(104px + env(safe-area-inset-bottom))`) + 하단 부유형 Liquid Glass 내비게이션(`.bottom-nav`)으로 구성된다.
- **페이지 내부 수직 리듬**:
  - `.page-stack`은 섹션 간 간격으로 `gap: 24px`(모바일 `20px`)를 사용하며, 컨트롤 툴바(`.toolbar`, `.filter-bar`)는 `gap: 8px~10px`의 조밀한 간격을 유지한다.

#### Apple Music 레퍼런스와의 차이

- **데스크톱 상단 여백 및 구분선**: Apple Music 웹 레퍼런스는 좌측 사이드바와 본문 사이에 `1px` 수직 구분선(`--line`)을 두고, 본문 최상단 `홈` 타이틀 아래에 얇은 수평 구분선을 두어 에디토리얼 그리드의 시작점을 명확히 잡아준다.
- **모바일 상단 헤더 밀도**: Apple Music iOS 26 레퍼런스(`보관함`)는 상단에 고정된 불투명 바를 두는 대신, 좌측에 Large Title(`보관함`)을 두고 우측 상단에 반투명 Liquid Glass 캡슐(액션 아이콘 묶음)과 원형 프로필 아바타를 같은 행에 배치해 첫 화면에서 바로 콘텐츠 리스트가 시작되게 한다. 현재 `ohnochoo`는 `.mobile-topbar`(`72px`)와 `.page-heading`이 분리되어 있어 첫 화면의 콘텐츠 시작 위치가 다소 낮다.

#### 앞으로 적용할 권장 디자인 원칙

- **데스크톱 2단 구조(`210px/224px` 사이드바 + 유동 본문) 유지**: 현재의 안정적인 사이드바 폭과 본문 패딩(`clamp(18px, 3vw, 36px)`)을 유지하되, 불필요한 외곽 카드 박스를 중첩하지 않고 구분선(`1px solid var(--line-soft)`)과 여백만으로 섹션을 나눈다.
- **모바일 Safe Area 및 터치 여백 보장**: 하단 Liquid Glass 내비게이션과 본문 마지막 항목이 겹치지 않도록 `calc(104px + env(safe-area-inset-bottom))` 이상의 하단 여백을 항상 유지한다.

#### 아직 확정되지 않은 사항 (Undecided)

- 모바일 상단 `.mobile-topbar`와 본문 `.page-heading h1`을 iOS 26 레퍼런스처럼 단일 Large Title 헤더 행(좌측 큰 제목 + 우측 프로필/액션 캡슐)으로 합칠지, 아니면 현재의 고정 상단 바 구조를 유지할지는 추후 레이아웃 개선 범위 결정 시 확정한다.

---

### 7.2 반응형 브레이크포인트 규칙 (Responsive Breakpoints)

#### 현재 실제로 구현된 디자인

| 브레이크포인트 | 미디어 쿼리 | 주요 레이아웃 변화 |
| :--- | :--- | :--- |
| **Wide Desktop** | `min-width: 1121px` | 사이드바 `224px`, 여유 있는 본문 패딩, 데스크톱 3열 트랙 행(`.song-row`) |
| **Standard Desktop / Tablet Landscape** | `781px ~ 1120px` | 사이드바 `210px`, 캐러셀 화살표 버튼 표시, 모달 중앙 정렬(`max-width: 560px~640px`) |
| **Mobile / Tablet Portrait** | `max-width: 780px` | `.sidebar` 숨김, `.mobile-topbar` 및 하단 `.bottom-nav`(Liquid Glass) 활성화, 트랙 행 우측 통계 열이 하단 서브라인으로 접힘, 모달이 하단 바텀 시트로 전환 |
| **Compact Mobile** | `max-width: 480px` | 캐러셀 카드 폭 축소(`148px`), 세그먼트 컨트롤 및 필터 칩 가로 스크롤 허용, 패딩 `14px~16px`으로 축소 |

#### Apple Music 레퍼런스와의 차이 및 권장 원칙

- `780px` 단일 전환점을 기준으로 **데스크톱 웹 문법(사이드바 + 테이블/캐러셀)**과 **모바일 iOS 문법(하단 Liquid Glass 바 + 터치 리스트/바텀 시트)**을 분리하는 현재 구조가 Apple Music의 플랫폼별 특성과 잘 부합하므로 그대로 유지한다.
- 모든 주요 화면은 `320px`(소형 모바일), `375px`(표준 모바일), `768px`(태블릿), `1024px`, `1440px`(데스크톱)에서 가로 스크롤 깨짐(`overflow-x`)이 없어야 한다.

---

## Elevation & Depth

### 반투명 효과, 유리 질감, 아트워크 깊이 (Translucency & Hairlines)

#### 현재 실제로 구현된 디자인

- **모바일 Liquid Glass 하단 내비게이션 (`.bottom-nav`)**:
  - `background: linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.04)), var(--glass-tint)`
  - `backdrop-filter: blur(16px) saturate(1.3)` (`-webkit-backdrop-filter` 병기)
  - `border: 1px solid var(--glass-edge)` 및 내부 상단 하이라이트(`inset 0 1px 0 var(--glass-highlight)`)와 외부 그림자(`0 8px 26px var(--glass-shadow)`)를 결합해 iOS 26의 부유형 유리 캡슐 질감을 구현하고 있다.
- **표면 계층과 그림자 절제**:
  - 일반 카드나 곡 행에는 그림자(`box-shadow`)를 쓰지 않고 `1px` 헤어라인(`--line-soft`)과 배경 톤 차이(`--surface` vs `--raised`)로만 구분한다.
  - 모달/바텀 시트(`.dialog`)에만 `0 20px 60px rgba(0, 0, 0, 0.18)`의 깊이 그림자와 백드롭 블러(`backdrop-filter: blur(4px)`)를 사용한다.

#### Apple Music 레퍼런스와의 차이

1. **앨범 아트워크 내부 테두리 (`1px` Inner Ring)**: Apple Music(웹 및 iOS)에서는 흰색이나 검은색 배경을 가진 앨범 커버가 페이지 배경(`#FFFFFF` / `#141414`)에 녹아 경계가 사라지는 것을 막기 위해 모든 아트워크에 `box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08)`(다크 모드 `rgba(255, 255, 255, 0.1)`)를 적용한다. 현재 `ohnochoo`의 `.song-cover` 및 `.carousel-cover`는 바깥쪽 `border: 1px solid var(--line-soft)`를 쓰거나 일부 뷰에서 경계 처리가 약하다.

#### 앞으로 적용할 권장 디자인 원칙

- **모바일 Liquid Glass 보존**: 현재 구현된 `.bottom-nav`의 Liquid Glass 레이어링(`blur(16px) saturate(1.3)`, `--glass-tint`, `--glass-edge`, `--glass-selection`)은 iOS 26 레퍼런스와 높은 일관성을 보이므로 그대로 유지한다.
- **아트워크 `1px` 내부 링 표준화**: 모든 앨범/곡 커버 이미지 컨테이너(`.song-cover`, `.carousel-cover`, `.detail-cover`)에 `box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.14)`(또는 `1px solid var(--line-soft)`)를 일관되게 적용해 밝은 커버도 배경과 선명히 분리되게 한다.
- **장식적 카드 그림자 금지**: 콘텐츠 목록이나 통계 영역에 SaaS 대시보드풍의 드롭 섀도우 카드를 추가하지 않는다.

---

## Shapes

### 모서리 곡률 체계 (Corner Radius Scale)

#### 현재 실제로 구현된 디자인 및 권장 표준

Apple Music의 동심원 곡률(Concentric Corner Radius) 비율에 맞춰 요소의 크기에 비례하는 모서리 반경을 사용한다.

| 스케일 | 반경 값 (`border-radius`) | 적용 대상 |
| :--- | :--- | :--- |
| **Artwork Small (리스트 썸네일)** | `6px` ~ `8px` | 곡 목록 행 썸네일(`.song-cover`, `44px~48px`) |
| **Artwork Medium/Large (캐러셀·상세)** | `8px` ~ `12px` | 홈 캐러셀 커버(`164px`), 곡 상세 커버(`96px~112px`), 사이드바/리스트 행 Hover 배경(`8px`) |
| **Control & Field (버튼·입력창)** | `10px` | 검색창(`.search-field`), 일반 버튼(`.primary-button`, `.secondary-button`), 인라인 입력폼 |
| **Panel & Card (내부 섹션·서브 패널)** | `14px` ~ `16px` | 상세 화면 내 투표 폼 패널, 친구 평가 카드(`.friend-vote`), 설정 섹션 |
| **Sheet & Modal (모달·바텀 시트)** | `20px` ~ `24px` (`--radius-card`) | 데스크톱 다이얼로그(`20px`), 모바일 바텀 시트 상단 모서리(`24px 24px 0 0`) |
| **Pill / Capsule (알약형)** | `999px` (`--radius-pill`) | 모바일 Liquid Glass 하단 바(`.bottom-nav`), 세그먼트 컨트롤(`.segmented`), 상태 배지(`.status-badge`), 프로필 칩 |

---

## Components

### 3.1 데스크톱 사이드바와 모바일 내비게이션 (`AppNavigation.tsx`, `AppShell.tsx`)

#### 현재 실제로 구현된 디자인

- **데스크톱 사이드바 (`.sidebar`)**:
  - 상단에 브랜드 워드마크(`ohnochoo.`)가 위치하고, 그 아래에 4개 주요 경로(`홈`, `오노추`, `무티고을`, `앨범스`), `노래 추가` 버튼, 하단 프로필 전환 링크(`.sidebar-profile` → `/settings` 이동)가 수직 배치된다.
  - 모든 메뉴 아이콘(`.nav-link svg`)은 Apple Music 웹 레퍼런스처럼 파란색(`--accent-nav`: 라이트 `#007AFF`, 다크 `#0A84FF`)으로 렌더링되며, 메뉴 텍스트는 무채색(`--muted`, 활성/Hover 시 `--text`), 선택된 메뉴(`.nav-link.active`)는 연한 회색 배경(`--brand-soft`)으로 표시된다.
- **모바일 내비게이션 (`.mobile-topbar` + `.bottom-nav`)**:
  - 상단 `.mobile-topbar`는 홈(`/`)에서는 좌측 워드마크(`ohnochoo.`)와 우측 액션 버튼(`+ 추가`, 프로필)을 표시하고, 본문 대제목(`.page-header h1`)이 있는 서브페이지(`.mobile-topbar-subpage`)에서는 워드마크를 숨겨 상단 제목 중복을 최소화한다.
  - 하단 `.bottom-nav`는 화면 하단에 떠 있는 Liquid Glass 캡슐 바(`max-width: 520px`, `border-radius: 999px`) 안에 5개 핵심 탭(`홈`, `오노추`, `무티고을`, `앨범스`, `내 정보`)을 배치하며, 활성 탭(`.bottom-link.active`)은 반투명 유리 알약(`--glass-selection`) 위에서 파란색(`--accent-nav`) 아이콘과 라벨로 강조된다.

#### Apple Music 레퍼런스와의 차이 및 향후 검토 사항

- Apple Music 웹은 사이드바를 상단 탐색과 `보관함`, `플레이리스트` 섹션 소제목으로 그룹화해 보여주는 반면, `ohnochoo`는 5개 핵심 메뉴를 단일 리스트로 간결하게 제공한다.

---

### 4.1 아트워크, 곡 리스트, 캐러셀 (`SongCover.tsx`, `SongCard.tsx`, `SongCarousel.tsx`)

#### 현재 실제로 구현된 디자인

- **아트워크 (`SongCover.tsx`)**:
  - `1:1` 정방형 비율, `loading="lazy"`, 이미지 로드 실패 또는 미등록 시 무채색 플레이스홀더(`--raised`)로 폴백된다.
- **홈 캐러셀 (`SongCarousel.tsx`)**:
  - 가로 스크롤 스냅(`scroll-snap-type: x mandatory`)과 데스크톱 좌우 이동 화살표 버튼을 갖춘 정방형 앨범 커버 선반이다.
- **곡 리스트 행 (`SongCard.tsx`)**:
  - 데스크톱(`≥ 900px`)에서는 `grid-template-columns: minmax(0, 1fr) 228px 92px`의 3열 테이블 행으로 렌더링된다.
  - 중앙 통계 열(`.song-card-stats`)은 `grid-template-columns: minmax(0, 1fr) 64px 42px`의 3열 고정 슬롯(`추천자` · `평가 N명` · `평균 별점`)을 사용하며, 평균 별점이 아직 없는 곡(`avg === null`)은 `—`(`.song-card-rating-empty`)를 표시해 모든 곡 행의 열 정렬이 일치하도록 구현되어 있다.
  - 모바일(`< 900px`)에서는 통계 열이 곡 제목 아래 서브라인으로 접힌다.

#### 앞으로 유지할 디자인 원칙

- **홈 캐러셀 및 아트워크 중심 구성 유지**: 현재의 `SongCarousel` 구조와 데스크톱 `.song-card-stats` 고정 슬롯 정렬을 그대로 유지한다. (불필요한 2×2 플레이리스트 커버 헤더 등은 추가하지 않는다.)

---

### 5.1 버튼, Hover, 선택 및 포커스 상태 (`SegmentedControl.tsx`, `SearchField.tsx`, Buttons)

#### 현재 실제로 구현된 디자인

- **주요 버튼 (`.primary-button`)**: 배경 `var(--brand)`(`#262626` / 다크 `#EDEDED`), 글자 `var(--on-brand)`(`#FFFFFF` / 다크 `#1A1A1A`), `border-radius: 10px`, `height: 38px~40px`, `font-weight: 600`. Hover 시 `var(--brand-hover)`(`#444444`), `:active` 시 `scale(0.98)`.
- **보조/고스트 버튼 (`.secondary-button`, `.ghost-button`)**: 배경 `var(--control)`(`#EDEDF0`) 또는 투명, Hover 시 `var(--control-hover)`(`#E3E3E7`).
- **세그먼트 컨트롤 (`SegmentedControl.tsx`, `.segmented`)**:
  - 알약형 트랙(`background: var(--control)`, `padding: 3px`, `border-radius: 999px`) 안에 선택된 탭이 흰색 표면(`background: var(--surface)`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`)으로 올라오는 Apple HIG 표준 피커 스타일이다.
- **검색창 (`SearchField.tsx`, `.search-field`)**:
  - 좌측 돋보기 아이콘 + 입력 필드 + 우측 지우기(`×`) 버튼으로 구성되며, `:focus-within` 시 테두리가 `var(--line-strong)`으로 진해진다.

#### Apple Music 레퍼런스와의 차이

- Apple Music 웹과 iOS는 버튼과 리스트 행의 Hover/Active 전환이 매우 절제되어 있으며(과도한 바운스나 네온 글로우 없음), 키보드 탐색 시 `:focus-visible` 외곽선이 명확히 표시된다.
- 앞서 정리한 원칙에 따라, **파란색(`#007AFF`)은 데스크톱 사이드바 아이콘에만 제한적으로 사용**하며 일반 `.primary-button`이나 `.segmented` 활성 탭에는 파란색을 입히지 않고 현재의 무채색(차콜/화이트) 대비를 유지한다.

#### 앞으로 적용할 권장 디자인 원칙

- **버튼 컬러 절제**: `.primary-button`은 현재의 `--brand`(`#262626` / 다크 `#EDEDED`) 솔리드 스타일을 표준으로 유지한다.
- **일관된 포커스 링(`:focus-visible`)**: 모든 대화형 컨트롤(`button`, `a`, `input`, `[role="button"]`)에 키보드 접근 시 `outline: 2px solid var(--brand); outline-offset: 2px`가 일관되게 나타나도록 유지한다.
- **모션 곡선 표준화**: 상태 전환에는 `--motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1)`(`160ms~220ms`)을 기본으로 사용하고, `prefers-reduced-motion: reduce` 환경에서는 모든 애니메이션을 즉시 전환으로 단축한다.

#### 아직 확정되지 않은 사항 (Undecided)

- 해당 없음 (무채색 버튼 + 제한적 사이드바 블루 아이콘 원칙 확정).

---

### 6.1 모달, 바텀 시트, 상세 화면 (`Dialog.tsx`, `SongDetailDialog.tsx`, `AddSongDialog.tsx`)

#### 현재 실제로 구현된 디자인 (개선 반영 완료)

- **생성·관리 액션용 다이얼로그 (`Dialog.tsx`, `AddSongDialog.tsx`, `SettingsPage.tsx` 관리 도구)**:
  - 데스크톱(`≥ 640px`)에서는 화면 중앙에 떠 있는 모달(`max-width: 640px~720px`, `border-radius: 16px`, `max-height: 88dvh`)로 렌더링된다.
  - 모바일(`< 640px`)에서는 화면 하단에서 올라오는 시트(`border-radius: 30px 30px 0 0`)로 렌더링된다.
- **인라인 곡·앨범 상세 및 평가 화면 (`SongDetailDialog.tsx`, `useSongDialog.ts`, `RouteScrollReset.tsx`)**:
  - **Apple Music식 인라인 화면 전환 (데스크톱 & 모바일 공통)**:
    - 곡이나 앨범을 선택하면 팝업 모달이나 닫기(`×`) 버튼을 띄우지 않고, `.main-content` 내부에서 곡 상세 화면(`<article className="page page-transition song-detail-page">`)으로 자연스럽게 전환된다.
    - **데스크톱(`≥ 900px`)**: 좌측 사이드바(`.sidebar`)가 오버레이에 가려지지 않고 고정·활성 상태로 유지되어 상세 열람 중에도 다른 메뉴로 즉시 이동할 수 있으며, 우측 본문 영역(`max-width: 880px`)에서 단일 에디토리얼 컬럼으로 상세 정보와 평가를 보여준다.
    - **모바일(`< 900px`)**: 전체 화면 상세 페이지로 전환되며 하단 Liquid Glass 내비게이션(`.bottom-nav`)이 그대로 유지되어 탭 전환과 가상 키보드 입력 시 가시성을 보장한다.
  - **컨텍스트 복귀 버튼 및 스마트 히스토리·스크롤 보존**:
    - 상단 좌측에 현재 경로에 맞춘 복귀 버튼(`.song-detail-back`: `← 오노추`, `← 무티고을`, `← 앨범스`, `← 방출`, `← 홈`)을 배치하고, 브라우저 뒤로가기/앞으로가기 및 `Escape` 키 복귀를 지원한다.
    - `?song=<id>&vote=<id>&reply=<id>` 쿼리 파라미터 구조를 그대로 유지해 푸시 알림 딥링크와 100% 호환되며, `<Outlet />`을 언마운트하지 않고 숨김(`hidden`) 처리 + `RouteScrollReset`의 스크롤 위치 스냅샷 복원을 통해 목록의 검색어(`query`), 필터(`?filter=`), 월 선택(`month`), 스크롤 위치(`window.scrollY`)를 손실 없이 보존한다.
    - 앱 내 목록에서 진입한 경우(`state.fromSongList: true`)에는 `navigate(-1)`로 히스토리 중복 없이 복귀하고, 외부 링크나 푸시 알림으로 직접 진입한 경우에는 쿼리 파라미터만 제거(`replace: true`)해 현재 탭 목록으로 안전하게 복귀한다.
  - **본문 구성**:
    - 상단 `.song-hero`에 앨범 커버(`100px~142px`), 상태 배지(`StatusBadge`), 곡 제목(`h2`), 아티스트, 추천자·등록일, `Apple Music` 수록 앨범/플레이리스트 링크(`SongAlbumLink`), 투표 요약(`.vote-summary`)을 배치한다.
    - 그 아래로 추천 이유(`.recommendation`), 내 평가 작성/수정(`VoteForm`), 친구들 평가 및 답글 스레드(`.friend-votes`, `VoteReplyForm`)가 순서대로 이어진다.

---

### 8.1 `ohnochoo` 고유 기능의 디자인 원칙 (`VoteForm.tsx`, `StarRating.tsx`, `StatusBadge.tsx`, `RecordsPage.tsx`, `SettingsPage.tsx`)

`ohnochoo`만의 핵심 기능들은 외부 플러그인이나 대시보드 위젯처럼 보이지 않고, Apple Music의 기본 리스트·시트·컨트롤 문법 안에서 자연스럽게 동작해야 한다.

#### ① 별점 컴포넌트 (`StarRating.tsx`)

- **현재 실제로 구현된 디자인 (개선 반영 완료)**:
  - 5개의 별 아이콘을 렌더링하며 좌반부/우반부 클릭 및 방향키를 통해 `0.5`점 단위(`0.5` ~ `5.0`) 선택을 지원한다 (`0`점은 미입력으로 평균 계산에서 제외).
  - **댓글(읽기 전용 `readOnly`)**: 별점이 `0`점(미입력)인 평가 댓글에서는 회색 별 5개를 렌더링하지 않고 생략한다.
  - **평가/추천 입력 폼(`!readOnly`)**: 현재 선택한 점수를 우측에 고정폭 숫자(`4.5점` 등, 미선택 시 `미입력`)로 표시하며, 점수가 선택된 상태(`> 0`)에서는 `초기화` 버튼(및 키보드 `Backspace`/`Delete`/`0`/`Home`)을 제공해 언제든 `0`점(미입력) 상태로 되돌릴 수 있다.

#### ② 오노추 판정 투표 (`승격 / 보류 / 방출`) 및 14일 평가 유예 (`VoteForm.tsx`, `StatusBadge.tsx`)

- **현재 실제로 구현된 디자인**:
  - 오노추 후보곡(`album_name !== "[ALBUMS]"`)에 대해 3분할 판정 버튼(`승격`, `보류`, `방출`)과 평가 이유 텍스트 영역을 제공한다.
  - 선택 시 `.decision-승격`(`--promote` 텍스트/테두리 + `--promote-soft` 배경), `.decision-보류`(무채색 강조), `.decision-방출`(`--release` 텍스트/테두리 + `--release-soft` 배경) 스타일이 적용된다 (`live-mobile-due-vote-active.png` 확인).
  - 등록일로부터 14일간의 유예 기간과 `승격 ≥ 방출 + 3` 조건에 따라 `평가 중`, `승격 후보`, `무티고을 이동 가능`, `방출 예정` 4단계 `StatusBadge`와 `D-N` 배지가 표시된다.
- **앞으로 적용할 권장 디자인 원칙**:
  - 판정 버튼 3종(`승격 / 보류 / 방출`)은 Apple HIG의 세그먼트/토글 컨트롤 밀도에 맞춰 높이(`38px~42px`), 균등 분할(`grid-template-columns: repeat(3, 1fr)`), 절제된 시맨틱 틴트(`--promote-soft`, `--release-soft`)를 그대로 유지한다.
  - **중복 표시 및 불필요한 위젯 금지**: 14일 카운트다운(`D-N` 또는 `판정 완료`)은 곡 행의 우측 메타와 상세 화면 요약 줄에 각각 한 번씩만 깔끔하게 표시하며, 별도의 대형 원형 게이지나 평가 대시보드 배너를 추가하지 않는다. 또한 제외하기로 결정된 **연속 평가(Continuous Review) UI는 복원하거나 추가하지 않는다.**

#### ③ 친구들 평가 및 답글 스레드 (`friend-vote`, `VoteReplyForm.tsx`)

- **현재 실제로 구현된 디자인**:
  - 각 멤버의 프로필 아바타, 이름, 판정 배지(`승격`/`보류`/`방출`), 별점(`★ 4.5`), 평가 코멘트, 그리고 하단 대댓글(`.vote-replies`)이 리스트 형태로 렌더링된다 (`live-desktop-detail-scrolled.png`, `live-mobile-due-friend-votes.png` 확인).
- **앞으로 적용할 권장 디자인 원칙**:
  - 각 친구 평가 항목은 과도한 박스 중첩 대신 Apple Music의 댓글/리뷰 행처럼 아바타(`28px~32px` 원형) + 이름/배지/별점 한 줄 헤더 + 본문 코멘트 + 들여쓰기된 답글 스레드로 간결하게 정리한다.

#### ④ 공간별 고유 역할 구분 (`오노추`, `무티고을`, `앨범스`, `방출`)

- **현재 실제로 구현된 디자인 및 유지 원칙**:
  - **오노추 (`/onochoo`)**: `전체 / 미평가 / 평가 완료` 세그먼트 필터 + `판정일순 / 최신순` 정렬 + 곡 추가(`+`) 액션을 제공하는 활성 평가 워크스페이스.
  - **무티고을 (`/mutigoeul`)**: 승격 조건을 통과해 이동된 최종 플레이리스트 아카이브. 평가 수정이 잠긴 읽기 전용 기록 공간이며, Apple Music 플레이리스트 동기화 및 외부 열기 링크를 제공한다.
  - **앨범스 (`/albums`)**: `album_name === "[ALBUMS]"`로 구분되는 명반 컬렉션. 승격/보류/방출 버튼이나 14일 카운트다운을 숨기고 **별점(0.5점 단위)과 코멘트·답글만** 노출한다.
  - **방출 (`/records`)**: 아쉽게 승격하지 못하고 보관된 곡들을 월별(`YYYY년 M월`) 아카이브 그룹으로 묶어 당시의 평가와 대화를 보존하는 공간.

#### ⑤ 프로필 전환 및 관리자 권한 (`SettingsPage.tsx`, `admin.css`)

- **현재 실제로 구현된 디자인 및 유지 원칙**:
  - 일반 멤버는 별도 로그인 없이 사이드바 상단(모바일은 상단바/내 정보)의 프로필 선택기에서 본인을 선택해 즉시 활동한다.
  - 곡 메타데이터 수정, 무티고을 이동, 방출 보관 등 파괴적·결정적 운영 액션은 `내 정보` 하단의 관리자 로그인(Supabase Auth)이 활성화된 경우에만 노출되며, 일반 감상 흐름을 방해하지 않도록 상세 화면 하단 또는 설정 패널 내부에 조용히 배치한다.

---

## Do's and Don'ts

### Do's (권장 사항)

- **흑백·회색 중심의 미니멀 캔버스 유지**: 배경(`--canvas`, `--surface`), 텍스트(`--text`, `--muted`), 기본 버튼(`--brand`)을 무채색으로 유지해 앨범 아트워크가 화면에서 가장 돋보이게 한다.
- **데스크톱 사이드바 아이콘에만 파란색(`#007AFF` / `#0A84FF`) 사용**: 첨부된 Apple Music 웹 레퍼런스처럼 데스크톱 사이드바 아이콘에 파란색을 적용하고, 메뉴 텍스트는 검정 계열(`--text`), 활성 메뉴 배경은 연한 회색(`rgba(60, 60, 67, 0.08)`)으로 처리한다.
- **모바일 Liquid Glass 하단 내비게이션 유지**: `.bottom-nav`의 반투명 블러(`backdrop-filter: blur(16px) saturate(1.3)`)와 알약형 캡슐 디자인을 보존한다.
- **수치 열의 고정폭(`tabular-nums`) 및 고정 슬롯 정렬**: 데스크톱 곡 목록(`.song-row-stats`)에서 평균 별점 유무에 따라 득표수와 D-day 배지 열이 흔들리지 않도록 고정 슬롯 정렬을 유지한다.
- **별점 미입력(`0`점) 상태와 선택 점수의 명확한 피드백**: 별점 미입력 시 회색 별만 띄우지 않고 `미입력` 상태를 명시하며, 별점 선택 시 실제 점수 숫자 표기와 `미입력`으로 되돌리는 수단을 제공한다.
- **라이트 모드와 다크 모드 토큰 동기화**: 모든 색상 변경은 `:root`와 `:root[data-theme="dark"]` 양쪽 토큰에 대칭적으로 반영한다.

### Don'ts (금지 사항)

- **빨간색/핑크색(`#FA243C`) 강조 컬러 도입 금지**: 이전 Critique에서 제안되었던 Apple Music 레드/핑크 강조색은 본 프로젝트의 무채색 미니멀 지향점과 맞지 않으므로 적용하지 않는다.
- **파란색의 무분별한 확장 금지**: 데스크톱 사이드바 아이콘에 쓰이는 파란색을 일반 주요 버튼(`.primary-button`), 배지, 필터 칩 전체에 남발하지 않는다.
- **일반적인 SaaS 대시보드 / AI 카드형 UI 금지**: 곡 목록이나 통계 영역을 두꺼운 그림자 카드, 그라데이션 배너, 도넛 차트 위젯 등으로 바꾸지 않는다.
- **제외된 기능 및 불필요한 UI 요소 추가 금지**:
  - 연속 평가(Continuous Review) 기능을 복원하거나 관련 UI를 추가하지 않는다.
  - 새로운 평가 대시보드나 불필요한 장식용 배지를 추가하지 않는다.
  - 14일 카운트다운을 한 화면 안에서 중복 표시하지 않는다.
  - 불필요한 2×2 플레이리스트 히어로 헤더를 추가하지 않는다.
  - 기존 제품 기능, 판정 공식(`승격 ≥ 방출 + 3`), Supabase 및 Apple Music 연동 로직을 임의로 변경하지 않는다.
- **인라인 상세 화면과 생성·관리 다이얼로그의 역할 분리 유지**: 곡·앨범 상세 및 평가 화면(`SongDetailDialog`)은 `.main-content` 내 인라인 페이지 전환과 `← 이전` 복귀 내비게이션을 유지하고, 곡 추가(`AddSongDialog`) 및 관리자 도구 등 폼 중심의 단발성 액션에만 `Dialog.tsx` 모달/시트를 사용한다.
