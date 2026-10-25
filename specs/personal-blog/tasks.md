# 한국어 개인 블로그 작업과 검증 기록

기준 요구사항은 spec.md, 구현 방법은 plan.md를 참조한다. 2026-10-23 시작.

## 후속 변경: 주본문 전용 fade/16px 전환 (2026-10-25)

- [x] M01: demo 동작·현재 Swup 순서·아카이브 렌더 경계를 읽고 Astra 설계 gate를 확정한다.
- [x] M02: main 전환과 아카이브 본문 준비를 구현하고 sidebar 비애니메이션 회귀를 갱신한다.
- [x] M03: 관련 check·게시 준비 빌드·집중 브라우저를 검증하고 문서·개발 서버를 복원한다.

새 명시 요구로 이전 READ-03 계약을 교체한다. 취소된 배너 위치 수정은 재개하지 않으며 사용자 설정·사진·글과 이전 게시 정책은 유지한다. 기존 실패·완료 기록은 이력으로 보존한다. Docker Chromium의 실제 demo Home→Archive는32프레임 중 main 중간 opacity21프레임, sidebar 숨김0프레임이었다(`artifacts/demo-motion.json`, `demo-motion.log`).

구현: Astra 승인 설계에 따라 main 전용 WAAPI200ms/16px outgoing→교체→incoming과 전환 전체 최신 입력 버퍼를 적용했다. outgoing fill은 DOM 교체까지 유지하고 incoming 완료·실패·abort·disable에서 정리한다. 아카이브는 공개 글 SSR+초기/교체 동기 query 필터로 준비하며 noscript 공개 목록을 제공한다. tag OR/category AND/uncategorized/개수/연도 숨김을 보존했다.

검증 중 발견한 기존 실패: 단위23개 중 audit-policy negative1개는 CRLF 파일에서 LF 문자열 치환이 무변경이 되어 발생했다(artifacts/main-transition-unit.log). 보안 정책은 유지하고 fixture 읽기 EOL만 정규화했으며 각 negative 입력이 safe와 실제로 다른지도 검사한다. 최종 단위24/24와 Astro64파일0error/0warning/0hint(artifacts/main-transition-unit-final.log, main-transition-check-final.log). 모바일 브라우저 첫 시도는 숨긴 데스크톱 링크 클릭의 harness timeout이었고 실제 모바일 메뉴를 여는 방식으로 수정했다(main-transition-browser-first-failure.log).

최종 검증(2026-10-25): Docker 실제 SITE_URL=https://caverm.github.io BASE_PATH=/ 게시 준비 검사 exit0, job9db30c34-3ea4-4c70-aac0-3381090d0836/43.629초/일반 로컬 참조2809개(artifacts/main-transition-publish.log). 실제 Astro/Pagefind 빌드는1회다. 집중 Chromium 최종 exit0(main-transition-browser-final.log): desktop/mobile 일반 홈·카테고리·아카이브·소개·글·페이지번호·태그, 응답300ms 보류 중 old main opacity1/무변형, main 양방향200ms/16px·sidebar/TOC항상가시/무등장효과, 기존하단smooth-top, delayed cover/avatar history좌표, scroll중7경쟁과 outgoing/incoming중 link/BackForward4경쟁, reduced-motion·cross-page hash 위치를 확인했다. 아카이브 직행 query의 첫 가시 snapshot과 tag OR/category AND/uncategorized/0건·연도숨김, JavaScript없는 SSR공개목록도 통과했다. 소유파일4개 formatter와 최종 check·unit을 통과했고 전체3base/full verify·온라인감사·Git·원격배포는 재실행하지 않았다. Docker 개발 서버는 기존127.0.0.1:4321로 복원했고 Astro ready2777ms/watching 로그를 확인했다. 기존 보안 감사 잔여 위험은 이번 범위에서 해소됐다고 주장하지 않는다. 캡처는 artifacts/screenshots/main-transition-1440.png, main-transition-390.png다.

최종 Astra 읽기 전용 기능 gate는 **APPROVED**다. 최종 로그·타입·단위·게시 산출물과 desktop/mobile 캡처2장을 대조했고 추가 수정 요청은 없었다. 승인 범위는 이번 main 전환/아카이브 준비 기능이며 미실행 전체 검사나 기존 advisory 해소를 뜻하지 않는다.

## 후속 정책 변경: 게시 준비 검사와 수동 전체 검사 (2026-10-25)

- [x] P01: 사용자 승인 범위와 기존 workflow/build/CMS/산출물 검사를 읽고 PUB-02/CMS-09 계약·계획을 갱신한다.
- [x] P02: Astra 설계 gate 뒤 게시 준비 진입점·공통 정적 검사·main 자동 배포/별도 수동 full workflow를 구현한다.
- [x] P03: 실제 Docker 게시 준비 빌드와 focused 오류·분기 검증을 수행하고 문서·개발 서버를 마무리한다.

구현·검증: 기존 `pnpm verify`와 기본 check-dist의 기능 fixture·전체 테스트를 보존했다. 새 `verify:publish`는 소스 사전 검사·공유 오프라인 Zod/JSX/의존성 전제 guard를 먼저 실행하고 CMS/콘텐츠·실제 origin/base Astro/Pagefind 빌드 뒤 일반 산출물을 확인한다. verify.yml의 이름과 CMS publish 입력을 유지하며 main push 자동 배포/PR 검사/수동 main+publish 선택으로 분기하고, full-verify.yml은 수동 전체 검사만 수행한다. 초안은 기존 Astro 파서/slugger로 실제 경로를 구하며 고정 글·사진 파일명·예시 개수를 요구하지 않는다.

2026-10-25 Docker `SITE_URL=https://caverm.github.io BASE_PATH=/ pnpm verify:publish` **exit0**, job `82fb8545-a54d-48e3-b538-dd4401fa7516`,38.690초/일반 로컬 참조2763개(`artifacts/publish-verify.log`). 첫 시도는 빌드 전에 변경 파일 formatter의 unused import/control-character 정규식 지적으로 중단했고 해당 두 항목만 수정했다. 실제 게시 빌드는 한 번만 실행했다. 최종 focused 검사7개는 **PASS**(`artifacts/publish-boundaries.log`): 예시 콘텐츠 없는 일반 산출물·개인화 이미지/query, 깨진 이미지/링크·index 없는 디렉터리·RSS 이미지 거부, 명시 slug/중첩 index/잘못된 frontmatter, 실제 초안 직접 경로/피드/sitemap/색인 누출 거부 및 draft a와 공개 a/b 구분, 오프라인 guard 제거·후순위 이동 거부, workflow YAML/배포 분기/CMS 호환, runner exit7/동일 작업 ID·UTC·실패 종료 이벤트. 소유한 파일만 formatter 적용했고 사용자 콘텐츠·프로필·배너는 변경하지 않았다. 전체 브라우저/세 base/full verify·온라인 감사·원격 Actions/배포는 이번 정책 수정에서 재실행하지 않았다. 기존 원시 감사 잔여 위험15건은 해소됐다고 보고하지 않는다.

