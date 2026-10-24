---
slug: deep-code
title: 'SQL Injection 노트와 긴 코드'
published: 2026-10-17
description: '목차와 코드 강조, 복사, 가로 스크롤을 확인합니다.'
image: ''
tags: [보안, 코드, 코드]
categoryId: security-notes
draft: false
lang: ko
---

## 오늘의 질문

이 글은 기능을 확인하기 위한 **합성 예시**입니다. 실제 인물·프로젝트·경험을 나타내지 않습니다.

목차와 코드 강조, 복사, 가로 스크롤을 확인합니다. 한 번에 한 가지 질문을 고르고 관찰한 내용을 짧게 적어 봅니다.

## 기록을 이어가는 방법

작게 시도하고, 결과를 살펴보고, 다음 질문을 남깁니다. 보안 → 웹해킹 → SQL Injection → 실습 → 노트처럼 깊은 주제도 한 단계씩 찾아갈 수 있습니다.

이름이 같은 카테고리는 서로 다른 부모 아래에 둘 수 있습니다. 보안의 노트와 CTF의 노트는 안정적인 ID로 구분됩니다.

### 다시 펼칠 때

배운 내용을 자신의 말로 적어 두면 다음에 돌아왔을 때 맥락을 되찾기 쉽습니다.

[블로그 소개](/about/)에서 프로필과 콘텐츠의 편집 위치를 확인하세요.

## 긴 코드도 편안하게

중복 태그를 입력해도 화면에는 한 번만 표시됩니다. 아래 코드는 가로 스크롤과 복사 기능을 확인하는 합성 데이터입니다.

```ts title="synthetic-example.ts"
const syntheticLearningNote = { title: "작은 실험을 기록하는 하루", category: "security-notes", tags: ["Astro", "코드"], description: "이 매우 긴 한 줄은 작은 화면에서 페이지 전체가 아닌 코드 영역 안에서 가로 스크롤되는지 확인하기 위한 합성 데이터입니다." };

function summarize(notes: typeof syntheticLearningNote[]) {
  return notes.map(({ title, category }) => `${category}: ${title}`);
}

console.log(summarize([syntheticLearningNote]));
```

## 이미지와 마무리

![직접 만든 합성 기록장 도형 일러스트](/images/notes.svg)

오늘의 기록을 닫고 다음 질문을 한 줄 적어 둡니다.


## 글 폴더에 둔 이미지

![글 폴더에 보관한 합성 기록장 그림](./figure.svg)
