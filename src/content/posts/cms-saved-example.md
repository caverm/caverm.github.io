---
slug: cms-saved-example
title: 'CMS 저장 형식의 합성 예시'
published: '2026-10-10'
updated: ''
description: '날짜 문자열, 코드 fence와 이미지 링크를 확인하는 로컬 합성 fixture입니다.'
image: ''
tags: [CMS, 합성]
categoryId: dev-notes
draft: false
lang: ko
---

## 로컬에서 확인하는 저장 형식

이 파일은 Pages CMS가 저장할 수 있는 Markdown 형식을 확인하기 위해 **직접 작성한 합성 예시**입니다. 실제 hosted CMS의 Editor/Source 모드에서 저장하거나 왕복 변환한 결과가 아닙니다.

```ts title="cms-synthetic.ts"
const cmsSyntheticExample = { categoryId: "dev-notes", draft: true };
console.log(cmsSyntheticExample);
```

![기존 합성 기록장 그림](/images/notes.svg)

[블로그 소개](/about/)와 코드·이미지 주소는 루트와 프로젝트 base에서 모두 올바르게 연결되어야 합니다.
