---
title: "[webhacking.kr] old-01"
slug: old-1
published: 2026-11-01
draft: false
description: old-1 write up
categoryId: webhacking-kr
lang: ko
---
**1. 문제 개요**

플랫폼 : [webhacking.kr](http://webhacking.kr)

난이도 : score 20

핵심 주제 : Cookie 값 변조 + 불완전한 입력값 검증을 이용한 로직 우회



**2. 풀이**

php코드에서 user_lv 쿠키의 속성을 설정함을 확인할 수 있습니다. 

그리고 아래 코드에서 user_lv 쿠키에 대한 검증을 거칩니다.

- user_lv 쿠키의 value가 숫자가 아니면 1로 세팅
- user_lv 쿠키의 value가 4 이상이면 1로 세팅

그리고 이 검증을 무사히 통과한 user_lv 쿠키의 value가 3을 초과하면 solve(1) 코드가 실행되 문제를 해결하는 구조입니다. 

```php
<?php
  include "../../config.php";
  if($_GET['view-source'] == 1){ view_source(); }
  if(!$_COOKIE['user_lv']){
    SetCookie("user_lv","1",time()+86400*30,"/challenge/web-01/");
    echo("<meta http-equiv=refresh content=0>");
  }
?>
<html>
<head>
<title>Challenge 1</title>
</head>
<body bgcolor=black>
<center>
<br><br><br><br><br>
<font color=white>
---------------------<br>
<?php
  if(!is_numeric($_COOKIE['user_lv'])) $_COOKIE['user_lv']=1;
  if($_COOKIE['user_lv']>=4) $_COOKIE['user_lv']=1;
  if($_COOKIE['user_lv']>3) solve(1);
  echo "<br>level : {$_COOKIE['user_lv']}";
?>
<br>
<a href=./?view-source=1>view-source</a>
</body>
</html>
```



때문에 해당 검증을 통과하도록 쿠키 value를 설정하면 됩니다. 

기존 user_lv 쿠키 value 1을 3을 초과하고 4보다 작은 값으로 설정합니다. ( ex, 3.5 )

이후 새로고침을 통해 문제를 해결할 수 있습니다.

![](/images/wehacking-kr/old-1/mvxemhfg-ep6mq7bl.png)

