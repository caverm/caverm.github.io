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

1. 코드 하단의 조건문을 보면 최종적으로 `$ip` 변수의 값이 로컬호스트 주소인 `"127.0.0.1"`과 일치할 때 `solve(24);` 함수가 호출되며 문제가 풀린다.
2. PHP의 배열인 `$_SERVER`와 `$_COOKIE`에 대해 `extract()` 함수를 연속으로 호출하고 있다.

