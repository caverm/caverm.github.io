# 한국어 개인 블로그 구현 계획

상태: 상세 설계 검토 후 확정하고 구현한 계획. 2026-10-23.

## 후속 정책 변경: main 자동 게시와 수동 개발 검사 (2026-10-25)

사용자가 전체 브라우저/개발 검사를 자동 게시 조건에서 분리하고 main push의 검증 성공 후 자동 배포를 명시 승인했다. 기존 Docker·전체 verify·테스트 파일과 CMS의 verify.yml/publish 호출은 유지한다. verify.yml은 source 입력과 공유 오프라인 보안 경계→기존 CMS/카테고리 및 실제 site/base Astro·Pagefind 빌드→일반 정적 canonical/링크/이미지/RSS/sitemap/실제 draft 제외의 게시 준비 경로를 사용한다. 고정 글·예시 이름·fixture 개수를 요구하는 검사는 기존 full 경로에만 둔다. 실제 draft는 설치된 Astro의 기존 frontmatter 파서와 같은 slug 규칙으로 읽어 별도 공개 manifest 없이 확인한다. 온라인 감사 대신 기존 Zod/JSX/이미지 전제 guard는 빌드 전에 오프라인으로 강제한다.

main push는 준비 검사 성공 후 deploy하고 PR은 검사만 한다. 수동 verify.yml은 publish=false 기본값이며 true/main일 때만 deploy한다. 전체 pnpm verify는 별도 full-verify.yml의 workflow_dispatch로 실행하며 게시 job을 두지 않는다. CMS category refresh의 bot push 후 명시 publish=false 검사는 기존대로 설정 검증만 한다. focused 검증은 새 게시 준비 실제 빌드, 일반 산출물의 깨진 링크/이미지·실제 초안 누출 거부, workflow YAML/배포 분기와 수동 full/CMS 호환성을 다루며 전체 개발 검사를 불필요하게 반복하지 않는다. Git·원격 실행/배포는 수행하지 않는다.

## 후속 수정: GitHub verify 의존성 감사 실패 (2026-10-24)

재현 근거는 GitHub run40056990383/job120762039360의 source-security 단계이며 `artifacts/ci-failure-40056990383.log`에 보존한다. lint·CMS·타입·단위·소스 검사 뒤 신규 Zod/serialize-javascript advisory2건으로 exit1이다. Git 설정이나 페이지 배포의 실패가 아니다. 로컬 HEAD f84739b와 원격 실행 commit76af7ee는 다르므로 reset·원격 변경 없이 현재 소스에 최소 수정한다.

serialize-javascript override만 공식 패치7.1.3으로 갱신하고 Docker에서 lockfile을 재생성한다. Astro5의 Zod3 의존성은 공식 v3 backport가 없으므로4 major로 강제 교체하지 않는다. 대신 현재 애플리케이션의 유일한 Zod 컬렉션 입력인 tags를 공용 스키마로 분리하고 원소 검사 전에64개 초과 입력을 fatal/NEVER로 거부한다. src/public 텍스트 파일의 stat-before-read1MiB 한도를 check/dev/build/verify 앞에 둔다. 감사는 실제 스키마와 입력 경계·선행 검사 배선을 확인하고 그 조건에서만 정확한 Zod GHSA를 잔여 위험으로 분류한다. 공통 계약·한계는 security-spec의 SEC-CONTENT-02와 Zod 항목이 기준이다. Astra 설계 gate와 실제 완화/negative 회귀 검토를 거친다.

63/64/65개, 백만 길이 배열의 원소 접근0/단일 fatal 오류, 기본값/잘못된 타입, 대소문자·이미지 제외·실제 사전 검사의 실패 순서, 스키마 제거/무제한 컬렉션/새 import·loader·SSR/선행 검사 제거를 회귀 검사한다. frozen 설치·전체 verify·세 base 산출물과 기존 브라우저 회귀를 Docker에서 수행하고 개발 서버를 복원한다. 감사 정책의 통과와 원시 audit의 잔여 실패는 구분한다. 커밋·push·원격 CI 재실행·게시 요청은 하지 않는다. 복구는 이 수정의 의존성 override/lock와 입력 보호·감사 코드만 대상으로 하며 이전 스크롤·아카이브의 기존 제약은 유지한다.