최종 검토·복원: Astra **APPROVED**, root도 실제 게시 실행의 passed 종료 이벤트를 확인했다. 초기 `publish-focused.log`는6/6이며 최종 `publish-boundaries.log`는 runner 실패 회귀를 포함한7/7 전체 focused 결과다(두 실행 개수를 합산하지 않는다). Docker 개발 서버를 복원했고 로그에서 Astro ready2277ms와 watching을 확인했다. 기존 loopback `http://127.0.0.1:4321/`로 준비됐으며 추가 브라우저 probe는 실행하지 않았다.

시작 상태: 동적 이미지 URL 브라우저 수정은 보존하며 개인화 경로/query/srcset/동일 URL의 Docker 임시 fixture는 exit0으로 끝났다. 전체 verify는 재실행하지 않았다. 당시 개발 서버는 중지 상태였으며 사용자 소개·프로필·배너·콘텐츠는 변경하지 않는다. Docker 일반 조회는 pipe permission denied였지만 승인된 승격 실행은 정상이다. 새로운 의존성을 설치하지 않고 Astro가 이미 사용하는 parseFrontmatter/github-slugger를 재사용한다. 기존 CMS-09의 수동 게시 전용 정책은 이번 명시 승인으로 대체되며 과거 실패·검증 기록은 보존한다. Git 명령·커밋·push·원격 workflow 실행은 하지 않는다.

## 후속 수정: 개인화한 소개 본문의 브라우저 검사 (2026-10-25)

개발 서버는 Up/`127.0.0.1:4321→4321`이며 Astro5.18.2 ready(2776ms)·파일 감시 시작을 확인했다.

결과: Docker `pnpm format && pnpm verify` **1회 exit0**. 전체 실행 `1a0bbc14-3337-4bd7-bc2e-3a8511567391`은179.202초에 통과했다(`artifacts/about-verify.log`). 두 base에서 현재 빌드 소개 본문과 이동 후 실제 본문의 유일성·가시성·내용 일치가 통과했고, 기존 필수 검사와 브라우저 회귀도 통과했다. Astra는 원문을 로그에 노출하지 않는 비교와 누락/빈 본문 거부를 읽기 검토해 APPROVED했다. 사용자 소개·프로필·다른 글 fixture와 앱 소스는 수정하지 않았다. 새 의존성 설치·Git 명령·원격 반영 없이 개발 서버를 복원했다.

첨부 `1_verify.txt`의 CI 실행은 소개 이동 뒤 `browser-check.mjs:793`의 예시 이름 `/블로그 주인/` 고정 단언에서 실패했다. 현재 소개 파일이 존재하고 비어있지 않으며 그 예시 이름은 없음을 원문 출력 없이 확인했다. 사용자 소개·프로필은 수정하지 않는다. Astra 설계 검토 후 빌드한 `about/index.html`에서 정확히 하나의 비어있지 않은 Markdown 본문을 기준으로 추출하고, Swup 소개 이동 뒤 실제 본문의 유일성·가시성과 공백 정규화한 내용 일치를 확인하도록 바꾼다. 비교는 고정 메시지의 boolean 단언으로 개인 소개가 실패 로그에 출력되지 않게 한다. 누락·빈 본문·다른 본문은 실패하고 특정 이름이나 예시 문구는 요구하지 않는다. Git 명령·새 의존성 설치 없이 Docker 전체 verify 한 번과 개발 서버 복원을 수행하고 결과를 아래에 기록한다.

## 후속 수정: GitHub verify 감사 실패 (2026-10-24)

개발 환경 복원(2026-10-25): `docker compose up -d blog` exit0, 서비스 Up과 `127.0.0.1:4321→4321` 바인딩을 확인했다. 로그에서 Astro5.18.2 ready(3069ms)와 파일 감시 시작을 확인했다. 사용자 요청대로 재개 후 Git 명령·추가 테스트/probe는 실행하지 않았다.

- [x] A01: 실제 GitHub run40056990383/job120762039360 로그와 로컬 상태를 대조하고 공식 수정·설치 의존 경로를 확인한다.
- [x] A02: Astra 설계 gate 후 serialize 패치와 실제 tags/소스 입력 완화·감사 guard를 구현한다.
- [x] A03: 실제 공용 스키마의 원소 접근0/경계·기본값과 guard 제거·새 입력 경로·확장자·사전 검사 순서 회귀를 확인한다.
- [x] A04: frozen 설치·전체 Docker verify·원시 잔여 감사 결과를 기록하고 Astra 최종 검토·개발 서버 복원을 마친다.

최종 결과: 전체 Docker verify `28a41897-5d80-46fb-9648-458a36f89ede`는 **exit0**(182.747초)이었다(`artifacts/ci-audit-verify-confirmed.log`). 선행 입력 검사/lint99/CMS/check63파일 오류·경고·hint0/단위18/source108/세 base 각각34페이지·2620참조/양 base 브라우저 회귀를 통과했다. 실제 이미지 응답 gate의 미완료·완료 시점 공간/원좌표 검사도 통과했고, 수정 후 독립 시계열은 `artifacts/restore-images-after.json`과 로그에 보존했다. 감사 정책은 known15·unknown0 PASS지만 원시 audit는 exit1(low4/moderate8/high3/critical1)이며 Zod3 자체는 미패치 상태다. Astra는 최종 코드·전체 실행·최신5장 화면을 직접 대조해 **APPROVED**했다. 이전 실패 기록은 아래에 그대로 남긴다. 2026-10-25 재개 시 추가 검사/probe/Git 명령 없이 최소 문서 정리와 개발 서버 일반 시작만 수행한다. 원격 CI 재실행·커밋·push·배포는 하지 않았다.

재현과 범위: 실제 CI 로그 `artifacts/ci-failure-40056990383.log`는 lint/CMS/check62파일 오류0/단위13/source107 PASS 후 audit known14·unknown2에서 exit1을 보였다. 원격 실행 commit76af7ee와 현재 로컬 HEAD f84739b는 달랐고 작업 시작 Git 상태는 clean이었다. 현재 저장소와 이전 스크롤·문서를 보존했고 reset·Git index·원격 변경은 하지 않았다. Docker Linux29.6.1이 정상이며 개발 서비스는 시작 시 Exited(1)로 활성 개발/빌드 충돌은 없었다.

공식 조사: serialize-javascript GHSA의 패치7.1.3/Node>=20은 현재 Node22와 호환된다. Docker pnpm view/why로 Zod3 최종3.25.76과 Astro5의 실제 의존성, RSS/sitemap의4.6.7을 확인했다(`artifacts/zod-v3-versions.json`). upstream6653에서 v3 신규 배포가 없고 `.max()`로도 원소 파싱을 계속함을 확인했다. Astra 조건부 gate에 따라 Zod3 자체는 유지하고 실제 입력을 제한한다. 무근거 예외나 severity 변경이 아니다.

