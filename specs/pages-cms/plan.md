# Pages CMS 구현 계획

상태: Astra 설계/코드 검토 반영과 로컬 구현·문서 완료. Docker 복구 후 필수 검사 단계별 통과. 실제 hosted 연결/원격 작업은 README의 후속 온보딩 범위다.

## 확인한 현재 구조

AGENTS.md와 현재 package/lockfile·Astro 설정·콘텐츠 스키마·categories.json·verify/workflow를 읽었다. 구현 시작 당시 루트는 Git 저장소가 아니고 `.pages.yml`이 없었다. 현재 생성 설정을 추가했으며 Git 저장소는 여전히 없다. 기존 Fuwari/계층 분류/Docker/검증·알려진 audit 위험은 유지한다. 기존 format/lint의 루트 설정 포함 범위를 보존한다. Spec Kit을 새로 설치하거나 사용했다고 보고하지 않는다.

## 공식 기능 조사와 선택

Pages CMS는 [`type: file`과 `list: true`](https://pagescms.org/docs/configuration/content/list/)로 JSON top-level 배열을 구조화된 필드로 편집한다. 따라서 현재 categories.json 포맷을 바꾸지 않는다. 반면 [`reference`](https://pagescms.org/docs/configuration/fields/reference/)는 collection의 개별 파일을 참조하며 단일 JSON 배열의 각 행을 대상으로 하지 않는다. [`select`](https://pagescms.org/docs/configuration/fields/select/)는 정적 옵션이다.

따라서 카테고리 데이터는 단일 기준으로 유지하고 CMS 설정의 ID/전체 breadcrumb 라벨만 생성한다. CMS를 위해 여러 카테고리 파일로 원본 데이터를 이중 관리하거나 지원되지 않는 동적 reference 옵션을 발명하지 않는다.

## 설정과 생성 경계

제안 파일은 `scripts/cms-config.mjs`(읽기·생성/--check CLI), 순수 생성/검증 모듈, 루트 `.pages.yml`, 해당 의미 있는 테스트다. YAML 직렬화는 현재 설치된 도구를 확인한 뒤 재사용한다. 필요하면 직접 사용하는 YAML parser만 최소 dev dependency로 명시하고 Docker에서 frozen lockfile을 갱신한다. 카테고리 데이터 자체는 기존 taxonomy 검증을 재사용하며 TS 순수 로직을 Node strip-types로 호출할 수 있다.

생성은 categories.json에서 안정적 순서의 ID와 `보안 / 웹해킹 / SQL Injection / 실습 / 노트` 같은 전체 경로를 만든다. article categoryId는 단일 select, category parentId도 같은 기준에서 생성한 optional select다. 루트는 미지정으로 저장하며 CMS가 빈 문자열을 저장하는 경우 JSON 기준을 불필요하게 바꾸지 않도록 실제 저장 형식과 기존 검증의 처리 방법을 검사한다. 자기/자손 부모 선택을 UI가 완전히 방지한다고 가정하지 않고 공통 그래프 검증이 반드시 거부한다.

생성된 `.pages.yml`에는 편집하지 말아야 하는 생성물임을 표시하고 --check는 동일한 논리 설정/선택지와 비교하여 stale 또는 수동 변경을 실패시킨다. 글·카테고리 필드는 모두 명시하고 raw fallback을 사용하지 않는다. `settings.content.merge: true`로 스키마 외 기존 메타데이터를 불필요하게 잃지 않게 하되, 목록 JSON 저장 동작은 별도로 확인한다.

## 글 필드·파일·날짜

posts path는 `src/content/posts`, 중첩 폴더 허용, frontmatter 형식과 Markdown body rich-text를 명시한다. body는 [`format: markdown`, `switcher: true`](https://pagescms.org/docs/configuration/fields/rich-text/)와 named media를 사용한다. [`filename`](https://pagescms.org/docs/configuration/content/filename/)은 `{fields.slug}.md`, filename UI는 새 파일 생성 시에만 표시하고 operations.rename=false로 한다. slug는 필수 ASCII 문자열이며 기존 제목·날짜 변경으로 자동 갱신하지 않는다. 정적 readonly 옵션은 새 글의 입력도 막으므로 적용하지 않고 생성 후 변경 금지 안내를 제공한다. 새 글 draft=true와 lang=ko를 명시한다.

CMS의 date 저장은 quoted 날짜 문자열일 수 있다. 현재 z.date를 무차별 z.coerce.date로 바꾸지 않는다. Date 또는 엄격히 검증된 YYYY-MM-DD 문자열만 Date로 정규화하고 null/boolean/숫자/불가능한 달력 날짜는 거부한다. 필수 published와 선택 updated의 빈 값 처리는 분리한다. 기존 unquoted YAML Date와 명시적 slug의 렌더 결과도 회귀 검사한다.

미디어는 `public/images`→`/images`를 사용하고 PNG/JPEG/WebP/GIF 등 검토한 안전 형식만 허용한다. AVIF는 CMS에서 제외하고 기존 source guard도 유지한다. 임의 SVG 업로드 허용 여부는 저장소 관리자 신뢰 경계와 기존 로컬 도형 SVG 사용을 분리해 결정한다.

## CMS actions와 기존 게시 게이트

공식 [`actions`](https://pagescms.org/docs/configuration/actions/)는 사용자 필드를 top-level workflow 입력으로 보내지 않고 `inputs.payload` JSON에 담는다. 기존 verify.yml의 publish boolean을 바로 지정할 수 있다고 가정하지 않는다.

제안은 CMS 전용 bridge workflow를 추가하여 두 개의 명시적 action을 제공하는 것이다.

1. **카테고리 선택지 갱신**: main에서 payload의 known source/action/repository/ref를 검증한다. Docker에서 생성·검사를 실행하고 변경 파일이 `.pages.yml`뿐인지 확인한 뒤 해당 파일만 커밋/일반 push한다. 동시 갱신은 직렬화하고 non-fast-forward를 강제 우회하지 않는다. 생성물 커밋 후 필요하면 기존 verify workflow를 publish=false로 명시적으로 요청한다.
2. **검증 후 게시**: 확인 대화상자의 사용자 의도를 받아 main의 기존 verify.yml을 publish=true로 dispatch한다. 기존 full verify→artifact→main-only deploy 게이트를 재사용하며 content push만으로 게시하지 않는다.

권한은 job 단위로 나눈다. 생성물 갱신은 contents:write, workflow 요청은 actions:write가 필요하고 게시 권한 pages:write/id-token:write는 기존 deploy job에만 남긴다. payload는 runner 환경 변수로 펼치지 않는다. GITHUB_EVENT_PATH 파일 하나를 readonly mount하여 Docker CLI에서 읽으며 전체 JSON/triggeredBy 개인정보를 로그에 출력하지 않는다. 로컬에서는 합성 payload fixture와 workflow 구문/정책을 검증하고 실제 dispatch는 하지 않는다.

카테고리를 저장하면 생성된 선택지가 일시적으로 stale할 수 있다. CMS에서 갱신 action을 누르고 완료 후 다시 열도록 안내한다. 오래된 설정을 조용히 게시하지 않고 verify의 CMS --check가 검출한다. GitHub 토큰으로 생성물 커밋한 push가 후속 workflow를 자동 실행한다고 가정하지 않고 검증 요청을 명시한다. 브랜치 보호가 직접 bot push를 막으면 허용을 임의 확대하지 않고 갱신 결과를 PR/관리자 적용으로 처리하는 운영 한계를 문서화한다.

## 개발 도구·문서

Astro 설정에 `devToolbar: { enabled: false }`를 추가한다. 관련 앱 디자인을 바꾸지 않는다. root가 안전한 시간대에 Docker 개발 서버와 Chromium으로 실제 toolbar 부재를 확인한다. README에 저장소 생성 이후 GitHub App 연결·main 선택·새 초안·이미지/코드 Editor/Source·분류 갱신·명시적 게시·문제 해결을 작성한다. 현재 architecture/security와 personal-blog의 변경된 현재 계약도 같은 변경 묶음에서 갱신하고 기존 완료 이력은 삭제하지 않는다.

## 검증 순서와 한계

1. 관련 기존 검사로 변경 전 결과를 기록한다. 구현 전 소스 검토와 hosted 저장소 부재를 구분한다.
2. 순수 생성 테스트: 깊이5 이상, 동명 leaf full path 구별, ID/name/parent 변경 후 재생성, 잘못된 graph 실패, 결정적 출력, stale check 실패, 단일 categoryId·draft·media/filename 정책을 검사한다.
3. 날짜 테스트: YAML Date·quoted 유효 날짜, 윤년 경계, 필수 빈 값·null·boolean·숫자·rollover 거부, optional blank 처리.
4. CMS 저장 형식의 합성 Markdown+이미지+fenced code를 실제 Astro 빌드/Pages base/검색·초안 경계에 연결한다. 실서비스 UI 왕복 검사로 주장하지 않는다.
5. action payload allowlist·main/ref·알려진 repository 경계, 로그 미노출과 생성물만 변경되는 갱신 정책을 검증한다.
6. 기존 Docker verify와 dev toolbar 실제 부재를 확인한다. 이미 통과한 검사는 새 변경/우려가 있을 때만 반복한다.
7. Astra 최종 검토 후 로컬 준비 완료와 아직 불가능한 hosted CRUD·App 설치·원격 Actions·실제 게시를 분리 보고한다. 기존 원시 audit exit1의14개 알려진 위험을 약화하거나 숨기지 않는다.

## 검토할 핵심 결정

재개 후 원시 감사에서 새 GHSA-98hj-9722-w3j8가 검출되어 첫 verify가 실패했다. 공식 적용 조건 검토와 Astra 검토를 거쳐 JSX/MDX 미사용 전제를 audit guard/회귀 검사로 강제한다. Astro7 major 전환을 임의로 포함하지 않으며 상세 근거·한계·현재15 advisory는 `docs/security-spec.md`가 기준이다.

생성된 select와 두 CMS action bridge의 사용성/최소 권한, root parentId의 빈 값 호환, 엄격한 날짜 변환, CMS와 기존 Markdown 특수 확장(코드 title/line highlight 등)의 실제 서비스 왕복 한계를 상세 설계 검토에서 확정한다.