전체 검증에서 추가로 드러난 기존 모바일 cover의 이미지 완료 후200px layout shift는 별도 실측·설계 gate를 거쳐 같은 수정 묶음에서 좁게 보완한다. PostCard의 기존20vh 상한과 같은 공간을 선예약하고 데스크톱 배치는 유지한다. 이미지 응답 gate로 복원 전·후 좌표를 모두 확인한다. 이 보완은 원시 감사 실패의 원인과 구분하며 실패 이력과 근거는 tasks에 남긴다.

## 후속 수정: 아래쪽 링크의 상향 스크롤 (2026-10-24)

현재 계약은 READ-03/READ-04다. 이전에 모든 페이지 이동 스크롤을 즉시 처리했더니 하단의 태그·카테고리 클릭이 새로고침처럼 느껴진다는 후속 요구를 반영한다. 범위는 태그·분류를 포함한 일반 내부 링크를 스크롤된 화면에서 누르는 경우다. 본문 fade/transform/등장·순차 연출은 복구하지 않는다. 이미 상단, history 복원, hash 목적지와 reduced-motion은 기존 즉시 처리를 유지한다.

설치된 ScrollPlugin3.3.2의 공식 README와 core4.10.0 renderPage/navigate 소스를 확인했다. plugin의 기존 위치 캐시는 visit:start에서 먼저 기록된다. 목적지가 준비된 뒤 비동기 content:replace before hook에서 기존 DOM을 위로 스크롤한 후 교체하면 짧은 목적지의 높이 제한으로 순간 점프하는 문제를 피할 수 있다. 이 시점에는 core가 ENTERING으로 진입한다. 첫 실제 회귀 검사에서 Back 대기 후 Forward가 동일 URL로 무시되는 core 경쟁을 발견해 Astra 재검토 후 공개 skipPopStateHandling/link:click replacement에 단일 최신 입력 버퍼를 둔다. 기존 skip 판정과 기본 링크 handler를 보존하고 visit:end에서 보류를 해제한 뒤 마지막 입력을 core에 한 번 넘긴다. 두 입력 종류를 함께 보류하므로 링크→Back→Forward에서도 오래된 링크가 core 대기열에 남지 않는다. 실패·abort·disable은 버퍼를 비우며 disable은 옵션도 복원한다. protected handler/private index·queue는 변경하지 않는다. y>1·일반 실제 링크·nonhash/nonpopstate/reset·!reduced-motion일 때만 기존 scrollTo(0,true)를 사용하고 호출 전 scroll:end listener를 등록해 완료를 기다린다. 정상 완료와 mousewheel 취소 모두 이 이벤트를 내보냄을 설치 Scrl 소스로 확인했다. listener는 finally에서 해제하고 y<=1의 no-op은 제외한다. 공개 cancel이 없는 scroller의 RAF를 남길 수 있는 임의 timeout은 넣지 않으며 scrolledToContent 플래그도 바꾸지 않아 취소 후의 기존 즉시 top 처리를 보존한다. animationClass:false/theme:false와 기존 manual history 복원은 유지한다. 이 최소 구현은 Astra 설계 gate 승인을 받았다.

회귀 검사는 실제 하단 태그→짧은 아카이브, 카테고리, 일반 하단 링크의 y 프레임과 교체 시점, opacity1/transform없음/첫 프레임 가시성을 확인한다. reduced-motion, 이미 top, history 원위치, 같은 페이지·페이지 간 hash, 빠른 연속 클릭과 스크롤 중 Back/Forward도 확인한다. 이전 검사 중 일반 이동의 즉시 y0만 READ-04의 완료 시 y0·중간 프레임으로 정당하게 바꾸고 기존 기능 검사는 유지한다. 활성 개발 서버는 검사·빌드 전에 상위 작업과 조율해 잠시 중지하고 검증 후 같은 loopback 주소로 복원한다. 변경은 기존 레이아웃/브라우저 검사/관련 문서로 제한하고 의존성·보안 정책·기존 완료 이력은 보존한다.

## 후속 수정: 페이지 전환 연출 제거

현재 계약은 spec.md의 READ-03이다. 재현 조건은 페이지·카테고리·글·페이지번호 클릭이며, Swup의 outgoing fade/translate와 새 본문·사이드바의 onload fade/stagger가 겹쳐 화면이 깜빡이는 것이 원인이다. 작은 UI 수정으로 기존 문서에 변경을 추가하고 초기 구현 이력은 유지한다.

