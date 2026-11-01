---
title: "[webhacking.kr] old-06"
slug: old-06
published: 2026-11-01
draft: false
description: old06 write up
categoryId: webhacking-kr
lang: ko
---
**1. 문제 개요**

플랫폼 : [webhacking.kr](http://webhacking.kr)

난이도 : score 10

핵심 주제 : 신뢰할 수 없는 클라이언트 입력(쿠키)을 통한 신원 인증

**2. 문제 분석**

페이지 접속 후 ID, PW 를 확인할 수 있고 view-source 링크를 확인할 수 있으며 코드는 아래와 같습니다.

코드에서 쿠키 설정 방법을 확인할 수 있으며 방법은 다음과 같습니다.



**1. val_id 쿠키의 value를 guest로 설정, val_pw 쿠키의 value를 123qwe로 설정한다.** 

**2. 다음으로 id, pw 각각 20번씩 base64인코딩을 수행한다.** 

**3. 숫자를 특수문자로 교체한다.** 



디코딩 과정은 위 과정의 역순이다. 



**1. 특수문자를 숫자로 교체한다.** 

**2. 다음으로 id, pw 각각 20번씩 base64디코딩을 수행한다.** 

**3. val_id쿠키, val_pw쿠키 value를 확인해 solve(6)을 수행한다.**

![](/images/wehacking-kr/old06/mvxg3kw0-se5d4ejg.png)

```php
<?php
include "../../config.php";
if($_GET['view_source']) view_source();
if(!$_COOKIE['user']){
  $val_id="guest";
  $val_pw="123qwe";
  for($i=0;$i<20;$i++){
    $val_id=base64_encode($val_id);
    $val_pw=base64_encode($val_pw);
  }
  $val_id=str_replace("1","!",$val_id);
  $val_id=str_replace("2","@",$val_id);
  $val_id=str_replace("3","$",$val_id);
  $val_id=str_replace("4","^",$val_id);
  $val_id=str_replace("5","&",$val_id);
  $val_id=str_replace("6","*",$val_id);
  $val_id=str_replace("7","(",$val_id);
  $val_id=str_replace("8",")",$val_id);

  $val_pw=str_replace("1","!",$val_pw);
  $val_pw=str_replace("2","@",$val_pw);
  $val_pw=str_replace("3","$",$val_pw);
  $val_pw=str_replace("4","^",$val_pw);
  $val_pw=str_replace("5","&",$val_pw);
  $val_pw=str_replace("6","*",$val_pw);
  $val_pw=str_replace("7","(",$val_pw);
  $val_pw=str_replace("8",")",$val_pw);

  Setcookie("user",$val_id,time()+86400,"/challenge/web-06/");
  Setcookie("password",$val_pw,time()+86400,"/challenge/web-06/");
  echo("<meta http-equiv=refresh content=0>");
  exit;
}
?>
<html>
<head>
<title>Challenge 6</title>
<style type="text/css">
body { background:black; color:white; font-size:10pt; }
</style>
</head>
<body>
<?php
$decode_id=$_COOKIE['user'];
$decode_pw=$_COOKIE['password'];

$decode_id=str_replace("!","1",$decode_id);
$decode_id=str_replace("@","2",$decode_id);
$decode_id=str_replace("$","3",$decode_id);
$decode_id=str_replace("^","4",$decode_id);
$decode_id=str_replace("&","5",$decode_id);
$decode_id=str_replace("*","6",$decode_id);
$decode_id=str_replace("(","7",$decode_id);
$decode_id=str_replace(")","8",$decode_id);

$decode_pw=str_replace("!","1",$decode_pw);
$decode_pw=str_replace("@","2",$decode_pw);
$decode_pw=str_replace("$","3",$decode_pw);
$decode_pw=str_replace("^","4",$decode_pw);
$decode_pw=str_replace("&","5",$decode_pw);
$decode_pw=str_replace("*","6",$decode_pw);
$decode_pw=str_replace("(","7",$decode_pw);
$decode_pw=str_replace(")","8",$decode_pw);

for($i=0;$i<20;$i++){
  $decode_id=base64_decode($decode_id);
  $decode_pw=base64_decode($decode_pw);
}

echo("<hr><a href=./?view_source=1 style=color:yellow;>view-source</a><br><br>");
echo("ID : $decode_id<br>PW : $decode_pw<hr>");

if($decode_id=="admin" && $decode_pw=="nimda"){
  solve(6);
}
?>
</body>
</html>
```



**3. 풀이 과정**

solve(6) 코드를 실행시키기 위해서는 decode_id 와 decode_pw 가 "admin', "nimda"와 일치해야 한다. 

디코딩 과정을 거친 쿠키 value 가 admin, nimda가 나오도록 하기 위해서는

admin, nimda 를 위의 인코딩 과정을 거치도록 하면 된다.

이후 val_id, val_pw 쿠키 value 를 해당 값으로 교체하면 디코딩 결과가 admin, nimda와 일치할 것이다. 



이를 위한 간단한 파이썬 코드를 작성해보았다.

해당 코드를 실행한 후 결과값을 쿠키 value로 붙인 후 새로고침하면 문제를 해결할 수 있다. 

```
import base64

# 매개변수 타입과 리턴 타입에 대한 힌트
def encode_value(val: str) -> str:

	#encode로 문자열을 bytes로
    val_bytes = val.encode()  
    
    #20번 b64인코딩
    for _ in range(20):
        val_bytes = base64.b64encode(val_bytes) 
        
    #bytes를 문자열로 디코딩
    val_str = val_bytes.decode() 

    # 숫자 -> 특수문자 치환
    replacements = {
        "1": "!", "2": "@", "3": "$", "4": "^",
        "5": "&", "6": "*", "7": "(", "8": ")"
    }
    
    for num, char in replacements.items():
        val_str = val_str.replace(num, char)
	
    #인코딩+치환 완료한 문자열을 반환
    return val_str

print("user:", encode_value("admin"))
print("password:", encode_value("nimda"))
```

