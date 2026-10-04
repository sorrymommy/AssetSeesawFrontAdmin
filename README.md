# AssetSeesaw Front Admin

AssetSeesaw(주식 리밸런싱 시스템) 관리자용 프론트엔드.
`FE-Admin-Template-Svelte` 템플릿을 기반으로 한 SvelteKit 어드민 앱이다.

## 기술 스택

- SvelteKit (Svelte 5, runes) — `adapter-static` SPA 빌드 (`ssr = false`)
- Tailwind CSS 4 (+forms, +typography)
- TOAST UI Grid (tui-grid)
- JavaScript + JSDoc 타입 체크 (svelte-check)

## 구조

```
src/
├── routes/
│   ├── +layout.svelte        # 전역 레이아웃 (글로벌 로딩, 파비콘)
│   ├── +page.svelte          # 메인 셸: Header(GNB) + NavMenu(LNB) + TabBar + Footer
│   └── login/+page.svelte    # 로그인 (현재 mock — WebAPI JWT 연동 예정)
└── lib/
    ├── constants.js          # 앱 이름/버전, 버튼 색상 상수
    ├── api/                  # 도메인별 API 클라이언트 (apiClient 래퍼 재사용)
    │   ├── apiClient.js      # 공통 fetch 래퍼 (글로벌 로더 연동, BASE_URL)
    │   ├── authApi / portfolioApi / accountApi
    │   └── transactionApi / stockApi / rebalancingApi
    ├── stores/               # tabStore(MDI 탭), authStore, loadingStore
    └── components/
        ├── Header / NavMenu / TabBar / Footer   # 레이아웃 컴포넌트
        ├── common/           # StandardListPage, Modal, ContentPlaceholder (단위프로그램 골격)
        ├── controls/         # 폼 컨트롤 (Button, NumberInput, LookupComboBox)
        ├── ui/               # GlobalLoading
        └── contents/         # 탭으로 열리는 화면들 (도메인별 폴더)
```

화면(탭 콘텐츠)은 라우트가 아니라 `contents/` 아래 컴포넌트로 만들고,
메뉴 클릭 시 `tabStore.openTab()`으로 연다 (MDI 탭 방식).

## 메뉴 체계 (3단: 대분류 → 중분류 → 메뉴)

- **대분류** = 상단 GNB (`Header`) · **중분류** = 좌측 LNB 그룹 · **메뉴** = LNB 말단(탭 오픈)
- 정의 위치: `src/routes/+page.svelte`의 `gnbItems`(대분류) + `menuItemsMap`(중분류/메뉴)
- 태그: `[구현]` API 존재 · `[구현*]` 기존 엔드포인트 조합 · `[향후]` API 신설 필요 · `[ADMIN]` 관리자 전용

| 대분류 | 중분류 | 메뉴 | 비고 |
|---|---|---|---|
| 1. 대시보드 | 종합 현황 | 자산 종합 대시보드 `[구현*]` | 평가 조합 |
|  | 보유 현황 | 보유 포지션 현황 `[구현]` / 현금 잔고 현황 `[구현]` | v_position·v_cash_balance |
| 2. 포트폴리오 | 포트폴리오 관리 | 포트폴리오 관리 `[구현]` / 목표비율 관리 `[구현]` | 계좌연결은 포폴 화면 버튼 |
|  | 평가 | 포트폴리오 평가 `[구현]` | 리밸런싱 제안 생성 버튼 |
| 3. 리밸런싱 | 리밸런싱 관리 | 리밸런싱 실행 이력 `[구현]` | 상세에서 상태변경/체결연결 |
| 4. 거래·계좌 | 계좌 관리 | 계좌 관리 `[구현]` | |
|  | 거래 관리 | 거래 내역 `[구현]` | 매매/현금 폼 분기 |
| 5. 기준정보 | 종목 | 종목 관리 `[구현][일부 ADMIN]` | 등록/삭제 ADMIN |
|  | 환율 | 환율 조회 `[향후]` | 조회 API 신설 필요 |
| 6. 시스템 관리 `[ADMIN]` | 사용자 | 사용자 관리 `[향후]` / 내 정보 `[구현]` | |
|  | 데이터 수집 현황 | 시세/환율 수집 현황 `[향후]` | 수집기 모니터링 |
|  | 환경설정 | 공통 코드 관리 `[향후]` | 코드 테이블 도입 시 |

대분류 6 · 중분류 11 · 메뉴 14 (구현 10 / 향후 4 / ADMIN 4)

### 단위 프로그램 표준 패턴 (모든 메뉴 공통)

- **목록이 기본** — `common/StandardListPage.svelte`(검색필터 + 액션버튼바 + tui-grid)
- **등록/수정은 팝업** — `common/Modal.svelte`를 등록/수정 폼 셸로 사용
- **추가 행위는 액션 버튼** — 계좌 연결관리, 리밸런싱 제안 생성, 상태변경/체결연결 등은 버튼바에 버튼 추가
- **향후 메뉴**는 `common/ContentPlaceholder.svelte`로 "준비 중" 표시
- **소프트삭제 복구**는 별도 메뉴 없이 목록의 "삭제 포함" 필터 + 복구 액션으로 처리

### 역할 기반 노출

- `authStore.user.role === 'ADMIN'`일 때만 **"시스템 관리" 대분류**와 **종목 관리의 등록/삭제 버튼** 노출
- 그 외 메뉴는 인증된 사용자 공통 (데이터는 모두 `user_id` 스코프)

## 백엔드 연동

- WebAPI: ASP.NET Core (`02-Backend/WebAPI`, dev: http://localhost:5026)
- API base URL은 `.env`의 `VITE_API_BASE_URL`로 설정 (`.env.example` 참고)

## 개발

```sh
npm install
npm run dev        # 개발 서버
npm run check      # svelte-check
npm run lint       # eslint
npm run build      # 프로덕션 빌드 (build/)
```

## 배포 (Docker 이미지 → GHCR)

정적 빌드 결과를 nginx 이미지로 서빙한다. API는 같은 출처의 `/api`로 호출하고
nginx가 `API_UPSTREAM`(기본 `http://webapi:8080`)으로 프록시한다 — 이미지 하나로 환경 무관, CORS 불필요.

`VERSION` 파일(`yyyy.MM.dd.N`, 예: `2026.10.04.1`)이 바뀐 커밋이 `main`에 push되면
GitHub Actions(`.github/workflows/docker-publish.yml`)가 이미지를 빌드해 올리고 git 태그 `v버전`을 만든다.

- 이미지: `ghcr.io/sorrymommy/assetseesaw-front-admin:<버전>` / `:latest`
- 형식이 틀리거나 이미 배포된 버전(같은 git 태그 존재)이면 실패
- `package.json`의 `version`은 SemVer 전용이라 VERSION과 맞추지 않는다

버전 올리기 — 오늘 날짜면 순서 +1, 아니면 `오늘.1`로 바꾸고 VERSION만 커밋:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bump-version.ps1        # 커밋만
powershell -ExecutionPolicy Bypass -File scripts/bump-version.ps1 -Push  # 커밋 + push
```

컨테이너 실행:

```bash
docker run -d -p 80:80 -e API_UPSTREAM=http://webapi:8080 ghcr.io/sorrymommy/assetseesaw-front-admin:latest
```
