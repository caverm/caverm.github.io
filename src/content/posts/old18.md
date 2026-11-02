---
title: "[webhacking.kr] old-18 "
slug: old18
published: 2026-11-02
draft: false
description: old18 write up
categoryId: webhacking-kr
lang: ko
---
1. 문제 개요

플랫폼 : webhacking.kr

난이도 : score 10

핵심 주제 : SQL Injection 



2. 문제 분석

SQL Injection 을 테스트 하기 위한 국룰 OR 1=1-- 를 입력하니 no hack 이라는 RESULT를 확인할 수 있습니다. 

아래 view-source 페이지를 확인하니 php 코드를 확인할 수 있었습니다.  

필터링을 우회하도록 sql문을 입력하여

result['id'] 가 'admin'이 되도록 해야 solve(18) 코드를 실행시켜 문제를 풀 수 있어 보입니다.

![](/images/wehacking-kr/old-18/mvypa3vo-twtonsoy.png)

```php
<?php
if($_GET['no']){
  $db = dbconnect();
  if(preg_match("/ |\/|\(|\)|\||&|select|from|0x/i",$_GET['no'])) exit("no hack");
  $result = mysqli_fetch_array(mysqli_query($db,"select id from chall18 where id='guest' and no=$_GET[no]")); // admin's no = 2

  if($result['id']=="guest") echo "hi guest";
  if($result['id']=="admin"){
    solve(18);
    echo "hi admin!";
  }
}
```

3. 풀이 과정

필터를 눈에 보기 쉽게 정리하면 다음과 같다. 

- 공백 문자 : 띄워쓰기가 불가하기 %09(탭), %0a(개행) 등으로 우회가 필요합니다.

- 특수문자  / : 주석(/**/, //)을 차단합니다.

- 연산자 | : || 연산자를 차단합니다. 

- 연산자 & : && 연산자를 차단합니다. 

- 키워드 select : 서브쿼리/데이터 조회를 차단합니다.

- 키워드 from : 테이블 지정을 차단합니다. 

- 표현식 0x : 헥스 인코딩을 통한 문자열 우회를 차단합니다.

 

db에 전달되는 쿼리인 'select id from chall18 where id='guest' and no=$_GET[no]" 를 확인합니다.

form에 1을 넣으면 hi guest 문자열이 출력되고 이를 보아 guest의 no가 1임을 알 수 있습니다. 

그렇다면 no=0 OR no=2 입력을 통해 admin raw를 가져올 수 있을 듯 합니다.  

no=0 은 존재하지 않는 raw니 no=2인 admin raw를 가져오게 됨.

 

해당 쿼리를 실행하기 위해 우회 과정을 거쳐야 합니다. 

0%09OR%09no=2;--  를 입력하여 필터링을 우회할 수 있습니다. 

  
URL에 직접 입력하게 된다면...

문제 해결!

![](/images/wehacking-kr/old-18/mvypa784-8raxmrfd.png)