구현과 초기 검증: Docker install은 exit0이며 lock diff는 serialize7.0.5→7.1.3의 override·해시·의존 참조만 바뀌었다(`artifacts/ci-audit-install.log`). 공용 tags schema는63/64개를 보존하고65개·백만 길이 sparse 배열을 원소 getter0회/단일 fatal 오류로 거부했다. 기본값·기존 invalid 값·1MiB 대소문자·이미지 제외·실제 사전 검사 실패 순서·guard 제거/새 collection/import/remote loader/SSR/배선 변경·mts/cts/cjs/MTS 실제 읽기 회귀를 포함해18개 PASS였다(`artifacts/ci-audit-guard-final.log`). check63파일 오류·경고·hint0도 PASS였다(`artifacts/ci-audit-focused-final.log`). audit는 known15·unknown0, 원시 exit1(low4/moderate8/high3/critical1)이었다. 최종 전체 실행은 아래에 별도 기록한다.

검토 보완: Astra가 발견한 audit 소스 확장자 읽기 불일치를 공용 readAuditSources로 수정하고 실제 파일 기반 회귀를 추가했다. 원시 감사는 guard 전에 저장하고 요약의 pending/failed/passed와 실패 원인을 남긴다. audit exit2 같은 실행 오류도 passed 기록 전에 실패시킨다. Zod 분류는 Astro/static·신뢰 작성자·실제 tags 경계와 guard에 한정한다는 Astra 설계 검토를 받았으며 라이브러리 자체 패치나 모든 파싱 경로 보호라고 주장하지 않는다.

전체 검증 첫 실행 `2f20f10b-cf95-4246-97f0-4d1f7ee8ca4e`는 frozen 설치/선행 입력 검사/lint99/CMS/check63파일 오류·경고·hint0/단위18/source108/audit known15·unknown0/세 base 각34페이지·2620참조를 통과했지만 브라우저의 모바일 카테고리 뒤로가기에서 exit1이었다(`artifacts/ci-audit-verify.log`,191.5초). 루트 브라우저 전체는 통과했고 `/blog/`에서 기존 복원 좌표 검사가 timeout이었다. 같은 빌드의 진단 재실행도 루트에서 expected1162/actual1362·height2943·viewport1000·manual·navigatingfalse로 실패했다(`artifacts/ci-browser-diagnostic.log`). 브라우저 예외·실패 요청은0이었다. 허용 오차를 늘리거나 재시도로 성공 처리하지 않았다.

동일 원인 두 실패 뒤 가정을 재평가했다. 기존 모바일 PostCard cover는 max-height20vh만 있고 public img에는 크기가 없었다. 지연 이미지250ms/캐시 제거의 독립 재현은 교체 직후 cover0/y0→복원 cover0/y1162→이미지 완료 cover200/y1362를 기록해 늦은 이미지 높이와 browser scroll anchoring의 실제 경쟁을 입증했다. warm cache에서는 처음부터 cover200이라 y1162를 유지했다. 수정 전 증거는 `artifacts/restore-layout-before.json`/`restore-layout-before.log`다. Astra/root 설계 검토 후 모바일 cover만 h20vh로 공간을 미리 확보하고 desktop md:h-auto와 기존 absolute/max-height를 보존했다. 공식 복귀 회귀는 이미지 응답 gate를 닫아 incomplete 상태의 cover200·원래 y±2를 확인한 뒤 해제하고, 완료 후에도 같은 좌표를 확인한다. 전역 anchoring 해제·고정 대기·좌표 오차 확대는 하지 않았다.

감사 실패 보고서 진단도 Docker의 분리된 임시 입력에서 수행했다. 첫 합성 fixture는 build/verify 파일 누락으로 기대 오류와 달라 exit1이었다. fixture만 보완한 `artifacts/ci-audit-failure-proof-confirmed.log`는 exit0이며 audit 명령 exit2와 실제 Zod 정책 실패가 각각 현재 raw JSON 저장·summary failed/실패 사유·프로세스 exit1로 남음을 확인했다. 실제 소스나 감사 결과를 합성 자료로 대체하지 않았다.

cover 보완 후 전체 실행 `77c8b5af-9732-4744-8942-bbff21766fc2`도 보안·세 base 빌드/정적 검사는 통과했지만 이미지 gate를 닫은 모바일 태그 복원에서 expected1943/actual1775로 exit1이었다(`artifacts/ci-audit-verify-final.log`,147.4초). cover200 선예약 검사는 통과했다. 캐시 제거로 프로필 이미지의 별도 예약 결함이 드러났으며 avatar500ms 지연 독립 재현은 교체 maxY1775/avatar0→복원 y1775→avatar168/maxY1943 회복 뒤에도 y1775 잔존을 확인했다(`artifacts/restore-avatar-before.json`, `restore-avatar-delayed-before.log`). 즉 cover의200px scroll anchoring과 avatar의168px 최대 높이 clamp는 서로 다른 실제 원인이었다. Astra/root 추가 gate 후 기존 정사각 avatar의 anchor에 aspect-square 하나를 추가했다. 공식 회귀는 cover/avatar 응답을 함께 보류하고 두 이미지의 미완료 상태부터 cover200/정사각 avatar 공간과 원래 좌표±2를 확인한 뒤, 둘 다 완료된 뒤에도 같은 좌표를 확인한다.

## 후속 수정: 아래쪽 링크의 상향 스크롤 (READ-04, 2026-10-24)

- [x] S01: 현재 계약·관련 코드와 설치 ScrollPlugin/core를 읽고 READ-03/READ-04와 수정 계획을 갱신한다.
- [x] S02: Astra 설계 gate의 완료/취소/중복 탐색 조건을 충족하는 최소 구현을 확정한다.
- [x] S03: 기존 화면의 상향 스크롤 후 교체를 구현하고 하단·짧은 목적지·reduced-motion·history/hash·연속 클릭 회귀를 확인한다.
- [x] S04: 필요한 Docker 검증, 문서 갱신과 Astra 최종 검토를 마치고 개발 서버를 복원한다. 당시 감사 차단은 위 후속 CI 수정의 전체 exit0과 최종 승인으로 해소했다.

시작 상태: 기존 개발 서버는 `127.0.0.1:4321`에서 실행 중이며 사용자는 `/archive/?tag=ICS`를 보고 있다. 아직 소스·빌드·타입 검사를 시작하지 않고 읽기 전용 설치본 확인과 문서 작업부터 진행한다. 이전 READ-03의 완료/실패·보완 이력과 원시 audit의 알려진15 advisory는 아래에 그대로 보존한다.

### 진행 중 검증과 보완 (READ-04)

