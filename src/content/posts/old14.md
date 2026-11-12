---
title: "[webhacking.kr] old-14"
slug: old14
published: 2026-11-12
draft: false
description: "old14 write up "
categoryId: webhacking-kr
lang: ko
---
## 1. 문제 개요

플랫폼 : [webhacking.kr](http://webhacking.kr) 

난이도 : score 10 

주제 : JS 코드 분석

## 2. 문제 분석

페이지에 접속해 보면 별다른 힌트 없이 텍스트 입력창(`input_pwd`)과 `check` 버튼만 덩그러니 놓여 있는 폼(Form)이 나타난다. 무엇을 입력해야 하는지 알아내기 위해 개발자 도구를 열어 페이지의 HTML 및 JavaScript 소스 코드를 먼저 확인해 보자.

```javascript
<form name=pw onsubmit="ck();return false">
  <input type=text name=input_pwd>
  <input type=button value="check" onclick=ck()>
</form>
<script>
function ck(){
  var ul=document.URL;
  ul=ul.indexOf(".kr");
  ul=ul*30;
  if(ul==pw.input_pwd.value) { location.href="?"+ul*pw.input_pwd.value; }
  else { alert("Wrong"); }
  return false;
}
</script>
```

- **이벤트 핸들러 구조:** 폼을 제출(`onsubmit`)하거나 버튼을 클릭(`onclick`)하면 `ck()` 함수가 실행된다. 별도의 서버 통신 없이 클라이언트 사이드(Client-Side)의 JavaScript만으로 입력값을 검증하는 구조이다.
- `document.URL` **참조:** 현재 접속 중인 페이지의 전체 URL 문자열을 가져와서 `ul` 변수에 저장한다.
- `indexOf(".kr")` **연산:** JavaScript의 `String.prototype.indexOf()` 메서드는 대상 문자열에서 특정 문자열(`".kr"`)이 처음으로 등장하는 위치의 인덱스(0부터 시작하는 정수)를 반환한다. 즉, 이 코드가 실행되는 시점에 `ul` 변수의 데이터 타입은 문자열(String)에서 숫자(Number)로 변환된다.
- **산술 연산 및 조건 검증:** 정수형으로 변환된 `ul` 값에 `30`을 곱한 뒤, 사용자가 `input_pwd`에 입력한 값과 일치하는지 비교한다. 조건이 참(True)일 경우 현재 URL 뒤에 `?(ul * 입력값)` 형태의 쿼리 스트링을 붙여 페이지를 이동(`location.href`)시킨다.

## 3. 풀이 과정

문제를 해결하기 위해서는 현재 접속한 URL을 기준으로 `ul` 변수의 최종 계산 값을 구해야 한다. 단계별로 값을 도출해 보자.

- **URL 인덱스 계산:**
  - 현재 접속한 페이지의 URL은 `https://webhacking.kr/challenge/js-1/`이다.
  - 문자열의 첫 글자인 `h`를 인덱스 `0`으로 잡고 `.kr`이 시작되는 `.`의 위치를 세어보면 인덱스 값은 `18`이 된다. (만약 `http://`로 접속했다면 `s`가 빠지므로 인덱스는 `17`이 된다.)
  - 일일이 손으로 세지 않고 브라우저 개발자 도구(F12)의 콘솔(Console) 창에 `document.URL.indexOf(".kr")`을 입력해 보아도 동일하게 `18`이 반환되는 것을 확인할 수 있다.
- **최종 검증 값 도출:**
  - 코드 내 `ul = ul * 30;` 로직에 따라 `18 * 30`을 계산하면 최종적인 `ul`의 값은 `540`이 된다.
- **패스워드 입력 및 인증:**
  - 페이지의 입력창에 `540`을 입력하고 `check` 버튼을 클릭하면 `if(ul == pw.input_pwd.value)` 조건문이 참이 된다.
  - 이후 `location.href="?"+ul*pw.input_pwd.value;` 구문이 실행되면서 URL이 `?291600`(`540 * 540`)으로 리다이렉트되며 문제가 풀린다.

문제해결!!!