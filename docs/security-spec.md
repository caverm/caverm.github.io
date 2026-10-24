# 공통 보안 요구사항과 잔여 위험

이 사이트는 신뢰된 저장소 작성자가 만든 정적 HTML만 배포한다. 방문자 입력은 브라우저의 로컬 Pagefind 검색뿐이며 빌드 서버로 전달되지 않는다. 사이트에 관리자 인증 서버·DB·개인정보 저장·방문 추적·방문자 업로드를 추가하지 않는다. 작성자는 hosted Pages CMS의 GitHub 인증/App 권한을 통해 글·분류·이미지를 저장소에 쓸 수 있다. 원본 Markdown·설정·CMS 업로드 이미지는 실행 가능한 사이트 소스와 같은 신뢰 수준이며 외부 익명 작성자를 받는 경로가 아니다. 초기 검증 당시에는 GitHub 저장소/CMS 연결이 없었다. 현재 GitHub 저장소와 CI 실행은 확인했으며 hosted CMS 연결과 권한 설정 상태는 이번 수정에서 확인하지 않았다.

| ID | 적용 대상과 기대 동작 | 검증 |
| --- | --- | --- |
| SEC-DATA-01 | 카테고리 ID는 안전한 고유 ASCII 값, 부모 그래프는 유효하고 모든 글은 정확히 한 유효 카테고리를 참조한다. 초안도 검증한다. | taxonomy 단위/실제 collection 빌드 |
| SEC-PUB-01 | 초안은 직접 경로·모든 목록·인접 글·분류·태그·검색·RSS·sitemap에 포함되지 않는다. | 공개 필터 테스트, 모든 산출물 canary 검사, 직접 URL404·실제 Pagefind 음성 검사 |
| SEC-SECRET-01 | 코드·예시·로그에 실제 비밀정보·개인정보를 추가하지 않는다. 예시는 합성임을 표시한다. | source secret pattern 검사와 변경 검토. 패턴 검사는 완전한 비밀 탐지를 보장하지 않는다. |
| SEC-ASSET-01 | 신뢰된 작성자의 검토한 저장소 이미지만 받는다. CMS 업로드는 PNG/JPG/JPEG/WebP/GIF로 제한하고 SVG/AVIF는 제외한다. 기존 검토된 로컬 SVG는 유지한다. AVIF 확장·헤더는 source에서 거부한다. Sharp는 전 경로0.35.5다. | 생성 media 설정/단위 검사, dev 시작·생산 build·verify source 검사, audit 정책 lockfile 검사, pnpm why sharp. 실제 hosted 업로드는 연결 후 검사 |
| SEC-HTML-01 | 카테고리·제목은 템플릿의 기본 escaping을 사용한다. 피드 HTML은 sanitize-html로 제한한다. untrusted raw HTML·MDX는 지원하지 않는다. | 템플릿 검토, feed 생성 검사. Markdown 작성자는 저장소 관리자 신뢰 경계다. |
| SEC-ENV-01 | 모든 Node/pnpm 작업은 Linux Docker, 앱은 비루트, 개발 포트는 호스트 loopback만 공개한다. 의존성과 캐시는 named volume이다. | fresh-volume 설치의 id 확인, compose 설정·컨테이너 명령/접속 검사 |
| SEC-DEP-01 | 고정 lockfile frozen 설치·의존성 감사를 실행한다. 새 advisory, 손상된 감사 응답, 알려진 완화 전제 위반은 실패시킨다. | audit.mjs와 생성된 dependency-audit JSON, 아래 개별 위험 기록 |
| SEC-CONTENT-02 | 신뢰된 정적 빌드의 글 태그는 최대64개다. 초과 배열은 Zod 원소 검사 전에 fatal 오류 하나로 거부한다. src/public의 코드·Markdown·JSON/YAML·스타일·텍스트는 파일별1MiB를 읽기 전에 검사하고 초과 시 check/dev/build/verify가 실패한다. 이미지는 이 텍스트 한도에서 제외한다. | 실제 공용 tagsSchema의63/64/65개·백만 길이 sparse 배열 getter0/오류1개, 실제 source preflight·대소문자·이미지 제외 회귀, 감사의 입력 경계 guard |
| SEC-LOG-01 | 로그에는 고정 명령·종료 코드·시간·작업 ID만 추가하고 전체 환경·개인정보·본문을 덤프하지 않는다. 보관량과 접근을 제한한다. | 정상/실패 verify 로그·Compose logging 설정·README 운영 방법 |
| SEC-CMS-01 | CMS action은 main의 실제 GitHub ref와 known source/action/repository/ref를 검증한다. triggeredBy는 권한 증명이 아니다. 게시 요청은 고정 verify.yml/publish=true를 사용한다. | 합성 action 허용/거부 단위 검사와 workflow 정책 검토. 실제 App/dispatch 권한은 연결 후 확인 |
| SEC-CMS-02 | 전체 payload/계정정보를 runner env·출력·artifact에 복사하지 않는다. GITHUB_EVENT_PATH 단일 파일을 Docker에 readonly mount하여 읽고 고정 오류 코드만 출력한다. | 성공·잘못된 ref·손상된 event의 합성 개인정보 비노출 회귀 검사와 workflow 검토 |
| SEC-CMS-03 | 선택지 갱신은 검증 후 생성 .pages.yml만 일반 push하고 verify를 publish=false로 명시 요청한다. 강제 push·보호 우회는 없다. 최소 job 권한과 기존 검증→게시 게이트를 유지한다. | workflow 검토, 로컬 생성/stale/graph 검사. 원격 branch 보호와 bot push는 연결 후 확인 |