- 첫 Docker 전체 verify(`fe12bdd1-335d-4307-aae5-c6a497b07d46`, `artifacts/scroll-verify.log`)는 lint/CMS/Astro62파일 오류·경고·hint0/단위13/보안 정책 known15·unknown0/세 base 각34페이지·2620참조를 통과했다. 실제 하단 태그·카테고리는 y600/1943/1162에서 중간38~44프레임을 거쳐 y0에 도달하고 교체됐으며 reduced-motion은 중간0프레임이었다. 빠른 링크와 Back 검사는 통과했으나 빠른 Back→Forward에서 URL/DOM 목적지가 맞지 않아 전체 exit1이었다.
- 실패를 테스트 대기 부족으로 완화하지 않았다. 설치 Swup4.10.0에서 ENTERING 중 Back은 대기열에 보관되지만 즉시 Forward는 현재 internal URL과 같아 무시되고 이전 Back만 실행되는 실제 경쟁을 확인했다. 테스트의 빠른 history 입력과 최종 DOM 확인을 유지하며 공개 옵션/훅 경계의 보완을 검토한다. 임의 timeout, private queue/index 변경, protected handlePopState 호출은 사용하지 않는다.
- 중단 후 Docker 엔진 pipe가 없었고 Desktop/백엔드도 중지돼 있었다. 상위 작업에서 Docker Desktop을 정상 시작한 뒤 Linux29.6.1/개발 서비스 Exited143을 확인했다. 이후 작업은 Docker 안에서만 재개했고 호스트 Node/pnpm/의존성 설치는 실행하지 않았다.
- Astra 재설계 gate에 따라 상향 스크롤 시작부터 해당 visit:end까지 처리되는 링크/history를 단일 latestAction으로 보류했다. 공개 skipPopStateHandling의 원래 판정과 link:click의 기본 handler를 보존하고 마지막 입력만 버퍼를 비운 뒤 실행한다. link도 함께 보류하여 링크→Back→Forward에서 오래된 core 대기열이 남지 않게 한다. protected handler/private index·queue를 건드리지 않는다. 실패·abort·disable 정리와 disable의 원래 옵션 복원을 둔다. 설치 ScrollPlugin의 native popstate 구독은 현재 anchor mark를 재계산하는 updateScrollTarget뿐이고 앱의 다른 native popstate 구독은 없음을 확인했다. 새탭·수정키와 core가 먼저 무시하는 동일 목적지 중복클릭의 기존 경계도 계약에 명시했다.
- 첫 보완 check와 `artifacts/scroll-verify-resumed.log`는 link replacement의 defaultHandler가 설치 타입상 optional이라 Astro2오류로 실패했다. 실제 기본 handler 부재 시 명확한 오류를 던지는 guard를 추가했다. 다음 전체 verify(`0da0c400-fffd-43bc-8f52-8749bc80e859`, `artifacts/scroll-verify-resumed-final.log`)는 lint95/CMS/check62파일 오류·경고·hint0/단위13/source107을 통과했다. 그러나 온라인 감사가 known14·unknown2(raw exit1, low5/moderate8/high3/critical1)로 바뀌어 필수 source-security 단계에서 전체 exit1이었다. 새 두 GHSA와 호환성 검토 필요성을 security-spec에 기록했으며 의존성·lockfile·감사 허용 목록은 바꾸지 않았다.

### 최종 기능 결과와 남은 전체 검증 조건 (READ-04)

동일한 최종 소스에서 남은 필수 단계를 Docker 안에서 별도 실행했다. `BASE_PATH=/ BUILD_OUT_DIR=dist-root pnpm build && pnpm exec node scripts/check-dist.mjs dist-root / && BASE_PATH=/blog/ BUILD_OUT_DIR=dist pnpm build && pnpm exec node scripts/check-dist.mjs dist /blog/ && BASE_PATH=/posts/ BUILD_OUT_DIR=dist-collision pnpm build && pnpm exec node scripts/check-dist.mjs dist-collision /posts/ && pnpm test:browser`는 **exit0**이며 근거는 `artifacts/scroll-build-browser.log`다. 감사 실패를 생략한 전체 verify 성공으로 보고하지 않는다.

| 검사 | 최종 실제 결과 |
| --- | --- |
| 형식·CMS·타입·단위·소스 보안 | 전체 verify의 lint95/CMS/Astro62파일 오류·경고·hint0/단위13/source107 PASS. |
| 의존성 감사/전체 verify | **FAILED**. 신규 unknown2, 원시 audit exit1. 예외·정책·의존성 무변경. 보안 명세의 2026-10-24 기록 참조. |
| 생산 빌드·정적 참조 | 세 base 각각34페이지·Pagefind 생성·2620개 내부 링크/에셋 PASS. |
| 실제 상향 이동·전환 스타일 | 두 base의 데스크톱/390px 하단 태그·카테고리에서 응답 준비 후 기존 DOM 상향 중간38~44프레임·교체y0 PASS. reduced-motion 중간0프레임. 응답300ms 대기 중 가시성과 교체 container의 첫 프레임 opacity1/transform없음 PASS. 이 검사는 client-only 본문의 실제 첫 렌더 완료를 보장하지 않는다. |
| 빠른 입력 경쟁 | 두 base 각각 link/back/back-forward/wheel/back-link/link-back/link-back-forward, 총14개 PASS. 빠른 Forward 뒤 추가 push의 index+1, Back/Forward의 실제 URL·DOM·index까지 PASS. 입력 사이에 탐색 완료 대기를 추가하지 않았다. |
| 기존 기능 회귀 | 두 base의 history400→400, 일반 이동·같은 페이지/페이지 간 목차 hash·focus·현재 분류/조상·키보드·검색/clear/초안제외·copy·theme·mobile 메뉴/분류·긴 코드 PASS. 브라우저 예외·실패 요청0. |
| 화면·독립 검토 | 최신 desktop-light/dark·mobile-category/post4장 생성. 개발자는 desktop-light와 mobile-category, Astra는4장 모두 직접 확인. Astra **READ-04 기능 gate APPROVED**. 보안/전체 게시 gate는 승인하지 않았다. |
| 개발 환경 | `docker compose up -d blog` exit0, compose ps에서 Up 및 `127.0.0.1:4321→4321` 확인. 로그의 Astro5.18.2 ready와 파일 감시 확인. 호스트 의존성 설치·Git 생성·배포 없음. |

**기능 구현·인수 검사는 완료했지만 S04는 부분 완료다.** 문서·Astra 기능 검토·개발 서버 복원은 완료했고, 새 의존성 advisory2건 때문에 필수 전체 검증/보안 게시 조건은 미해결이다. 별도 호환성 검토와 의존성 수정 후 전체 verify를 통과해야 S04를 닫는다. 이전 실패와 완료 이력은 보존한다.

독립 live 개발 서버 검사도 **exit0**이었다(`artifacts/smooth-dev-proof.json`). 실제 `#tags`의 ICS 링크에서 1440px은 y600→중간38프레임→0, 390px은 y2068→중간45프레임→0이었다. 두 화면 모두 교체y0·동일 document marker·모든 관찰 프레임 opacity1/transform없음·브라우저 예외0을 확인했고, 검사 중 소스 빌드는 실행하지 않았다.

