# Pages CMS 작업과 검증 기록

기능 계약은 spec.md, 구현 방법은 plan.md가 기준이다. 기존 personal-blog 작업 이력은 유지한다.

## 작업

- [x] P01: AGENTS.md·현재 코드/설정·분류/글 schema·검증/게시 workflow를 읽는다.
- [x] P02: 공식 Pages CMS 문서의 structured file array, reference/select, rich-text, filename/date, actions payload 제약을 확인한다.
- [x] P03: spec/plan/tasks와 구체 설계 제안을 작성한다.
- [x] P04: Astra 설계 게이트와 상위 조사 결과를 반영해 구현 계획을 확정한다.
- [x] P05: CMS 설정 생성·--check와 단일 기준 분류 select/구조화된 article/category 설정을 구현하고 Docker에서 재생성·검사한다.
- [x] P06: 엄격한 날짜 호환과 새 CMS 글 기본 초안·안정 slug/filename·미디어 정책을 구현한다.
- [x] P07: 명시적 분류 갱신/검증 후 게시 CMS bridge와 최소 권한·payload 검증을 구현하고 CLI 회귀를 통과한다. 실제 원격 action은 미실행이다.
- [x] P08: Astro dev toolbar를 설정으로 숨긴다.
- [x] P09: 의미 있는 생성/날짜/action 경계 테스트와 CMS 저장 형식 합성 fixture 회귀 검사를 추가하고 Docker에서 통과한다.
- [x] P10: README·architecture·security와 변경된 현재 기능 계약을 갱신한다.
- [x] P11: Docker 필수 검증 단계·dev toolbar 브라우저 검사·Astra 검토와 근거를 기록한다. 전체 verify의 실패와 수정 후 단계 재실행 결과를 아래처럼 구분한다.
- [x] P12: 로컬 준비 완료/원격 미실행/알려진 위험을 구분하여 완료 보고한다.

## 확인 근거

| 작업 | 실제 관찰 | 결과 |
| --- | --- | --- |
| P01 | 현재 AGENTS/package/Astro/content schema/categories/verify/workflow 확인 | 기존 Docker와 수동 Pages 게시 게이트 확인. `.pages.yml`과 Git 저장소는 없음. |
| P02 | Pages CMS 공식 content/list/reference/select/rich-text/filename/actions/fields/date 문서 읽기 | JSON 배열 structured 편집 지원, reference는 collection만, select는 static, action은 payload JSON이라는 제약 확인. |
| 범위 확인 | 사용자: GitHub 저장소 “아직 없음” | hosted 연결/실제 CRUD/업로드/dispatch/게시를 이번 로컬 검사로 완료할 수 없음. 온보딩과 로컬 검증을 준비한다. |

## 현재 상태

**로컬 CMS 연결 준비 완료**다. Docker 복구 후 필수 검사 단계별로 통과했다. 아래 초기 장애·실패 이력은 보존한다. GitHub 저장소가 없으므로 실제 hosted 인증/CRUD/업로드/원격 Actions/Pages 게시를 완료했다고 보고하지 않는다.

### 2026-10-23 구현·검토와 검증 보류

- 구현 중 Docker 단위 검사 11개 통과와 Astro check 62파일/0 errors, 생성 YAML parser 통과를 확인했다. 이 결과는 아래 후속 변경 전 결과이며 최신 전체 verify 통과가 아니다.
- `src/content/posts/cms-saved-example.md`는 quoted published·updated 빈 문자열·코드 fence·Markdown 이미지/링크의 직접 작성한 합성 예시다. 실제 CMS 저장/왕복 결과가 아니다. 세 base 산출물 검사에 코드/이미지/링크/피드 assertion을 추가했으며 최신 build에서 아직 실행하지 못했다.
- 루트/소개 개발 페이지를 1440px·390px로 요청한 4건은 모두 HTTP200, toolbarCount=0, pageerror 없음이다. 근거: `artifacts/dev-toolbar-probe.json`과 `artifacts/screenshots/dev-toolbar-hidden-*.png`. 이후 compose down으로 dev를 종료했다.
- Astra 중간 검토의 개인정보 로그 문제는 payload env 대신 단일 GITHUB_EVENT_PATH readonly mount로 수정했다. 성공·잘못된 ref·손상된 event의 비노출 CLI 회귀를 보강했다. fresh checkout의 artifacts 부재는 테스트 mkdirSync로, Windows CRLF는 `.gitattributes`의 `.pages.yml text eol=lf`로 수정했다. 전체 경로까지 같은 카테고리는 라벨에 ID를 덧붙인다. 이 후속 변경들은 Docker 재실행 전이다.
- 마지막 `docker compose run --rm blog sh -lc 'pnpm format && pnpm cms:sync && pnpm test:unit'`는 Linux engine API500으로 exit1 종료했다. 패키지 명령은 실행된 것으로 인정하지 않는다. Docker Desktop 상태는 stopping이며 info/containers API도500, 정상 start 요청은 already running이었다. 사용자 Docker 재시작 후 `pnpm format`, `pnpm cms:sync`, `pnpm verify`가 필요하다. 호스트 Node/pnpm으로 대체하지 않았다.
- 현재 `.pages.yml`에는 order required=true/default=0이 들어 있는 것을 파일 검토로 확인했다. 최신 생성기와 일치하는지는 cms:sync/cms:check 재실행 전까지 확정하지 않는다. 생성물을 수동으로 재작성하지 않았다.
- 원시 audit의 이전 알려진 잔여 결과는 low4/moderate7/high3/critical1, 고유14 advisory, raw exit1이다. 정책 gate와 원시 audit는 구분하며 무취약/전체 검사 통과라고 보고하지 않는다.
- GPT-6 Astra 최종 코드 검토에서 미해결 차단 결함은 발견되지 않았다. 개인정보 로그 경로·Windows 줄바꿈·새 환경의 테스트 디렉터리 수정은 코드 검토 승인됐으나, 최신 실행 검증과 실제 CMS 연결 검증이 남아 전체 완료 판정은 보류했다. 주 개발은 GPT-6.1 Sol이 담당했다.
- README에 저장소/App/main 연결, Editor/Source·업로드·배열 삭제/재정렬·분류 갱신·명시적 게시 수동 인수를 남겼다. 저장소 생성·commit/push·App 설치·실제 CRUD/업로드·remote dispatch/Pages 배포·branch 보호 적용은 미실행이다.