Swup의 `main`, `#toc`, `#sidebar` 교체와 cache/preload/head/accessibility는 유지한다. 페이지 fade/slide와 onload/stagger 클래스·CSS·지연 변수를 제거하고 일반 페이지 이동의 smooth scroll을 끈다. smooth scroll용 임시 높이와 TOC 준비 숨김/200ms 지연도 제거한다. 배너 홈 상태는 새 본문 교체 시 갱신해 응답 대기 중 기존 레이아웃을 유지한다. 전체 요소의 transition을 비활성화하지 않으며 메뉴·분류 펼침·호버·복사·테마 피드백은 보존한다. 설치된 @swup/astro 1.8.0 소스로 `animationClass: false` 지원과 `smoothScrolling: false`가 ScrollPlugin을 제외함을 확인했다. 첫 브라우저 검사에서 native history 복원 y400이 더 짧은 기존 DOM의 y297로 제한되는 회귀를 확인했다. 따라서 자동 plugin 대신 Layout에서 기존 client export의 ScrollPlugin을 명시 추가해 `animateScroll`의 세 옵션을 모두 false로 설정하고 `animateHistoryBrowsing: true`로 manual 위치 복원을 활성화한다. findPlugin guard로 중복 추가를 막고 animationClass:false로 페이지 연출 없는 상태를 유지한다. 이 보완은 Astra 설계 재검토를 승인받았으며 좌표 복원·hash·첫 프레임을 다시 검증한다. TOC의 animationend 의존 초기화는 연결 시 초기화로 바꾸고 capture listener 해제도 맞춘다.

검증은 지연된 실제 목적지 응답 동안 기존 본문/사이드바의 opacity1 유지, 새 본문의 첫 프레임 가시성, URL/키보드 포커스/현재 분류/뒤로가기 스크롤/목차 hash, 모바일 조작을 두 base의 기존 Chromium 검사에 추가한다. 기존 빌드 산출물에 새 회귀 검사를 먼저 적용해 결함 검출을 확인하고 수정 후 필수 `pnpm verify`를 Docker에서 실행한다. 개발 서버와 build가 `.astro`에 동시에 쓰지 않도록 기존 컨테이너부터 확인한다. Docker 실행 불가는 통과로 보고하지 않는다. 복구는 이번 UI 관련 파일의 변경만 되돌리며 원래 글·CMS·보안 정책·의존성은 변경하지 않는다.

## 시작 시점과 제약

초기 디렉터리에는 AGENTS.md만 있었고 Git 저장소는 없었다. 이후 원본 `saicaca/fuwari` commit `6d39b0dec41282e7852e23e032998a5789abee28`의 소스와 lockfile이 복사되었다. 실제 스택은 Astro 5.13.10, Svelte 5, Tailwind 3, pnpm 9.14.4이며 기존 `check`, `build`와 Pagefind가 있다. 기존 lint는 `--write`로 소스를 변경하므로 검증 진입점에는 읽기 전용 명령을 사용한다. 원본 GitHub 배포 workflow는 컨테이너 공통 검증/Pages 산출물 흐름으로 의식적으로 교체한다. 원본 레이아웃·컴포넌트·스타일을 확장한다.

모든 Node/pnpm 실행은 Linux Docker 내부로 제한한다. 호스트 PowerShell은 파일 편집과 Docker 명령에만 사용한다. Spec Kit 실행 파일이 확인되지 않은 현재는 이 문서와 spec.md/tasks.md의 책임 분리를 사용하며 설치했다고 기록하지 않는다.

## 제안 설계

### 분류 모델과 주소

카테고리의 단일 기준 파일 후보는 `src/data/categories.json`이다. 각 항목은 `{ id, name, parentId?, order? }`이며 ID는 소문자 ASCII 영숫자와 하이픈으로 제한한다. 이름은 한국어를 포함한 자유 표시 문자열이다. 카테고리 ID를 사이트 경로 `categories/<id>/`에 사용하면 표시 이름이 바뀌거나 부모가 이동해도 주소를 유지하고 동명 카테고리를 구별할 수 있다. 표시 이름이나 사용자 입력 문자열로 경로를 직접 조립하지 않는다.