관찰된 기존 제약: `src/pages/archive.astro`는 `ArchivePanel`을 `client:only="svelte"`로 렌더하고 필터는 클라이언트에서 초기화한다. 처음 모듈을 불러오는 개발 환경에서 교체 container의 CSS는 즉시 보이더라도 실제 글 목록 렌더 전에 잠깐 빈 main이 관찰됐다. READ-03의 첫 프레임 검사는 container 스타일 가시성의 근거이며 이 cold client-only 콘텐츠의 첫 렌더 완료 근거가 아니다. READ-04 상향 스크롤 기능 승인은 유지하지만, archive 실제 본문까지 항상 교체 첫 프레임에 있다는 보장은 확인하지 못했다. SSR 전환·태그 route 재설계는 이번 범위에서 구현하지 않았다. 독립 개발 화면 자료는 글 DOM이 보인 뒤 재촬영하며 첫 프레임의 증거로 사용하지 않는다.

## 후속 수정: 페이지 전환 연출 제거 (READ-03)

- [x] M01: AGENTS·Swup 설정·전환 CSS·레이아웃·기존 검증을 조사하고 현재 계약/수정 계획을 갱신한다.
- [x] M02: Astra 설계 검토로 페이지 연출만 제거하고 조작 피드백·Swup 탐색 기능을 유지하는 범위를 확인한다.
- [x] M03: 페이지 fade/slide·등장/stagger·scroll 연출과 보조 지연 처리를 제거한다.
- [x] M04: 지연 응답·첫 프레임·history/focus/TOC/선택 상태 회귀 검사를 구현하고 Docker 필수 검증을 실행한다.
- [x] M05: 현재 설계·운영 문서·실제 결과를 갱신하고 Astra 최종 검토를 받는다.

초기 실행 제한: 2026-10-23 Docker 서버 버전 조회가 `dockerDesktopLinuxEngine/v1.55/version`의 HTTP 500으로 실패했다. 실행 중 개발 컨테이너 상태도 확인되지 않아 강제 종료·호스트 도구 대체 없이 소스/문서 작업을 먼저 진행했다. 사용자의 엔진 재시작 후 아래의 설치본 확인과 실행 검증을 수행했다.

### 이번 수정의 실행 기록

- 사용자의 Docker Desktop 재시작 후 Linux 엔진이 회복됐다. `docker compose ps --all`에서 기존 개발 서비스는 Exited(143)였고 활성 개발 서버 없이 검증했다. 호스트 Node/pnpm은 실행하지 않았다.
- 설치된 `@swup/astro` 1.8.0의 `src/index.ts`와 `src/script.ts`로 `animationClass: false`의 명시적 지원과 `smoothScrolling: false`의 ScrollPlugin 제외를 확인했다. 기존 Swup core는 behavior:auto top/anchor와 native history 복원을 유지한다.
- 변경 전 정적 산출물에 새 `pnpm test:browser`를 적용했다. 첫 실행은 응답 대기 해제와 context 종료가 겹친 테스트 cleanup 오류(exit1)였다. cleanup에서 route 완료를 기다리도록 수정한 재실행은 응답을 300ms 대기시키는 동안 기존 본문이 보이지 않는다는 정확한 READ-03 assertion으로 실패(exit1)해 결함을 재현했다.
- 구현 후 읽기 전용 lint95파일은 통과했다. 첫 Astro check는 등장 지연 style을 제거한 PostCard 호출에 기존 필수 style prop이 없다는 1오류로 실패했다. 실제 선택 입력에 맞게 `style?: string`으로 수정했다. 이후 전체 verify의 Astro62파일 오류/경고/hint0, 단위13개 통과를 확인했다.
- `TOC.astro`의 초기화가 `.prose` animationend를 기다리는 연관 의존성을 확인해 연결 시 초기화로 바꿨다. 지속되는 TOC wrapper의 capture listener도 같은 capture 옵션으로 해제한다. 실제 목차 hash/위치/현재 section 검사와 페이지 간 hash 검사를 추가했다.
- 첫 전체 verify(`e8334c6b-16e9-4c8d-9981-b20b7ed090bf`, UTC09:56:30~09:59:03, 152.7초)는 lint95/CMS/타입62/단위13/source107/감사 정책 known15·unknown0/세 base 각34페이지·2620참조를 통과했지만 브라우저 history 스크롤 복원에서 실패(exit1)했다. 페이지번호와 카테고리의 지연 응답/첫 프레임 검사는 통과했다. 로그는 `artifacts/motion-verify.log`다. 원시 audit exit1(low4/moderate8/high3/critical1)은 이번 수정으로 바꾸지 않았다.
- focused `pnpm test:browser` 진단에서도 실패(exit1)했다. 클릭 직전 visit:start y400·클릭 대상 bbox y222(화면 안)를 확인했지만 뒤로가기는 y297, scrollRestoration=auto였다(`artifacts/motion-browser-diagnostic.log`). 클릭 자동 스크롤의 테스트 오류가 아니라 더 짧은 기존 DOM에서 native 복원이 제한되는 실제 회귀로 판단해, 애니메이션 없는 ScrollPlugin의 명시적 위치 복원으로 접근을 바꾼다.
- Astra의 재설계 gate 승인을 받은 뒤 기존 공개 client export로 ScrollPlugin을 한 번만 연결하고 `animateHistoryBrowsing: true`로 manual 복원을 활성화했다. 페이지 animationClass:false는 그대로이며 scroll의 betweenPages/samePageWithHash/samePage 옵션도 모두 false다. 설치 README는 animateScroll boolean false를 허용하지만 설치 타입은 객체만 받아 check1오류가 발생했으므로 같은 문서의 지원 객체 형태로 세 옵션을 명시했다. 타입 단언이나 검사 비활성화로 숨기지 않았다. Window의 잘못된 AstroIntegration 타입도 기존 공개 client/Swup 타입으로 바로잡았다.
- 보완 후 전체 verify(`b9fc1bf6-cb10-424c-8f60-45e6d048521c`, UTC10:05:11~10:07:41, 149.3초)는 lint95/CMS/타입62오류0·경고0·hint0/단위13/source107/감사 known15·unknown0/세 base 각34페이지·2620참조를 다시 통과했다. 브라우저에서도 기존 y400→복원 y400, 페이지·카테고리·글의 대기 중 가시성과 교체 첫 프레임이 통과했다. 이 전체 실행은 신규 hash 테스트의 locator 오류로 최종 exit1이었다(`artifacts/motion-verify-final.log`).
- hash 테스트는 링크 href를 바꾼 뒤 이전 href 조건의 locator를 다시 평가해 다른 링크를 눌렀다. 첫 prefix selector 보완 후 focused 실행도 exit1이어서 원인을 재평가했다. hash setter가 href attribute를 상대→절대 URL로 직렬화한다는 실제 출력과 click/visit/교체 진단을 확인했다. 고정 data attribute locator로 수정한 실행에서는 페이지 간 hash·위치·첫 프레임·포커스가 통과했다(`artifacts/motion-hash-diagnostic.log`). 이어 소개 링크의 데스크톱/모바일 두 요소에 대한 strict locator 오류(exit1)를 데스크톱 첫 링크 한정으로 수정했다. 이 과정에서 앱 소스·번들은 변경하지 않았고 이미 통과한 빌드를 반복하지 않았다.

