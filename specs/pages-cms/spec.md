# Pages CMS 편집과 개발 도구 숨김 명세

상태: 현재 로컬 구현 계약. Docker 필수 검사 단계별 통과, hosted 연결 준비 완료. GitHub 저장소·실제 hosted CMS 연결은 미실행이다. 기존 personal-blog 명세와 완료 기록은 유지한다.

## 목적과 범위

현재 Fuwari 블로그에 hosted Pages CMS로 글·이미지·카테고리를 편집할 수 있는 저장소 설정과 운영 절차를 준비하고 Astro 개발 도구 막대를 숨긴다. 사용자의 “Astra Toolbar”는 화면의 Astro dev toolbar를 가리키는 것으로 해석한다. 블로그의 배너나 프로필·테마 디자인은 이번 변경 대상이 아니다.

사용자는 아직 GitHub 저장소가 없다고 확인했다. 따라서 이번 구현은 로컬의 CMS 연결 준비와 온보딩까지이며 실제 hosted CMS 인증·저장·게시를 완료했다고 보고하지 않는다. 새 서버·DB·self-hosted CMS를 설치하지 않는다. 모든 Node/pnpm·검사·빌드는 기존 Linux Docker 안에서 실행한다.

## 현재 계약과 입력

- 글은 `src/content/posts`의 Markdown이다. 중첩 `deep/index.md`와 기존 명시적 `slug`를 유지한다.
- 글 필드는 title, slug, published, optional updated, description, image, tags 배열, 단일 categoryId, draft, lang, Markdown body다.
- 모든 카테고리는 기존 `src/data/categories.json` top-level 배열이 유일한 기준이다. 안정적인 ASCII ID, name, optional parentId/order와 임의 깊이 부모 참조를 유지한다.
- CMS 이미지 저장 위치는 `public/images`, 글에 기록하는 주소는 `/images`다. 허용한 이미지 확장자만 업로드하며 AVIF는 제외한다. 기존 빌드의 AVIF/비밀정보·분류 참조 검증도 유지한다.
- CMS 동작 설정은 루트 `.pages.yml`이다. 카테고리 선택 옵션을 별도로 수동 관리하지 않는다.

## 인수 조건

| ID | 기대 동작 | 확인 가능한 결과 |
| --- | --- | --- |
| CMS-01 | 구조화된 글 편집 | `.pages.yml`에 posts collection, YAML frontmatter, Markdown rich-text body와 Editor/Source 전환을 명시한다. 필드를 생략한 raw 편집 fallback을 글 편집으로 사용하지 않는다. |
| CMS-02 | 기존 글·주소 보존 | 제목을 수정해도 slug를 자동 재생성하지 않는다. 새 파일 이름은 입력한 slug에서 만들고 파일 이름 변경 UI를 차단한다. 기존 중첩 글도 편집 대상이다. 기존 slug는 생성 후 유지하라는 안내와 ASCII 패턴 검증을 제공한다. |
| CMS-03 | 초안 기본값 | CMS와 새 글 도구에서 만든 글은 draft=true다. 초안은 기존 직접 페이지·목록·태그·검색·피드·sitemap 제외 계약을 유지한다. |
| CMS-04 | 날짜 호환성 | YAML Date와 CMS가 저장하는 유효한 `YYYY-MM-DD` 문자열을 수용한다. 필수 published의 빈 값·숫자·boolean·null·불가능한 날짜는 거부한다. 선택 updated의 빈 값은 명시적으로 미지정으로 처리하고 나머지 잘못된 값은 거부한다. |
| CMS-05 | 단일 카테고리 선택 | categoryId는 ID 하나를 저장하고 UI에는 전체 조상 경로를 표시한다. 전체 경로까지 동명인 경우 안정 ID를 라벨에 덧붙인다. 서로 다른 부모의 동명 leaf를 구분하며 5단계 예시도 표시한다. |
| CMS-06 | 단일 기준과 갱신 | categoryId/parentId 선택지는 categories.json에서 결정적으로 생성한다. 생성된 설정의 수정/누락을 검출하는 check를 제공한다. 카테고리를 웹에서 저장한 뒤 명시적 갱신 action으로 CMS 선택지를 다시 만들 수 있는 준비된 workflow를 제공한다. |
| CMS-07 | 구조화된 카테고리 편집 | CMS의 type=file/list=true JSON 필드로 id/name/parentId/order를 편집한다. 원본 JSON을 다른 기준 파일로 대체하지 않는다. 기존 중복/부모누락/순환/글참조 검증은 약화하지 않는다. |
| CMS-08 | Markdown 이미지·코드 | rich-text는 Markdown 형식과 이미지 업로드를 제공한다. 코드 fence·링크·이미지가 포함된 합성 CMS 저장 형식 fixture를 실제 빌드에서 검증한다. 실제 hosted Editor/Source roundtrip은 저장소/인증이 생긴 뒤 별도 검사하며 로컬 fixture를 실서비스 검사로 보고하지 않는다. |
| CMS-09 | 게시 의도 분리 | 글 저장은 즉시 Pages 게시를 실행하지 않는다. 별도 확인이 있는 CMS 게시 action이 main의 기존 검증/게시 workflow를 명시적으로 요청하며 검증 실패 시 게시하지 않는다. |
| CMS-10 | action 경계와 로그 | CMS payload는 source/action/repository/ref를 검증하고 전체 payload나 사용자 개인정보를 로그로 출력하지 않는다. 갱신 workflow는 생성된 `.pages.yml`만 커밋 대상으로 삼고 다른 변경이나 동시 main 변경을 강제로 덮어쓰지 않는다. |
| DEV-01 | 개발 도구 막대 숨김 | Astro 설정에서 devToolbar.enabled=false를 사용하고 실제 Docker 개발 페이지에서 toolbar 요소가 나타나지 않는 것을 확인한다. 테마의 내비게이션·배너는 변경하지 않는다. |
| QA-CMS-01 | 검증과 정직한 완료 보고 | 설정 생성·stale 검출·깊은 분류/동명 라벨·날짜 경계·action payload 경계를 Docker에서 검증한다. 기존 verify를 통과시키고 기존 알려진 audit 위험을 그대로 보고한다. 실제 hosted 연결/CRUD/원격 action은 미실행 범위로 분리한다. |

## 제외 범위와 전제

GitHub 저장소 생성, 초기 commit·push, Pages CMS App 설치/권한 승인, 실제 CMS 글 저장·이미지 업로드·workflow dispatch·배포는 연결 대상이 없으므로 이번 로컬 구현에서 실행하지 않는다. 해당 단계를 수행하는 온보딩 절차와 검증 체크리스트를 준비한다. 실제 서비스의 rich-text 변환이 원본 코드/이미지를 그대로 보존하는지는 서비스 연결 후 확인해야 한다.

카테고리 갱신 action은 사용자가 명시적으로 실행하는 제한된 저장소 작업이다. 새 부모를 추가한 경우 저장→선택지 갱신→CMS 다시 열기 후 자식의 부모로 고른다. 아직 저장·검증되지 않은 배열 항목을 실시간 참조하는 UI를 제공한다고 가정하지 않는다.