공통 분류 모듈은 Map/Set으로 검증된 ID 맵·부모/자식 인덱스·breadcrumb·자손 집합·고유 공개 글 목록을 제공한다. ID 공백/대소문자 정규화 충돌을 검사하고 DFS 방문 상태로 순환을 탐지한다. 중복 ID와 없는 참조는 파일·필드·값을 포함한 오류로 반환한다. UI는 데이터와 helper를 소비하며 자체 카테고리 정의나 별도 count 계산을 유지하지 않는다. 비말단 카테고리에도 글을 지정할 수 있고 부모 개수는 포괄 count의 합이 아니라 실제 자손 글 ID 집합 크기다. 빌드 단계에서도 공개 필터 이전에 초안을 포함한 전체 글 참조를 검증한다.

글 schema에 `categoryId` 하나와 `tags` 배열을 사용한다. 원본 `category` 필드 의존 코드를 모두 조사하여 원본 메타데이터·아카이브와 연결한다. 구형 입력과 새 입력을 동시에 별도 기준으로 유지하지 않는다. ID 검증은 초안에도 적용하지만 집계·페이지 생성은 공개 글만 받는다.

### 발행 경계

하나의 공개 글 조회 함수를 만들고 직접 경로 생성, 홈페이지/페이지네이션, 분류/태그/아카이브, 이전/다음 글, RSS, sitemap, 검색의 유일한 발행 필터로 사용한다. 원본 Pagefind 같은 빌드 후 검색 색인은 공개 페이지로만 생성한다. 초안 제목·slug를 합성 canary로 두고 생성된 HTML/XML/JSON/검색 에셋에서 검출되지 않는지도 확인한다.

### 내비게이션과 접근성

원본 사이드바 카드 스타일로 재귀 카테고리 목록을 만든다. 일반 `nav`와 중첩 `ul/li`를 사용하고 각 분기는 링크와 별도의 disclosure button을 제공한다. ARIA tree 역할을 추가하지 않아 불필요한 트리 키보드 규약을 만들지 않는다. disclosure는 aria-expanded/aria-controls와 실제 `hidden` 상태를 갱신하고 네이티브 Enter/Space 동작을 유지한다. 원본 WidgetLayout의 높이만 줄이는 접힘을 분류 트리에는 사용하지 않아 숨은 링크가 Tab 순서에 남지 않도록 한다. 현재 카테고리의 조상은 초기부터 열리며 링크에 aria-current를 사용한다. Swup의 기존 교체 대상 `main`, `#toc`에 `#sidebar`도 포함하여 이동·뒤로가기 시 서버에서 계산된 현재 선택과 조상 상태를 갱신한다. 모바일에서는 기존 메뉴 구조에 맞추어 동일 목록에 접근할 수 있도록 한다. 임의 깊이에서도 들여쓰기에 최대 시각 폭을 두어 가로 넘침을 방지한다.

### URL과 Pages

사이트 origin과 base를 환경 입력으로 명시하고 한 URL helper에서 내부 경로 정규화와 base 접두어를 처리한다. 원본 URL helper를 확장한다. 이미 base가 붙은 경로와 절대 외부 URL 처리도 테스트하여 중복 접두어를 방지한다. canonical, RSS, sitemap은 설정한 origin+base를 사용한다. 원본 Layout의 RSS alternate `${Astro.site}rss.xml`과 robots sitemap의 origin-only 주소도 수정 대상이다. 프로젝트 base에서도 루트 절대 에셋·검색 index 요청이 남지 않는지 정적 검사와 브라우저 요청으로 확인한다.

### Docker와 CI

원본 엔진 요구사항에 호환되는 Node 22.22.0과 pnpm 9.14.4를 고정한다. `node:22.22.0-bookworm-slim` Linux amd64 manifest 가용성은 확인되었으나 실제 설치·실행 검증은 남아 있다. Docker Linux 엔진은 정상이며 현 sandbox에서는 Docker 명령 실행에 escalation이 필요하다. Linux 앱 사용자는 비루트이며 bind mount의 프로젝트 루트에 소스를 둔다. node_modules·pnpm 캐시는 별도 named volume을 사용하고 초기 권한 설정이 필요하면 준비 단계로 제한한다. 개발 서비스는 컨테이너에서 0.0.0.0에 수신하되 호스트는 127.0.0.1로만 공개한다. Playwright 브라우저 의존성은 Docker 이미지 내부에 설치한다.