### 최종 검증 결과 (READ-03)

마지막 앱 소스는 전체 verify `b9fc1bf6-cb10-424c-8f60-45e6d048521c`에서 검사·빌드한 소스와 같다. 이후 수정은 브라우저 테스트의 링크 선택과 진단 출력뿐이다. 최종 영향 검사 `docker compose run --rm --no-deps blog sh -c 'pnpm format && pnpm lint && pnpm test:browser'`는 **exit0**으로 완료했다. 근거는 `artifacts/motion-browser-confirmed.log`와 최신 `artifacts/screenshots/`의 4장이다. 앞선 전체 verify의 **exit1**을 전체 exit0으로 바꾸어 보고하지 않는다. 통과한 필수 단계와 수정 후 재실행한 브라우저 단계의 결과를 아래처럼 분리한다.

| 검사 | 실제 최종 결과와 근거 |
| --- | --- |
| 형식·Lint | Docker Biome95파일 PASS. 최종 영향 검사에서도 읽기 전용 lint exit0. |
| CMS·타입·콘텐츠 | CMS 단일 분류 설정 일치 PASS. Astro62파일 오류0·경고0·hint0. |
| 단위 | Node13개 PASS, 실패/건너뜀0. |
| 소스 보안·의존성 정책 | source107파일 PASS. 알려진15 advisory·신규0으로 기존 위험 검토 정책 PASS. 원시 audit는 exit1(low4/moderate8/high3/critical1)이며 무취약 상태가 아니다. 보안 정책·의존성·lockfile은 이번 수정에서 바꾸지 않았다. |
| 생산 빌드·정적 결과 | `/`, `/blog/`, `/posts/` 각각34페이지·Pagefind 생성·2620개 내부 링크/에셋 참조 PASS. 동일 소스의 성공 결과를 재사용했다. |
| 지연 응답·즉시 표시 | 루트와 `/blog/` 각각 페이지2/분류/글/페이지 간 hash/소개/모바일 메뉴 이동/모바일 분류 이동, 총14회 PASS. 실제 응답을300ms 보류한 동안 기존 본문·사이드바 opacity1/transform없음 유지, content:replace 및 새 프레임 즉시 가시성, 페이지 CSSAnimation없음을 확인했다. |
| 탐색·스크롤·접근성 | 두 base에서 y400→뒤로가기 y400 복원, 일반 이동 직후 y0, URL/카테고리 aria-current·조상 펼침, Enter/Space, 교체 후 body 포커스 PASS. 같은 페이지·페이지 간 목차 hash, heading의 viewport 위치와 현재 section 표시 PASS. |
| 기존 조작·반응형 | 실제 Pagefind 검색/clear/무결과/초안 제외, clipboard와 복사 성공 피드백, 테마, 태그·소개,390px 메뉴/분류·긴 코드 내부 스크롤 PASS. 두 base 모두 브라우저 예외와 실패 에셋/검색 요청0. |
| 화면 자료 | 최신 desktop-light/dark·mobile-category/post PNG를 생성했다. 개발자가 desktop-light와 mobile-category를 직접 열어 카드·분류 선택/조상·태그·footer 표시와 기존 레이아웃을 확인했다. Astra도 최신4장을 직접 열어 데스크톱 양 테마와 모바일 분류/글/코드/이미지/footer를 확인했다. |
| 독립 최종 검토 | Astra **APPROVED**. 현재 소스·설계·두 base14개 navigation·history400→400·페이지 간 hash와 최신4장 화면을 직접 대조했다. 전체 verify exit1 이력과 테스트만 수정한 뒤 영향 검사 exit0의 분리 기록도 확인했다. |

현재 계약은 spec.md의 READ-03, 설계 결정은 architecture.md의 페이지 이동 항목, 변경 방법과 복구 범위는 plan.md, 사용자가 실행할 명령은 README에 맞춰 갱신했다. 원래 블로그·CMS 완료 이력과 이번 실패/보완 이력은 보존했다. 추가 빌드·검사를 개발 서버와 동시에 실행하지 않는다. 커밋·원격 푸시·PR·게시·배포는 수행하지 않았다.

READ-03의 구현·필수 검사와 독립 최종 검토는 완료했다. Astra는 이 완료 문서까지 실제 근거와 대조해 최종 **APPROVED**했으며 추가 수정 요청이 없었다.

### 상위 작업의 실제 개발 서버 추가 확인

- `docker compose up -d blog`로 개발 서버를 시작한 뒤 컨테이너에서 `node artifacts/motion-dev-probe.mjs`를 실행해 **exit0**을 확인했다. 생산 빌드나 Astro check를 동시에 실행하지 않았다.
- 실제 개발 서버의1440px/390px 화면에서 홈페이지200→보안 카테고리 Swup 이동, 동일 document marker 유지, 현재 분류1개, main/sidebar/content의 opacity1·animation없음·transform없음, 브라우저 예외0·개발 toolbar0을 확인했다.
- 근거는 `artifacts/motion-dev-proof.json`, `artifacts/screenshots/motion-dev-1440.png`, `artifacts/screenshots/motion-dev-390.png`다. 상위 작업도 생산 desktop-light/mobile-category를 직접 열어 레이아웃·선택 상태·실제 footer 표시를 확인했다.
- 개발 서버는 기존 loopback 공개 설정의 `http://127.0.0.1:4321/`에서 실행 중으로 유지한다. 실제 원격 게시·배포는 수행하지 않았다.

## 작업

- [x] T01: AGENTS.md와 초기 디렉터리를 확인하고 초기 상태를 기록한다.
- [x] T02: 기능 명세, 구현 제안, 검증 가능한 작업 목록을 작성한다.
- [x] T03: 원본 Fuwari 소스와 commit·라이선스·기술 스택·검증 명령을 확인한다.
- [x] T04: 상세 설계 검토 결과와 Docker 상태를 반영하여 plan.md를 확정한다.
- [x] T05: Docker Linux 실행 환경, 비루트 사용자, named volumes, loopback 개발 포트와 고정 도구 버전을 구성한다.
- [x] T06: 초기 설치·검사 시도와 기준선의 한계를 기록한다. 소스 수정과 겹쳐 pristine 원본 검사 결과는 확보하지 못했다.
- [x] T07: 한국어 사이트 설정·프로필·소개·합성 콘텐츠를 원본 테마에 적용한다.
- [x] T08: 단일 카테고리 정의·참조 검증·자손 집계·안정 경로·breadcrumb를 구현하고 중요한 로직을 테스트한다.
- [x] T09: 접근 가능한 카테고리 disclosure와 현재 위치·모바일 표시를 구현한다.
- [x] T10: 공통 공개 글 경계와 직접 페이지·피드·검색·사이트맵의 초안 제외를 구현하고 검증한다.
- [x] T11: root/project base URL 일관성과 페이지네이션·태그·검색·독서 기능을 확인한다.
- [x] T12: 공통 verify·컨테이너 브라우저 테스트·CI·Pages 산출물 구성을 추가한다.
- [x] T13: README·현재 architecture·security-spec·원본 출처와 개인화 문서를 작성한다.
- [x] T14: 필수 검사와 인수 조건 대조, 최종 설계 검토를 수행하고 결과·남은 한계를 기록한다.