## 의존성 검토 범위와 결과 해석

가져온 lockfile의 원시 생산 의존성 감사는 low23/moderate106/high123/critical4를 보고했다. 호환 major 범위에서 Astro5.18.2·Svelte5.57.2 등과 전이 패치를 갱신하고 `sharp: 0.35.5`, `serialize-javascript: 7.0.5` override를 적용했다. 모든 Astro 경로도 실제 Sharp0.35.5를 사용하는 것은 컨테이너 `pnpm why sharp`로 확인했다. 버전 고정의 기준은 package.json·pnpm-lock.yaml이다.

현재 원시 `pnpm audit --prod --json`은 **비영 종료**이며 알려진 advisory가 남는다. 최초 검토 snapshot은 low4/moderate7/high3/critical1, 고유 advisory14개였다. 2026-10-23 CMS 검증에서 새 JSX/MDX advisory가 검출되어 원시 결과가 low4/moderate8/high3/critical1, 고유15개로 늘었다. 전체/요약 결과와 rawAuditExitCode는 `artifacts/dependency-audit*.json`으로 다시 생성한다. 원시 audit 통과나 무취약 상태라고 보고하지 않는다.

2026-10-24 READ-04 재검증에서는 감사 응답이 바뀌어 known14·unknown2, raw exit1(low5/moderate8/high3/critical1)을 보고했고 **의존성 정책 검사와 전체 verify가 실패했다**. 신규 항목은 [Zod GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)(high)와 [serialize-javascript GHSA-m5mm-p8h7-m29v](https://github.com/advisories/GHSA-m5mm-p8h7-m29v)(low)다. 이전15개 검토 이력과 허용 목록은 그대로이며 새 예외를 추가하지 않았다. 당시 lockfile에는 Zod3.25.76/4.6.7과 serialize-javascript7.0.5가 있었다. Zod의 공식 수정4.6.6으로 v3 계열을 강제 교체하려면 Astro 도구체인의 호환성 검토가 필요하다. serialize-javascript의 수정7.1.3도 별도 의존성 변경으로 검토한다. 이번 스크롤 수정은 의존성·보안 정책을 바꾸지 않으며 기능 검사 결과가 보안 게시 조건의 통과를 뜻하지 않는다. 실제 실패 근거는 `artifacts/scroll-verify-resumed-final.log`와 최신 감사 JSON, 후속 기능 검사 결과는 `specs/personal-blog/tasks.md`를 참조한다.

`audit.mjs`는 원시 결과를 저장하고 아래에 검토한 정확한 GHSA ID만 현재 제한된 적용 조건으로 분류한다. 새 ID·감사 조회 실패·정적 사이트 전제 위반·Sharp 완화 손실은 실패한다. 이것은 취약점 수치를 숨기는 severity 하향이나 audit 비활성화가 아니다. 원시 실패와 검토한 잔여 위험을 분리해 결과에 표시하는 정책이다. SSR·사용자 업로드·외부 기여를 무검토 빌드하는 자동화·임의 정규식/CSS/수식 입력을 추가하기 전 재검토한다.

## 알려진 개별 잔여 위험

2026-10-24 GitHub verify 실패 후 후속 수정에서는 serialize-javascript를 공식 패치7.1.3으로만 갱신했다. Zod는 Astro5와 호환되는3.25.76 및 기존4.6.7을 유지한다. [공식 v3 이슈6653](https://github.com/colinhacks/zod/issues/6653)에서 v3 신규 버전 미출시와 `.max()`의 계속되는 원소 파싱을 확인했으므로4 major를 강제 덮어쓰지 않았다. 아래 Zod 분류는 실제 입력 완화와 guard의 통과에 한정하며 원시 감사의 high 수준을 낮추거나 취약점을 패치했다고 간주하지 않는다.

| Advisory | 원시 수준 | 현재 적용 조건과 완화·남은 한계 |
| --- | --- | --- |
| [GHSA-26w7-cxv4-gfx2](https://github.com/advisories/GHSA-26w7-cxv4-gfx2) Astro AVIF 최적화 | critical | 원시 Astro 버전 범위는 남지만 취약한 기반 이미지 라이브러리는 모든 경로 Sharp0.35.5로 교체했다. 추가로 AVIF를 dev/build 시작 전에 거부하며 이미지 입력은 신뢰된 저장소로 제한한다. Astro 자체 advisory가 해소됐다고 주장하지 않는다. |
| [GHSA-2pvr-wf23-7pc7](https://github.com/advisories/GHSA-2pvr-wf23-7pc7) Host SSRF | high | SSR 요청/에러 fetch 서버를 배포하지 않는 static output이며 adapter가 없다. 서버 배포로 바꾸면 이 분류를 사용할 수 없다. |
| [GHSA-8hv8-536x-4wqp](https://github.com/advisories/GHSA-8hv8-536x-4wqp) slot 이름 XSS | high | slot 이름은 신뢰된 소스의 고정 값이며 외부 입력을 받지 않는다. 미신뢰 작성자를 지원하는 경우 재검토한다. |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) braces DoS | high | 빌드 glob 패턴은 고정된 저장소 소스다. 임의 패턴 입력은 없으며 상위 패치가 없는 현재 잔여 위험이다. |
| GHSA-j687-52p2-xcff, GHSA-jrpj-wcv7-9fh9, GHSA-f48w-9m4c-m7f5 | moderate | define:vars와 spread attribute 이름 XSS. 소스·설정은 신뢰된 관리자가 통제하며 외부 입력으로 JS 값·attribute 이름을 만들지 않는다. |
| GHSA-7pw4-f3q4-r2p2, GHSA-4g3v-8h47-v7g6 | low/moderate | Astro native View Transition 지시자 값 XSS. 현재 전환은 Swup이고 외부 입력으로 transition 값을 만들지 않는다. |
| GHSA-xr5h-phrj-8vxv, GHSA-376h-93r7-7g6f | low/moderate | server island replay 및 base 인증 우회. 정적 배포에는 server island·인증 middleware가 없다. |
| [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) esbuild | low | Windows 개발 서버 경로의 파일 읽기 위험. 모든 개발 서버는 Linux Docker에서 실행하고 호스트 loopback만 공개한다. |
| [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) KaTeX | low | 선행 prototype pollution이 필요한 trust 우회. 수식은 신뢰된 Markdown의 빌드 입력이고 방문자 수식을 실행하지 않는다. |
| [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) selector parser | moderate | 비정상적으로 큰 CSS 선택자의 CPU 소모. CSS는 고정된 신뢰 저장소의 빌드 입력이다. |
| [GHSA-98hj-9722-w3j8](https://github.com/advisories/GHSA-98hj-9722-w3j8) JSX/MDX script/style XSS | moderate | Astro<7.3.2에서 JSX/MDX의 script/style 동적 문자열 자식이 공격자 입력이면 XSS가 가능하다. 현재는 일반 Markdown·Astro·Svelte이며 해당 렌더 경로를 사용하지 않는다. audit guard가 src의 .mdx/.jsx/.tsx, astro:jsx/JSX runtime 참조, 관련 Astro integration을 deps/devDeps/optionalDeps나 config에 추가하면 실패한다. 미사용 경로를 강제하는 한정된 잔여 위험이며 Astro 버전을 패치했다고 주장하지 않는다. |
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) Zod 대형 컬렉션 메모리 소모 | high | Zod3 자체는 미패치 상태다. 현재 유일한 애플리케이션 컬렉션 입력인 글 tags는 공용 스키마의 preprocess가64개 초과 배열을 원소 접근 전 fatal/NEVER로 거부한다. check/dev/build/verify와 독립 감사는 텍스트1MiB 사전 검사를 유지한다. 감사는 실제 스키마에 원소 getter가 실패하는 초과 배열을 적용해 조기 거부를 검사하며 스키마 연결 제거, 새 collection/Zod import·원격 content loader·SSR/adapter·선행 guard 제거 시 실패한다. 신뢰된 작성자가 검토한 정적 저장소의 빌드에만 적용한다. |

### 2026-10-24 Zod 완화의 범위와 한계

공식4.6.6 패치는 상한이 있는 배열·Set·Map을 원소 파싱 전에 거부한다([upstream PR6652](https://github.com/colinhacks/zod/pull/6652)). v3의 `.max()`만 추가하면 같은 보호를 제공하지 않으므로 현재 앱이 실제 사용하는 tags 입력의 선행 preprocess를 구현했다. 기본값 `[]`·정상 문자열 배열·날짜·분류의 기존 계약은 유지한다. dev 시작 후 수정한 태그에도 이 스키마의 길이 거부가 적용된다.

이것은 모든 Zod 경로의 메모리 소모를 해결한 라이브러리 패치가 아니다. 파일 총량, 이미지 크기, YAML 파서의 별칭 확장, 빌드 도구 내부의 모든 컬렉션을 제한하지 않는다. 1MiB 검사는 시작·check·build·verify/감사 시 수행하며 dev 실행 중 변경되는 모든 파일의 크기를 실시간 감시하는 장치는 아니다. import/collection 정규식 guard는 신뢰된 소스의 새 입력 경로를 검토하도록 강제하는 변경 감지이며 임의 코드의 모든 우회 표현을 분석하지 않는다. 방문자 입력을 검증하는 API·SSR·새 Zod/collection/loader를 도입하거나 입력 신뢰 경계를 넓히기 전에 패치 또는 별도 보안 설계를 검토해야 한다.

감사 JSON은 정책 검사 전에 저장하고 요약에는 `checkedAt`, `policyStatus: pending/failed/passed`, 실패 시 `policyError`를 기록한다. 원시 audit의 비영 종료와 완화 전제 충족 여부를 별도로 읽어야 한다. 새 GHSA나 guard 실패는 계속 비영 종료한다. 이 후속 수정의 실제 전체 검증 결과는 `specs/personal-blog/tasks.md`를 참조한다.

### 2026-10-23 신규 advisory 검토

첫 CMS verify는 위 JSX advisory를 unknown1로 보고 보안 단계에서 정상 실패했다. [upstream 공식 advisory](https://github.com/withastro/astro/security/advisories/GHSA-98hj-9722-w3j8)의 적용 조건과 패치7.3.2를 확인하고, 소스 확장자·runtime import·manifest·Astro config에 해당 경로가 없음을 검토했다. Astro7 전환은 별도 호환성 검증이 필요한 큰 변경이므로 이번에는 `scripts/lib/audit-policy.mjs`의 미사용 경로 guard와 도입 시 실패하는 회귀 검사를 추가하고 정확한 GHSA ID만 검토 목록에 넣었다. gate 비활성화나 severity 하향이 아니며 원시 audit exit1과15 advisory는 계속 공개한다. 이 경로를 도입하려면 해당 취약점 패치 또는 별도 수정·위험 재검토가 필요하다. guard는 임의 코드의 모든 우회 표현을 탐지하는 보안 분석기가 아니며 신뢰된 작성자/검토된 소스 전제를 유지한다.

이 목록은 패치 완료 목록이 아니다. 라이브러리 업데이트/입력 신뢰/배포 방식 변경 시 원시 audit와 적용 조건을 다시 확인한다. 장기 해결은 원본 테마 호환성을 확인한 Astro 차기 major 마이그레이션과 남은 도구의 상위 보안 패치다.

## 공개·운영 경계

정적 산출물만 Pages artifact로 올린다. 초안·원본 설정·README·이 문서·감사 보고서·테스트·Docker 파일을 사이트 루트로 공개하지 않는다. GitHub 저장소 자체를 공개하면 원문과 초안은 GitHub에서 읽힐 수 있으므로 비밀정보 보관소로 사용하지 않는다. 도메인·프로필은 예시이며 실제 배포 전 설정을 확인한다. 실제 Pages 배포나 원격 권한·보호 설정 변경은 이번 구현 중 실행하지 않는다.
