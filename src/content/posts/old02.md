---
title: "[webhacking.kr] old-02"
slug: old02
published: 2026-11-09
draft: false
description: "old02 write up "
categoryId: webhacking-kr
lang: ko
---
1. 문제 개요

플랫폼 : [webhacking.kr](http://webhacking.kr)

난이도 : score 50

핵심 주제 : blind sql injection 



2. 문제 분석

문제에 들어가면 Restricted area라는 문구를 확인할 수 있다. 페이시 소스에 들어간다. 

```html
<!--
2026-11-09 01:04:05
-->
<h2>Restricted area</h2>Hello stranger. Your IP is logging...<!-- if you access admin.php i will kick your ass -->
```

페이지 소스에서는 시간이 찍혀있는 것을 볼 수 있고 admin.php 라는 페이지가 있음을 확인할 수 있다. 

```php
<form method=post>
type your secret password <input name=pw> <input type=submit>
```

pass 를 입력하는 form 이 있음을 확인할 수 있다. 다른 단서는 존재하지 않는다. 

여기서 추측 가능한 것은 pw를 입력하는 폼이 있으니 sqli 주제라는 것이다. 다음은 쿠키에서 단서를 찾아보자. 

![](/images/wehacking-kr/old-02/mw8s6d5o-gslboct1.png)

time 이라는 쿠키가 처음 페이지 소스의 시간 정보에 영향을 미치는 것을 추측. time 값을 바꿔보자. 

**time이 1일 때는 2070-01-01 09:00:01** 

**time이 0일 때는  2070-01-01 09:00:00 이다.** 

판별식이 작동하는지도 확인해 보았다.

(1=1) 은 09:00:01, (1=0) 은 09:00:00 이었다. 

time 값을 조종해 blind sqli 가 가능한지 테스트하기 위해 쿼리를 넣어본다. 

**(SELECT 1) 은 09:00:01 , (SELECT 200) 은 09:03:20 이다. 쿼리 반환값이 분과 초로 나타남을 알 수 있다.** 

이를 통해 blind sqli를 진행한다.



3. 풀이 과정

py코드를 통해 blind sqli exploit 을 작성하며 진행해보자. 아래 코드는 전역 변수와 함수 define 을 제외한 코드이다. 의사코드 정도로 맥락만 파악해보자.



먼저 DB에 대한 정보를 파악해야 한다. information_schema.tables 테이블은 mysql에서 데이터베이스 메타데이터를 조회하는 시스템 뷰이다. 

- `information_schema`: 데이터베이스의 구조 정보를 제공하는 시스템 스키마
- `tables`: 데이터베이스에 존재하는 테이블과 뷰의 정보를 담고 있는 시스템 뷰
- `information_schema.tables`: `information_schema`에 속한 `tables`를 지정하는 정규화된 이름

```
# 1. DB 속 테이블 개수 확인
sql = "(SELECT COUNT(table_name) FROM information_schema.tables WHERE table_schema=database())"

my_cookies = set_cookies(sql)

res = requests.get(url, cookies=my_cookies)
sample_html = res.text
table_number = total_time(sample_html)
print(f"테이블 개수 : {table_number}")
```

 



&nbsp;