## 확인 근거

| 시점/작업 | 실행/관찰 | 결과 |
| --- | --- | --- |
| 초기/T01 | PowerShell `Get-Location`, AGENTS.md 읽기, 숨김 포함 루트 목록 | 작업 경로 확인. 루트에는 AGENTS.md만 있으며 앱·Git·검사 설정이 없다. |
| 초기/T02 | 명세·계획·작업 문서 작성 | 구현 전 문서 초안. 실제 앱 검사나 빌드 성공을 의미하지 않는다. |
| 소스/T03 | package.json·Astro 설정·content schema·분류/공개 글 helper·Widgets/Layout·RSS/robots 조사 | Astro 5.13.10, pnpm 9.14.4. 원본은 개발 시 초안 포함, 평면 category, sidebar Swup 대상 누락, base 불완전 RSS/robots를 확인했다. 원본 commit `6d39b0dec41282e7852e23e032998a5789abee28`. |

## 현재 완료 상태와 미실행 범위

- Docker Linux 엔진·이미지 빌드·fresh-volume 비루트 설치와 실제 앱 검증을 수행했다.
- Astra의 상세 설계·후속 소스/문서·최종 시각 검토를 반영하고 최종 승인을 받았다.
- 최종 자동 통합 검증과 독립 시각 검토, 실제 Windows Markdown/public 생성·삭제 반영 검사를 완료했다.
- Spec Kit: 미설치를 확인했고 이 문서 체계를 사용했다. 설치·실행했다고 보고하지 않는다.
- 커밋·푸시·배포·원격 보호 설정: 요청 범위 밖이며 수행하지 않는다.

## 구현·수정·검증 이력

| 작업 | 실제 명령/관찰 | 결과와 한계 |
| --- | --- | --- |
| Docker 환경 | `docker compose build`; fresh-volume `docker compose run --rm blog sh -c 'id && pnpm install --frozen-lockfile && pnpm check'` | 이미지 빌드·uid1000 node·frozen 설치 PASS. 첫 check는 진행 중 스키마 변경과 원본 샘플의 categoryId 누락으로 실패. pristine 원본 기준선으로 보고하지 않는다. |
| 분류와 공개 모델 | Node test runner의 단위 5개, 실제 collection 검사 | 깊이5·동명·부모 직접글·중복 글·빈분류·순환/참조오류·초안·태그중복·경로충돌 PASS. |
| 타입 수정 | `pnpm check` | 기존 Svelte props/client directive와 변경 후 unused ts-expect-error를 실제 타입에 맞춰 수정했다. 이후61파일 오류0·경고0·hint0. 검사 비활성화로 숨기지 않았다. |
| 원본 스타일 연결 | 첫 생산 build의 Tailwind `link` 클래스 오류 추적 | 원본 GlobalStyles가 비어 있고 Layout imports가 없어 원본 스타일을 연결했다. 재발 시 ImageWrapper의 전체 파일 glob이 CSS를 개별 동적 이미지 import로 처리함을 확인해 이미지 확장자로 제한했다. 이후 검증 기록은 최종 아래에 남긴다. |
| 상대 이미지 피드 | root artifact 검사 | 첫 `?url` SVG는 data URI로 인라인되어 feed sanitizer가 src를 제거했다. `?url&no-inline`로 빌드 asset을 만들고 글 폴더 상대SVG fixture와 실제 RSS URL 검사를 추가했다. |
| 초기 전체 통과 | `docker compose run --rm blog pnpm verify`, job `bc0c98b1-948b-4eeb-9fd5-36aae998ec23` | 107.7초, exit0. lint83, Astro61, 단위5, source와 감사 정책, 세 base 각33페이지·2510링크, root/project 실제 Chromium 상호작용 PASS. 이후 작은 수정과 snapshot 안정화가 있어 최종 결과로 대체하지 않는다. |
| 의존성 감사 | `pnpm audit --prod --json`, `pnpm why sharp` (모두 Docker) | 원시 감사 exit1: low4/moderate7/high3/critical1, 고유14개. 알려진 적용 조건과 완화는 security-spec에 기록. 정책 runner는 unknown0으로 PASS지만 raw audit clean 상태는 아니다. 모든 Sharp 경로0.35.5 확인. |
| CI 구문 | 컨테이너 안 @rollup/plugin-yaml parser로 `.github/workflows/verify.yml` 읽기 | YAML parse exit0. 원격 GitHub Actions/Pages 실행·환경권한·브랜치보호는 미검증/미설정이며 실제 게시도 하지 않았다. |
| 시각 검토 1 | desktop-light/dark, mobile-post/category PNG | 데스크톱·글 카드·모바일 코드 스크롤을 확인했다. 분류 사진은 Swup 중간 애니메이션으로 빈 공간이 보여 캡처 전 Swup/임시높이 종료·폰트·animation·sidebar opacity·실제 tree/footer 가시성 대기를 추가했다. |

## 역할과 파일 범위

- GPT-6.1 Sol 주 개발/통합: 기능 명세·계획·전체 앱 구현·Docker/검증 스크립트·CI·운영 문서·테스트.
- GPT-6 Astra: 구현 전 상세 설계와 후속 소스/문서/최종 시각 증거 검토. 직접 소스 수정 없이 발견 사항을 주 개발자에게 전달했다.
- 상위 통합 작업: 원본 획득·Docker 실행 허용/설치 검증, 패키지·lockfile의 분리된 호환 보안 갱신, 독립 실행/시각 검토. 패키지 소유권을 반환한 후 동시 편집하지 않았다.
- 사용자 AGENTS.md는 보존했고 원본 README·게시 예시·이미지·workflow는 docs에 보존했다. 자동 승인 검토가 원본 게시물 일괄 삭제를 손실 위험으로 거부하여 삭제 없이 문서 자료로 이동하는 안전한 방법으로 처리했다. 이 거부로 남은 차단 항목은 없다.

## 최종 자동 검증 결과