초기 설치, 개발, verify, 브라우저 테스트, 빌드를 동일 Compose 정의와 명령 체계로 제공한다. verify는 필수 도구 누락/실패를 비영 종료로 전달한다. CI는 frozen lockfile 설치와 같은 검증 스크립트를 호출하고 Pages 업로드용 산출물을 생성한다. 실제 원격 설정·배포는 수행하지 않는다.

## 문서와 운영

README는 Docker 전제조건, 실제 명령, 개인화 위치, 카테고리·글 작성 예시, root/project base 변경과 산출물 위치를 기준으로 관리한다. `docs/architecture.md`에는 현재 모듈/빌드 흐름, 배포 경계, 설계 선택과 로그 운영을 기록하고 `docs/security-spec.md`에는 합성 데이터·비밀정보 제외, 입력 무결성, 초안의 공개 금지와 검증 연결을 기록한다.

정적 사이트에는 서버 요청 로깅을 추가하지 않는다. 검증 실행기는 작업 ID, UTC 시각, 단계/명령, 종료 코드, 소요 시간을 stdout/stderr에 남긴다. 비밀정보를 요구하지 않는 고정 명령만 실행하고 전체 환경을 출력하지 않는다. Docker 로그 크기와 순환을 설정하고 조회·보관·정리 방법을 README에 적는다. 실제 구현과 일치하는 로그 정책은 architecture 문서를 기준으로 둔다.

## 검증 순서와 근거

1. 원본 package scripts와 타입/린트/빌드를 Docker에서 실행하여 기존 실패를 기록한다.
2. 중복 ID·없는 부모·순환·깊은 트리·동명 분기·빈 카테고리·자손 고유 집계·초안 제외·base URL helper를 단위 테스트한다.
3. 필수 형식/린트·타입 검사·콘텐츠 검증·단위 검사·생산 빌드를 공통 verify 진입점으로 실행한다.
4. root와 project base 산출물에서 링크·에셋과 초안 canary 제외를 검사한다.
5. 컨테이너 브라우저로 데스크톱/모바일, disclosure 키보드/터치, breadcrumb/selected 상태, 검색·페이지 이동·목차·복사·테마, 긴 코드 넘침을 검사한다. 콘솔·네트워크 오류도 수집한다.
6. 최종 설계 검토 후 결과를 tasks.md에 명령·종료 코드·근거로 기록한다. 실패나 실행 불가는 별도 표시한다.

## 위험과 복구

- 원본 최신 버전의 엔진과 검사 설정은 미확인이다. 실제 버전 확인 후 고정하며 lockfile을 임의로 버리거나 호스트에서 재생성하지 않는다.
- 원본의 분류/초안 처리 경로가 여러 곳이면 일부 공개 경로가 남을 수 있다. 모든 content collection 소비자를 조사하고 산출물 canary 검사로 보완한다.
- base 처리 중복과 Pagefind 상대 경로가 프로젝트 Pages에서 깨질 수 있다. 두 base의 실제 빌드·브라우저 검증을 필수로 둔다.
- Windows bind mount·named volume 권한과 Docker 실행 권한이 차단 요인이 될 수 있다. 호스트 설치로 우회하지 않고 차단 근거와 실행 가능한 후속 명령을 기록한다.
- 원본 파일은 출처와 원본 commit을 남겨 변경을 비교할 수 있게 한다. 복구는 로컬 수정 파일 단위로 하며 사용자 AGENTS.md를 덮어쓰지 않는다. Docker volume 삭제는 캐시·설치 의존성이 다시 필요하므로 일반 복구에 강제하지 않는다.

## 상세 설계 검토

Astra의 상세 설계 검토에서 전체 그래프 선검증·Swup sidebar 교체·실제 hidden disclosure·base 경로와 RSS/robots·비루트 fresh volume을 필수 조건으로 확정했다. 후속 구현 검토에서 검색 race/clear·base 이름 충돌·상대 이미지 피드·Linux CI UID/GID를 추가 반영했다. 현재 구조의 기준은 docs/architecture.md이고 실제 실행 결과는 tasks.md다.