### 2026-10-23 Docker 복구 후 결과

사용자가 Docker를 재시작한 뒤 Linux engine 정상 응답을 확인해 작업을 재개했다. `pnpm format` → `cms:sync` → `cms:check`를 Docker에서 실행했다. 현재 `.pages.yml`은 최신 생성기와 일치한다.

1. 첫 전체 verify(jobId `a2c6923e-c7db-4f89-945c-444043d47cf9`)는 lint/CMS/Astro/단위12개/source 검사 후 새 GHSA-98hj-9722-w3j8를 unknown1로 검출해 exit1로 종료했다. `artifacts/pages-cms-verify.log`를 보존했고 `pages-cms-first-audit-failure.json`은 그 로그에서 추출한 감사 이벤트/unknown ID 증거다. 원래 감사 snapshot 파일이라고 표현하지 않는다.
2. upstream 공식 적용 조건과 현재 코드의 JSX/MDX 경로 부재를 검토했다. Astra 승인 후 미사용 렌더 경로를 강제하는 audit-policy와 진입점 도입 시 실패하는 회귀 검사를 추가했다. 정확한 ID와 raw audit 실패/15 advisory를 보존하며 상세 위험은 security-spec이 기준이다.
3. 두 번째 전체 verify(jobId `d82d7d98-0c2c-444a-9383-fd0860aa8d76`)에서 아래 브라우저 이전 단계는 모두 통과했다. 로그는 `artifacts/pages-cms-verify-final.log`다. 마지막 기존 검색 음성 검사의 기대치가 실패하여 이 **전체 명령 자체는 exit1**이었다.
4. 실제 브라우저 진단에서 `DRAFT_PRIVATE_CANARY_7F3` 검색이 공개 CMS 예시의 `draft` 코드 토큰을 매치하여 결과1개(`/posts/cms-saved-example/`)를 반환했다. browser exceptions/실패 request는 없었다. 정확 canary 산출물 검사는 통과했으며 초안 유출이 아니었다. 근거는 `artifacts/pages-cms-browser-diagnostic.log`다.
5. 영어 canary 검색 완료 후 초안 URL0 검사와 함께, 실제 초안 본문에만 있는 단일 한글 토큰 `비공개초안표식`의 결과0을 확인하도록 브라우저 회귀를 수정했다. 정확 canary 전체 산출물 검사·직접 URL404도 유지한다. 제품 소스/생산 산출물은 바꾸지 않았다. Docker format/lint 후 `pnpm test:browser`만 재실행하여 exit0, 두 base 데스크톱/모바일 모두 통과했다. `artifacts/pages-cms-browser-final.log`가 근거다. 통과한 빌드/단위를 불필요하게 재실행하지 않았으므로 전체 verify 명령 exit0로 보고하지 않는다.

| 최종 필수 항목 | 실제 결과 |
| --- | --- |
| format/lint | 95파일, 최종 읽기 전용 lint 통과 |
| CMS 생성·stale 검사·YAML | sync/check 통과, 단위에서 결정성·깊이·동명·변경 검출·YAML parser 확인 |
| Astro/콘텐츠 타입 | 62파일, errors/warnings/hints 모두0 |
| 단위 | 13개 통과, 실패/취소/skip0. 날짜·분류·action 성공/거부/손상 event 비노출·JSX 경계 포함 |
| source security | 108파일 통과 |
| 감사 정책 | known15/unknown0 통과. 원시 audit exit1, low4/moderate8/high3/critical1 유지 |
| 생산 빌드·산출물 | `/`, `/blog/`, `/posts/` 각34페이지·2620 로컬 링크/에셋 통과. 합성 CMS 글의 quoted-date/빈updated·코드·이미지·링크·피드 포함 |
| 실제 Chromium | root/project base의 데스크톱/모바일·Swup·키보드·검색·코드복사·테마·초안404 통과 |
| dev toolbar | 앞서 확인한 4페이지 HTTP200/toolbar0/pageerror0 근거 유지 |
| Astra | 설정/action·privacy·fresh checkout·LF·신규audit guard와 최종 브라우저 오탐 수정/진단/두 base 통과 근거를 검토하여 승인 |

부모 에이전트도 최종 desktop-light/mobile-post 스크린샷을 열어 카드·트리·모바일 breadcrumb/긴 코드 영역·이미지·푸터를 확인했다. 개발 서버는 다시 띄우지 않았다. 원격 미실행 항목과 README의 hosted 수동 인수 체크리스트는 그대로 남는다.