- 명령: `docker compose run --rm blog pnpm verify` (Linux Docker, 최신 이미지의 비루트 node).
- 최종 작업 ID: `0af9f3ec-476e-40b3-a85e-8c864303c9d4`.
- UTC 실행: 2026-10-22 18:18:20 ~ 18:19:57 (KST 2026-10-23 03:18:20 ~ 03:19:57), 96.7초, **exit0**.
- Biome: 소스·테스트·스크립트·루트 설정88파일, 수정 없는 읽기 전용 검사 PASS.
- Astro/콘텐츠 타입:61파일, 오류0·경고0·hint0.
- Node 단위 검사:5개 PASS, 실패/건너뜀0.
- source 보안:106파일, 비밀정보 패턴/AVIF 거부 검사 PASS. dependency risk 정책: 알려진14개·신규0, PASS. **원시 pnpm audit exit1**(low4/moderate7/high3/critical1)은 계속 남는다.
- `/`, `/blog/`, `/posts/`: 각33페이지 생산빌드+Pagefind 생성 PASS. 정적 href/src/srcset·canonical·RSS alternate·robots·sitemap·루트/상대 이미지·초안canary 검사 PASS(루트2510, 프로젝트/충돌각2456참조).
- 실제 Chromium: 루트와 `/blog/`의 홈페이지 페이지2, 하위집계/빈분류, Enter/Space disclosure, Swup 이동/뒤로가기/선택조상, breadcrumb, 실제clipboard, 목차, 테마, Pagefind검색/clear/무결과/초안제외, 태그·소개,390px 가로넘침/코드스크롤/모바일메뉴 PASS. 브라우저 예외/실패에셋요청0.
- 안정화된 스크린샷: `artifacts/screenshots/desktop-light.png`, `desktop-dark.png`, `mobile-category.png`, `mobile-post.png`. Swup/임시높이·폰트·유한animation 종료와 sidebar/categories opacity1, tree/footer 가시성을 기다린 결과다.
- 워크플로 YAML parse: 설치된 parser를 Docker에서 사용, exit0. 실제 원격 Actions/Pages·Linux GitHub runner 전체 실행은 하지 않았다.

최종 전체 자동 검사 이후 독립 검토에서 발견한 스크린샷 paint와 개발 watcher만 제한적으로 보완하고 해당 범위의 focused 검증을 수행했다. 생산 동작 로직은 변경하지 않았다. 독립 검토와 Windows 개발 재검증의 최종 결과는 아래에 기록한다.

## 최종 독립 검토와 focused 검증

- 최신 4장에 대한 Astra/상위 시각 검토에서 모바일 분류 트리·조상·선택·footer, 모바일 글/코드/이미지, desktop 카드/밝기/팝업 닫힘을 확인했다.
- desktop fullPage PNG의 viewport 밖 footer가 비어 보여 실제 Chromium DOM/ancestor clip을 조사했다. footer는 y1948,height81이며 모든 ancestor의 opacity1/visible, main clip 내부였다. scrollIntoView한 `artifacts/screenshots/desktop-footer.png`에서는 저작권/RSS/Sitemap/Astro/Fuwari가 실제 paint됨을 확인했다. 결과는 `artifacts/footer-probe.json`에 보존한다.
- snapshot helper는 footer까지 스크롤하여 offscreen paint를 확정하고 두 animation frame 뒤 top으로 돌아온다. 이 캡처 보완 후 `pnpm format`, 읽기 전용 `pnpm lint`, `pnpm test:browser`를 Docker에서 실행해 두 base 모두 exit0으로 통과하고 4장 사진을 다시 만들었다.
- Windows 개발 A/B 검사: polling true의 새 public 파일 생성200/삭제404 반영은 PASS했지만 동시 SSR 첫 요청이 장기 대기했다. polling false에서는 home200/about200이 각 초기약10.5초에 응답하고 idle CPU가 낮아졌다. 따라서 Vite watcher에서 생성물/기록/의존성9개 디렉터리를 명시적으로 제외하고 src/public polling은 유지했다. watcher 변경 후 Docker lint88파일 exit0. 실제 기본 polling 개발 페이지 재검사는 상위 작업에서 진행한다.

### 개발 콘텐츠 반영 추가 진단

강화된 Windows 검사에서 새 public 파일은200으로 보였지만 새 Markdown은 loader reload 로그 이후에도 홈페이지 marker 미포함·직접 경로404였다. 설치된 Astro 코드의 `content/vite-plugin-content-virtual-mod.js`는 `.astro/data-store.json` 변경을 직접 관찰해 데이터/경로 캐시를 무효화한다. 따라서 앞선 watcher 제외 목록의 `.astro/**`가 필수 프레임워크 이벤트를 막는 것을 확인했다.

별도 재시작 plugin을 잠시 구현했으나 프레임워크의 정상 무효화 경로가 확인되어 실행 검증용 소스로 남기지 않고 완전히 제거했다. 최종 수정은 `.astro/**`만 ignored에서 제거한 최소 변경이다. polling은 유지하고 다른 생성물·문서·의존성8개 디렉터리 제외도 유지한다. 최종 config의 Docker 읽기 전용 lint88파일 exit0, Astro61파일 오류/경고/hint0. 더 강한 실제 콘텐츠 생성/삭제 반영 검사를 이어간다. 임시 probe 콘텐츠와 public 파일은 매번 finally 정리되어 원본 소스에 남지 않는다.

## 최종 완료 판단

- Astra의 최종 소스·문서·시각 검토 **APPROVED**. 모바일 분류/선택 조상/footer와 글/코드/이미지, desktop 밝기/카드/프로필을 확인했고 desktop footer도 실제 scroll/paint 증거로 확인했다.
- `.astro` 필수 감지를 복구한 기본 polling 설정의 **강화 Windows probe PASS**(상위 실행 근거 `8ad235`, exit0). 기존 홈페이지를 먼저 요청해 캐시를 만든 후 Windows에서 유효한 합성 Markdown과 public text를 생성했다. 두 번째 확인에서 홈페이지200+새 제목 포함, 새 글 직접 경로200+동일 제목, public 파일200+정확한 marker가 모두 확인됐다. 개발 서버 재시작 없이 반영됐다.
- 임시 두 파일을 finally 삭제한 후 홈페이지 marker 소멸, 직접 글404, public 파일404도 PASS. 남은 임시 파일이 없음을 확인했고 개발 서비스는 검증 후 종료한다.
- Docker Desktop의 턴 사이 엔진 시작 지연은 회복됐다. 플랫폼 전환·호스트 Node/pnpm/Python 설치나 우회 없이 기존 Linux 엔진에서 이어서 검증했다. 남은 실행 차단 사항은 없다.
- 생산 전체 verify exit0 이후 개발 watcher에 한정한 최소 변경은 lint88·Astro61 오류0과 실제 생성/삭제 요청으로 추가 검증했다. 완료된 생산 3base·브라우저 검사를 이유 없이 반복하지 않았다.
- **의존성 원시 audit는 여전히 exit1**이며 low4/moderate7/high3/critical1(고유14 advisory)이 남는다. 알려진 적용 조건과 Sharp0.35.5 등 완화 근거는 `docs/security-spec.md`와 감사 JSON에 기록한다. 의존성 무취약 또는 원시 감사 통과라고 보고하지 않는다.
- 실제 GitHub 원격 CI/Pages 게시·원격 보호 설정은 실행하지 않았다. 게시 가능한 수동 workflow와 실제 실행 절차를 준비했으며 로컬 YAML parse까지 확인했다. commit·push·배포를 임의 실행하지 않았다.

기능 요구사항·소스·계획·운영/보안 문서·실제 검증 결과를 대조했다. 구현 범위는 완료됐으며 남은 알려진 의존성 위험과 미실행 원격 작업을 위와 같이 분리해 보고한다.
