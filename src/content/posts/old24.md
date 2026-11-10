---
title: "[webhacking.kr] old-24 "
slug: old24
published: 2026-11-10
draft: false
description: "old24 write up "
categoryId: webhacking-kr
lang: ko
---
### 1. 문제 개요

플랫폼 : [webhacking.kr](http://webhacking.kr)

난이도 : score 10

핵심 주제 : 변수 덮어쓰기 

### 2. 문제 분석

문제 페이지에 접속하면 현재 접속한 클라이언트의 IP 주소(`client ip`)와 브라우저 정보(`agent`)가 테이블 형태로 출력되며, 하단에는 `Wrong IP!`라는 메시지가 나타난다. 

`view-source` 를 클릭해 PHP 소스 코드를 확인해보자.

```php
<?php
  extracIE);
  $ip = $REMOTE_ADDR;
  $agent = $HTTP_USER_AGENT;
  if($REMOTE_ADDR){
    $ip = htmlspecialchars($REMOTE_ADDR);
    $ip = str_replace("..",".",$ip);
    $ip = str_replace("12","",$ip);
    $ip = str_replace("7.","",$ip);
    $ip = str_replace("0.","",$ip);
  }
  if($HTTP_USER_AGENT){
    $agent=htmlspecialchars($HTTP_USER_AGENT);
  }
  echo "<table border=1><tr><td>client ip</td><td>{$ip}</td></tr><tr><td>agent</td><td>{$agent}</td></tr></table>";
  if($ip=="127.0.0.1"){
    solve(24);
    exit();
  }
  else{
    echo "<hr><center>Wrong IP!</center>";
  }
?>
```

코드를 위에서부터 순차적으로 분석하면 문제를 풀기 위한 핵심 단서 두 가지를 발견할 수 있다. 

코드 하단의 조건문을 보면 최종적으로 `$ip` 변수의 값이 로컬호스트 주소인 `"127.0.0.1"`과 일치할 때 `solve(24);` 함수가 호출되며 문제가 풀린다.

### ① 취약점 1: `extract()` 함수를 통한 변수 덮어쓰기

PHP의 슈퍼글로벌 배열인 `$_SERVER`와 `$_COOKIE`에 대해 `extract()` 함수를 연속으로 호출하고 있다.

- `$_SERVER`: 서버 및 실행 환경 정보를 담고 있는 배열이다. `$_SERVER['REMOTE_ADDR']`에는 TCP 연결 시 확인된 클라이언트의 실제 IP 주소가 들어가며, 이는 일반적인 HTTP 요청 조작만으로는 변경할 수 없다.
- `extract()` **함수**: 배열의 Key(인덱스 이름)를 일반 변수 이름으로, Value를 그 변수의 값으로 추출하여 현재 심볼 테이블(메모리)에 등록한다. 별도의 옵션을 지정하지 않으면 기본값인 `EXTR_OVERWRITE`가 적용되어, **동일한 이름의 변수가 이미 존재할 경우 나중에 실행된 값으로 기존 변수를 덮어씌운다.**

코드의 실행 흐름을 따라가 보면 다음과 같다.

1. `extract($_SERVER);`가 실행되면서 `$REMOTE_ADDR`이라는 변수가 생성되고, 여기에 접속자의 실제 공인 IP가 저장된다.
2. 직후에 `extract($_COOKIE);`가 실행된다. 코드 내에서 쿠키를 직접 사용하는 곳은 없지만 이 구문이 존재하는 것이 결정적인 단서다.
3. 만약 사용자가 `REMOTE_ADDR`**이라는 이름(Key)을 가진 쿠키**를 생성하여 서버에 전송하면, `extract($_COOKIE);`가 실행될 때 앞서 생성된 `$REMOTE_ADDR` 변수의 값을 쿠키에 담긴 값으로 덮어쓸 수 있다.

### ② 취약점 2: `str_replace()` 필터링

`$REMOTE_ADDR` 값을 조작하더라도, 그 값은 `if($REMOTE_ADDR)` 블록 내부에서 다음과 같은 변환 및 필터링 과정을 거친다.

- `htmlspecialchars($REMOTE_ADDR)`: XSS 공격 등을 방지하기 위해 `<`, `>`, `"`, `'`, `&` 등의 특수 문자를 HTML 엔티티로 변환한다.
- `str_replace(찾을 문자열, 바꿀 문자열, 대상 문자열)`: 문자열에서 특정 패턴을 찾아 치환한다.
  1. `..` -> `.` 으로 치환
  2. `12` -> `""` (삭제)
  3. `7.` -> `""` (삭제)
  4. `0.` -> `""` (삭제)

여기서 중요한 점은 `str_replace()` 함수가 대상 문자열을 처음부터 끝까지 **단 한 번만 스캔하여 치환할 뿐, 치환된 결과 문자열을 다시 재귀적으로 검사하지 않는다**는 것이다. 따라서 삭제될 문자열 사이에 동일한 패턴을 끼워 넣는 방식으로 필터링을 우회할 수 있다.

### 3. 풀이 과정

분석한 내용을 바탕으로 공격을 수행해보자.



#### **Step 1. 필터링 우회 페이로드 설계**

4단계의 `str_replace()`를 모두 거친 후 최종적으로 `127.0.0.1`이 남도록 입력값을 구성한다.

페이로드와 필터 통과 과정은 다음과 같다. 


| 단계 | 실행 코드 | 변환 과정 설명 | 변환 결과 (`$ip`) |
| ------- | --------------------------------------- | ------------------------------------------------------- | ------------------------ |
| **초기값** | `$ip = htmlspecialchars($REMOTE_ADDR);` | 쿠키로 주입한 초기 문자열 | `112277...00....00....1` |
| **1단계** | `$ip = str_replace("..",".",$ip);` | `...` $\rightarrow$ `..` / `....` $\rightarrow$ `..` 치환 | `112277..00..00..1` |
| **2단계** | `$ip = str_replace("12","",$ip);` | `1[12]2` 가운데 `12` 삭제 | `1277..00..00..1` |
| **3단계** | `$ip = str_replace("7.","",$ip);` | `7[7.].` 가운데 `7.` 삭제 | `127.00..00..1` |
| **4단계** | `$ip = str_replace("0.","",$ip);` | `0[0.].` 가운데 `0.` 각각 삭제 | `127.0.0.1` |


#### **Step 2. 쿠키 변조 및 문제 해결**

설계한 페이로드를 `REMOTE_ADDR` 쿠키에 담아 서버로 전송한다.

1. 문제 페이지에서 크롬 개발자 도구(`F12`)를 열고 **Application** 탭(또는 저장소 탭)으로 이동한다.
2. 좌측 메뉴의 **Cookies** 항목 아래에 있는 `https://webhacking.kr` 도메인을 클릭한다.
3. 빈 행을 더블클릭하여 새로운 쿠키를 다음과 같이 추가한다.
  - **Name**: `REMOTE_ADDR`
  - **Value**: `112277...00....00....1`

![](/images/wehacking-kr/old24/mwacuzkm-qxgxevm2.png)

4. 쿠키를 등록한 상태에서 페이지 새로고침(`F5`)을 눌러 변조된 쿠키가 포함된 HTTP 요청을 서버로 전송한다.

문제 해결!

