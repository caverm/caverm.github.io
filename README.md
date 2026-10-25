# 한국어 Fuwari 개인 블로그

[Fuwari](https://github.com/saicaca/fuwari)의 카드·프로필·테마·검색·독서 기능을 재사용한 Astro 정적 블로그입니다. 프로필은 편집용 자리표시자이고 현재 글은 모두 합성 예시입니다. 원본 commit과 라이선스는 [출처 기록](docs/provenance.md)을 참조하세요.

## Docker로 시작하기

Windows에서는 Docker Desktop의 **Linux containers**를 사용합니다. 호스트에는 Node.js·pnpm·Python을 설치하거나 실행하지 않습니다. 소스 편집과 Docker 명령만 호스트에서 수행하며 모든 패키지 설치·개발·검사·브라우저·빌드는 컨테이너에서 실행합니다.

```powershell
docker compose build
docker compose run --rm blog pnpm install --frozen-lockfile
docker compose up blog
```

개발 주소는 http://127.0.0.1:4321 입니다. 앱은 uid 1000의 `node` 사용자로 실행합니다. 소스는 bind mount하고 의존성과 pnpm 저장소는 `node_modules`, `pnpm_store` named volume에 둡니다. 호스트의 프로젝트 폴더에 node_modules를 설치하지 않습니다. Dockerfile은 Node 22.22.0 이미지 digest, pnpm 9.14.4, Playwright 1.56.1 브라우저를 고정합니다. `.npmrc`는 컨테이너의 `/pnpm/store`를 사용합니다.

```powershell
# 통합 검사: lint, Astro/콘텐츠 타입, 단위, 보안, 세 base 빌드/링크, 실제 브라우저
docker compose run --rm blog pnpm verify
# 필요한 단계만 실행
docker compose run --rm blog pnpm check
docker compose run --rm blog pnpm test:unit
docker compose run --rm blog pnpm audit:dependencies
# 현재 설정으로 실제 배포용 정적 빌드
docker compose run --rm blog pnpm build
# dist를 확인하려면 먼저 개발 서비스를 내려 같은 포트를 비웁니다
docker compose down
docker compose run --rm --service-ports blog pnpm preview --host 0.0.0.0
```

개발 서버에서는 Pagefind가 생성되지 않으므로 검색은 안내를 표시합니다. 검색의 실제 동작은 `build` 후 `preview` 또는 `verify`의 브라우저 검사에서 확인합니다. `verify`는 루트용 `dist-root/`, `/blog/`용 `dist/`, 경로 충돌 회귀용 `/posts/`의 `dist-collision/`를 만들므로 실제 배포 전에는 원하는 `.env` 설정으로 `pnpm build`를 다시 실행합니다. 빌드 산출물만 공개하고 저장소 전체를 호스팅하지 마세요. 초안 원문은 Git 저장소에는 존재합니다.

## 나의 블로그로 바꾸기

| 편집 위치 | 바꿀 내용 |
| --- | --- |
| `src/config.ts` | 제목·설명·작성자·프로필·아바타·메뉴·테마 색상·콘텐츠 라이선스 |
| `src/content/spec/about.md` | 소개 |
| `src/data/categories.json` | 모든 카테고리의 기준 데이터 |
| `src/content/posts/*.md` | 글과 메타데이터 |
| `public/images/` | 직접 만든 정적 이미지 |
| `.env` | 실제 공개 origin과 base |

`.env.example`을 `.env`로 복사해 실제 사이트에 맞춥니다. `SITE_URL`에는 경로 없는 HTTPS origin을 넣습니다.

```dotenv
# username.github.io 루트 사용자 사이트
SITE_URL=https://username.github.io
BASE_PATH=/
# 프로젝트 저장소가 blog라면 BASE_PATH=/blog/
```

사이트 base는 앞뒤 `/`를 사용합니다. 내부 Markdown 링크와 이미지는 `/about/`, `/images/notes.svg`처럼 **base 없는 사이트 루트 경로**로 작성합니다. 빌드가 base를 붙입니다. 외부 주소는 https URL을 사용합니다. raw HTML의 경로는 자동 변환 대상이 아니므로 Markdown 문법을 사용하세요. 로컬 글 폴더 이미지는 상대 경로로 둘 수 있으며 Astro가 처리합니다. AVIF와 출처를 신뢰할 수 없는 이미지 입력은 현재 보안 정책상 허용하지 않습니다.

## 카테고리와 글 작성

```json
[
  { "id": "security", "name": "보안", "order": 1 },
  { "id": "web-hacking", "name": "웹해킹", "parentId": "security", "order": 1 }
]
```

`id`는 소문자 ASCII 영숫자와 하이픈으로 만든 안정적인 고유 값입니다. 이름이나 부모를 바꿔도 ID를 유지하면 `/categories/<id>/` 주소가 유지됩니다. 부모가 다른 동명 카테고리도 허용합니다. 깊이 제한이 없고 부모 카테고리에도 직접 글을 지정할 수 있습니다. 부모 페이지·표시 개수는 모든 자손의 고유 공개 글을 포함합니다. 빈 카테고리도 표시합니다. 중복 ID, 잘못된 부모, 순환, 없는 글 참조는 초안까지 검사하고 빌드를 실패시킵니다.

```powershell
docker compose run --rm blog pnpm new-post my-first-note security-notes
```

```yaml
---
slug: my-first-note
title: '나의 첫 기록'
published: 2026-10-23
description: '이 글의 짧은 설명'
image: '/images/notes.svg'
tags: [Astro, 배움]
categoryId: security-notes
draft: true
lang: ko
---
```

한 글은 `categoryId` 하나와 태그 여러 개를 가집니다. `slug`를 고정하면 파일을 옮겨도 글 주소를 유지합니다. 새 글 스크립트는 공개하지 않는 초안으로 생성하며 기존 파일을 덮어쓰지 않습니다. `draft: true`는 개발과 생산 모두 직접 글 페이지·목록·이전/다음·분류·태그·검색·RSS·sitemap에서 제외됩니다. 공개할 준비가 끝나면 `draft: false`로 바꿉니다.

## Pages CMS로 글과 분류 편집하기

루트 `.pages.yml`은 [Pages CMS](https://app.pagescms.org/) 연결을 위한 생성 설정입니다. 초기 준비 당시에는 GitHub 저장소가 없었고, 현재 저장소와 CI 실행은 확인했습니다. hosted CMS의 App 연결·실제 글 CRUD·이미지 업로드는 이번 수정에서 검증하지 않았습니다. 로컬 준비의 계약과 검사 기록은 [specs/pages-cms](specs/pages-cms/)에 있습니다.

1. 소스를 GitHub 저장소의 `main`에 올리고 아래 Pages 설정을 완료합니다. 공개 저장소에는 초안 원문도 공개되므로 민감한 내용을 저장하지 않습니다.
2. Pages CMS에 GitHub로 로그인하고 관리자가 Pages CMS GitHub App을 **사용할 저장소에만** 설치·승인합니다. 저장소와 `main`을 선택합니다. 글·분류·이미지 저장과 action에 필요한 권한은 서비스가 요청하는 내용을 확인합니다. 개인 토큰을 소스나 `.pages.yml`에 넣지 않습니다.
3. **글 → 새 글**에서 제목·발행일·글 주소 ID(slug)·분류를 입력합니다. 새 글은 초안이 기본입니다. slug는 영문 소문자·숫자·하이픈으로 한 번 정하며, 기존 글은 제목을 바꿔도 slug를 유지합니다. 파일 이름은 생성 때 slug로 정하고 이름 변경 UI는 꺼져 있습니다. 기존 중첩 폴더의 글도 편집할 수 있습니다. 발행일은 필수이며 수정일은 비워둘 수 있습니다.
4. 본문은 Editor와 Source로 편집합니다. 일반 Markdown 이미지·링크·코드 fence를 사용할 수 있습니다. 코드 title/강조 지시문 등 확장 문법은 Source를 사용하고 저장 전후 GitHub diff를 확인합니다. 실제 서비스의 Editor/Source 왕복 보존은 아직 검증하지 않았습니다. 복잡한 글은 원문을 보관한 뒤 작은 수정으로 먼저 확인합니다.
5. 이미지는 media의 **글 이미지**에 PNG/JPG/JPEG/WebP/GIF를 올립니다. 저장은 `public/images/`, Markdown 주소는 `/images/...`이며 Pages base는 빌드가 붙입니다. CMS에서는 SVG/AVIF 업로드를 받지 않습니다. 기존 검토된 SVG 예시는 계속 렌더링할 수 있습니다. 업로드하는 사람도 코드 작성자와 같은 신뢰 수준이어야 합니다.
6. **카테고리 관리**에서 안정적인 ID·표시명·부모·정렬값을 편집합니다. 최상위는 부모 없음으로, 정렬 순서는 숫자(기본 0)로 둡니다. 저장 후 **카테고리 선택지 갱신**을 실행하고 Actions 성공을 확인한 뒤 CMS를 다시 엽니다. 전체 조상 경로가 선택 라벨에 표시됩니다. 새 부모를 추가할 때는 먼저 저장·갱신한 뒤 자식의 부모로 선택합니다. 자기 자신/자손 부모·중복/없는 ID·기존 글의 끊어진 참조는 빌드가 거부합니다.
7. 공개 준비가 끝나면 초안을 해제하고 저장합니다. `main` push는 게시 준비 검사를 통과하면 자동 게시합니다. **검증 후 게시** action은 기존 `verify.yml`의 `publish=true` 수동 요청으로도 사용할 수 있습니다. 카테고리 선택지 갱신 action은 `publish=false` 요청을 유지하며 자체 게시를 요청하지 않습니다. 실제 완료 상태와 environment URL은 GitHub Actions에서 확인합니다.

카테고리의 유일한 기준은 `src/data/categories.json`입니다. `.pages.yml`의 선택지는 직접 수정하지 않습니다. 로컬에서 분류를 바꾼 경우 아래 명령으로 갱신합니다. `cms:check`와 모든 build/verify는 오래되거나 임의 변경한 설정을 거부합니다.

```powershell
docker compose run --rm blog pnpm cms:sync
docker compose run --rm blog pnpm cms:check
```

갱신 action은 `.pages.yml`만 커밋하고 일반 push하므로 동시에 main이 바뀌거나 브랜치 보호가 bot push를 막으면 실패합니다. 보호를 해제하거나 force push하지 말고 최신 main에서 다시 생성하거나 생성 결과를 PR로 적용합니다. action 실패의 단계·종료 코드는 Actions 로그에서 확인하되 event payload/계정정보를 복사해 공개하지 않습니다. App 권한·workflow 허용·Pages environment 승인은 저장소 관리자가 실제 서비스에서 확인해야 합니다.

연결 후 남은 수동 인수 검사는 다음과 같습니다. 이 목록은 로컬 테스트 통과와 별개입니다.

- [ ] 저장소/App/main 연결 및 기존 중첩 글 열기
- [ ] 새 초안 작성·수정·삭제, 기존 slug 보존 및 초안이 사이트에 안 나오는지 확인
- [ ] 이미지 업로드와 root/project base 주소, 코드·링크·이미지의 Editor/Source 저장 왕복 확인
- [ ] 분류 추가·부모 이동·동명 분류 선택과 저장→갱신→다시 열기 확인
- [ ] 분류 배열 항목 삭제·재정렬 및 tags 배열 축소 후 원본 JSON/frontmatter에 정확히 반영되는지 확인 (merge 동작의 실제 hosted 버전 확인)
- [ ] 잘못된 그래프/오래된 설정의 검증 실패와 main 저장 후 게시 준비 검사·자동 게시 확인
- [ ] 명시적 게시 action의 검증→Pages 게시 및 실제 공개 URL 확인

Astro 개발 도구 막대는 `astro.config.mjs`의 `devToolbar.enabled: false`로 숨깁니다. 개발 서버와 build/verify는 `.astro`를 공유하므로 동시에 실행하지 않습니다.

## 검증·CI·Pages 산출물

`pnpm verify`는 필수 단계가 실패하거나 도구가 없으면 실패 코드로 종료합니다. Node 기본 테스트 러너로 분류/발행/URL 로직을 검증하고 컨테이너 Chromium으로 두 base의 키보드 disclosure, Swup 이동·뒤로가기, 검색, 코드 복사, 테마, 모바일을 확인합니다. 스크린샷은 `artifacts/screenshots/`에 저장합니다. 의존성 감사는 알려진 잔여 위험과 새 취약점을 구분해 출력하며 상세 정책은 [보안 명세](docs/security-spec.md)를 참조하세요.

2026-10-25 개인화한 소개를 검증하도록 보완한 뒤 로컬 Docker 전체 검증이 통과했습니다(`1a0bbc14-3337-4bd7-bc2e-3a8511567391`, exit0). 이전 감사·소개 검사 실패와 보완 이력은 보존합니다. 원시 감사에는 알려진 잔여 위험15건이 남으며 무취약 상태는 아닙니다. 원격 CI 재실행·커밋·push·게시는 수행하지 않았습니다. 이후 Git 검증과 반영은 사용자가 진행합니다. 현재 감사 상태는 [보안 명세](docs/security-spec.md), 실행별 결과는 [작업 기록](specs/personal-blog/tasks.md)에 남깁니다.

홈·카테고리·아카이브·소개·글·페이지번호·태그의 일반 내부 이동은 중앙 main만 200ms fade와 16px 아래 이동으로 사라진 뒤 역순으로 나타납니다. 프로필·분류 사이드바·상단 메뉴·배너·목차에는 전환 효과가 없습니다. 아래쪽 태그·카테고리 같은 내부 링크를 누르면 목적지 응답을 준비한 뒤 기존 화면이 부드럽게 위로 올라가고 상단에서 main outgoing→내용 교체와 아카이브 동기 필터→incoming을 실행합니다. 이미 상단이면 상향 스크롤만 생략합니다. 모션 줄이기 설정·history 위치 복원·목차 hash는 추가 본문·상향 모션 없이 처리합니다. 아카이브는 첫 표시와 전환 전에 query 결과를 동기적으로 준비하며 JavaScript 없이도 공개 목록을 제공합니다. 메뉴·분류 펼침·호버·복사·테마 피드백은 유지합니다. 브라우저 검사는 지연 응답·교체 첫 프레임과 실제 하단 링크의 중간 스크롤 좌표, reduced-motion·연속 탐색·키보드·목차·현재 분류를 함께 확인합니다.

자동 게시 경로는 Docker의 `pnpm verify:publish`입니다. ① 기존 소스 크기·보안 검사와 오프라인 입력 경계 guard ② CMS 선택지·카테고리·전체 콘텐츠 검증 및 실제 origin/base의 Astro·Pagefind 빌드 ③ 일반 canonical·RSS·sitemap·로컬 링크/이미지·실제 초안 경로 누출 검사를 수행합니다. 예시 글·프로필 파일명·브라우저 UI fixture는 게시 조건에 넣지 않습니다. 기존 전체 `pnpm verify`와 모든 테스트는 유지하며 **Actions → Full development verification**에서 수동 실행합니다. 온라인 의존성 감사·타입/lint/단위·세 base·브라우저 회귀는 이 전체 개발 검사에 포함됩니다. 코드·의존성 변경 때 전체 검사를 권장합니다.

`verify.yml`은 PR에서는 검사만, `main` push에서는 검사 성공 후 자동 배포합니다. 수동 실행은 `publish=false`가 기본이며 `main`에서 true를 선택한 경우에만 배포합니다. CMS의 기존 게시 요청과 호환됩니다. 이번 수정에서는 Git 명령·커밋·push·원격 CI 실행·배포를 수행하지 않습니다. CI 파일 존재를 서버의 Pages·브랜치 보호·필수 상태 검사 설정 적용으로 간주하지 않습니다.

정책 분리 후 로컬 게시 준비 검사는 실제 root base에서 exit0(38.690초·참조2,763개), 관련 회귀7개 PASS였습니다. 이번 변경에서 전체 개발 검사를 반복 실행하지 않았으며 원격 배포는 미실행입니다. 이전 전체 검사 결과와 이번 실행은 [작업 기록](specs/personal-blog/tasks.md)에서 구분합니다.

첫 프레임 검사는 교체 영역의 CSS 가시성을 확인합니다. 기존 클라이언트 전용 아카이브는 모듈을 처음 불러올 때 글 목록 렌더가 늦을 수 있으며, 실제 본문이 항상 교체 첫 프레임에 표시된다는 보장은 확인하지 못했습니다. 관찰 근거와 범위는 [작업 기록](specs/personal-blog/tasks.md)을 참조하세요.

## 로그와 문제 해결

검증 로그는 UTC·작업 ID·단계·종료 코드·소요 시간을 가진 JSON 이벤트와 도구의 stdout/stderr로 출력합니다. `INFO`는 진행·성공, `ERROR`는 실패에 사용합니다. 출력은 고정된 도구 명령이며 입력 본문이나 환경 변수 전체를 기록하지 않습니다.

```powershell
docker compose logs --tail 100 blog
docker compose logs --follow blog
docker compose run --rm blog pnpm verify 2>&1 | Tee-Object -FilePath verify.log

docker compose run --rm -e SITE_URL=https://example.github.io -e BASE_PATH=/ blog pnpm verify:publish
docker compose ps
```

Compose 서비스 로그는 10 MB × 3개로 순환하며 로컬 Docker 접근 권한을 가진 사람만 조회합니다. `run --rm` 로그는 터미널에 남고 별도 보관은 명시적으로 `verify.log`로 저장합니다. 로컬 검사 로그/스크린샷은 필요한 진단 후 삭제하며 CI artifact 보관은 workflow의 기간을 따릅니다. 로그 조회 실패는 검사 통과의 근거가 아닙니다. stdout 쓰기 실패나 자식 명령 실패는 성공으로 변환하지 않습니다. 기본 로그보다 상세한 도구 진단은 해당 단일 명령의 옵션을 임시 사용하고 다음 실행에는 제거합니다. DEBUG·WARN 이벤트가 필요한 장기 서버는 이 정적 사이트에 없습니다.

포트 충돌은 실행 중인 Compose 서비스를 내린 뒤 다시 시도합니다. 의존성 오류는 frozen 설치 결과와 lockfile을 확인합니다. named volume은 프로젝트를 지워도 유지됩니다. `docker compose down -v`는 설치 캐시를 삭제하므로 일반 종료에는 `docker compose down`을 사용합니다. 어떤 명령도 호스트 pnpm으로 대체하지 마세요.

설계는 [architecture](docs/architecture.md), 기능 계약과 작업 결과는 [specs/personal-blog](specs/personal-blog/)가 기준입니다.


## GitHub Pages에 직접 게시하기

1. 개인화한 소스를 GitHub 저장소의 `main` 브랜치에 올립니다. 이 작업에서는 저장소 생성·commit·push를 실행하지 않았습니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다. 실제 서버 설정은 저장소 관리자 권한으로 수행합니다.
3. 기본 주소는 `https://<owner>.github.io/<repository>/`입니다. 저장소 이름이 `<owner>.github.io`면 base는 `/`입니다. workflow가 이 값을 계산합니다. 사용자 도메인 등을 쓸 때는 **Settings → Secrets and variables → Actions → Variables**에 `SITE_URL`(경로 없는 HTTPS origin), `BASE_PATH`(앞뒤 `/`)를 설정합니다. custom domain은 Pages 설정과 DNS도 별도로 맞추고 필요하면 `public/CNAME`에 도메인 한 줄을 둡니다.
4. `main`에 push하면 게시 준비 검사 성공 후 자동 배포합니다. 별도 수동 게시도 **Actions → Container verification and Pages artifact → Run workflow**의 `main`에서 **검증 후 GitHub Pages에 게시**를 켜 실행할 수 있습니다. 검사 실패 시 deploy job은 실행되지 않습니다. 기본 수동 옵션은 게시 꺼짐이며 PR은 검사만 합니다. 전체 개발 검사는 별도 **Full development verification**에서 실행하며 배포하지 않습니다.
5. 첫 게시에서 GitHub가 `github-pages` environment 승인을 요구하면 해당 환경 정책에 따라 승인합니다. 완료된 deploy job의 environment URL이 실제 게시 주소입니다. 정적 artifact만 배포하며 source/docs/초안 원문을 Pages에 복사하지 않습니다.

Linux 로컬에서도 소유권이 다른 bind 폴더를 쓰면 Docker 빌드 전에 `BLOG_UID`, `BLOG_GID`를 실제 작업자 값으로 지정합니다. CI는 `id -u`, `id -g`를 이미지 빌드 인자로 전달해 앱을 해당 비루트 사용자로 실행합니다. 호스트 source의 소유자를 재귀 변경하지 않습니다.

Windows bind mount의 변경 감지를 위해 개발 watcher는 300ms polling을 기본으로 사용합니다. source와 public은 관찰하고 `dist/`, `dist-root/`, `dist-collision/`, `artifacts/`, `docs/`, `specs/`, `node_modules/`, `.git/`은 제외해 생성물 재관찰과 과도한 순회를 막습니다. 환경에서 native file events가 잘 동작하면 Compose 실행 환경에 `WATCH_USE_POLLING=false`를 전달해 비교 진단할 수 있습니다. 첫 페이지 요청은 초기 컴파일 시간이 필요합니다. 정적 파일은 열리지만 페이지 응답이 계속 대기하면 `docker compose logs --tail 100 blog`로 콘텐츠 동기화·Vite 최적화·SSR 오류를 확인합니다.

.astro/는 Astro가 content data-store 변경을 감지하여 정적 경로와 목록 캐시를 무효화하는 데 필요하므로 watcher에서 제외하지 않습니다. 이 디렉터리를 수동으로 ignored에 넣으면 새 글이 loader에는 반영되어도 홈페이지·직접 경로는 이전 상태로 남을 수 있습니다.

