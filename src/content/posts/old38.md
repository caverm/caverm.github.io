---
title: "[webhacking.kr] old-38"
slug: old38
published: 2026-11-11
draft: false
description: "old38 write up "
categoryId: webhacking-kr
lang: ko
---
## 1. 문제 개요

플랫폼 : [webhacking.kr](http://webhacking.kr)

난이도 : score 10

핵심 주제 : LOG INJECTION

## 2. 문제 분석

### 1) HTML 소스 코드 및 숨겨진 엔드포인트 확인

문제 페이지`index.php`)에 접속하면 `LOG INJECTION`이라는 문구와 함께 입력 폼이 주어진다. 폼에 `admin`을 입력하여 제출하면 `you are not admin`이라는 문자열이 출력되며 로그인이 거부된다. 페이지의 HTML 소스 코드는 다음과 같다.

```html
<html>
<head><title>Challenge 38</title></head>
<body>
  <h1>LOG INJECTION</h1>
  <form method=post action=index.php>
    <input type=text name=id size=20>
    <input type=submit value='Login'>
  </form>
  <!-- <a href=admin.php>admin page</a> -->
</body>
</html>
```

`view-soure` 에서 확인 가능한 단서는 다음과 같다.

- **입력 파라미터:** `POST` 메소드를 통해 `name=id` 파라미터로 입력값을 서버의 `index.php`에 전달한다.
- **숨겨진 페이지:** 주석 처리된 `<!-- <a href=admin.php>admin page</a> -->` 구문을 통해 로그 기록을 출력하고 관리자 로그인 여부를 검증하는 `admin.php` 페이지가 존재함을 알 수 있다.

### 2) 로그 기록 구조 및 인증 메커니즘 추론

`admin.php`에 접속하면 `You must logged as "admin"`이라는 문구와 함께 기존 접속자들의 로그인 시도 기록이 출력된다.

```
118.235.3.228:guest
103.214.221.21:test
61.254.29.66:guest
```

출력된 로그 형태를 통해 백엔드 서버의 동작 로직을 다음과 같이 추론할 수 있다.

- **로그 저장 포맷:** 사용자가 `index.php`에 `id` 값을 전송하면, 서버는 요청자의 공인 IP(`$_SERVER['REMOTE_ADDR']`)와 입력값을 결합하여 `[클라이언트 공인 IP]:[입력한 id]` 형태로 로그 파일에 한 줄씩 기록한다.
- **필터링 로직:** `index.php`에서 입력값이 `admin`인지 검사하여, 단순 `admin` 입력 시 로그 파일 기록을 차단한다.
- **관리자 검증 조건 (**`admin.php`**):** `admin.php`에 접속할 때 로그 파일을 줄(Line) 단위로 읽어 들여, 현재 접속자의 공인 IP를 기준으로 `[현재 접속자 공인 IP]:admin`과 일치하는 로그 레코드가 존재하는지 검증한다.

### 3) 핵심 취약점 : Log injection

로그 파일은 각 레코드를 구분하기 위해 개행 문자(CRLF, `\r\n` 또는 `\n`)를 구분자(Delimiter)로 사용한다. 만약 서버가 사용자의 입력값(`id`)에 포함된 개행 문자를 필터링하지 않고 파일에 그대로 기록한다면, 공격자는 단일 입력값 내에 개행 문자를 삽입하여 **하나의 입력을 두 줄의 독립적인 로그 레코드로 분리**할 수 있다.

즉, 첫 번째 줄에는 일반 계정명(예: `guest`)을 넣어 `index.php`의 `admin` 필터링을 우회하고, 개행 문자 바로 다음 줄에 `[내 공인 IP]:admin` 문자열을 삽입함으로써 정상적인 관리자 로그인 로그가 기록된 것처럼 위조할 수 있다.

## 3. 풀이 과정

### Step 1: 클라이언트 공인 IP 확인

서버의 `$_SERVER['REMOTE_ADDR']`에 기록되는 IP는 로컬 네트워크의 사설 IP(Private IP, 예: `192.168.x.x`, `172.16.x.x ~ 172.31.x.x`)가 아니라, NAT(공유기)를 거쳐 외부 인터넷과 통신할 때 사용되는 공인 IP(Public IP)이다.

따라서 Windows `cmd`의 `ipconfig` 명령어로는 공인 IP를 확인할 수 없으며, 다음 두 가지 방법 중 하나로 확인한다.

- `index.php`에 임의의 값(예: `guest`)을 제출한 뒤, `admin.php` 최하단에 기록된 자신의 IP를 직접 확인한다.
- 터미널(CMD/PowerShell/WSL)에서 외부 에코 서버에 HTTP 요청을 보내 공인 IP를 조회한다.

```bash
curl ifconfig.me
```

### Step 2: 개행 문자 삽입을 위한 DOM 수정

기본 제공되는 `<input type=text name=id size=20>` 태그는 단일 행 텍스트만 입력받으며, 입력창에서 `Enter` 키를 누르면 줄바꿈이 입력되는 대신 폼이 즉시 제출(Submit)된다.

프록시 도구(Burp Suite 등)로 패킷을 가로채어 URL 인코딩된 개행 문자(`%0d%0a` 또는 `%0a`)를 주입할 수도 있으나, 브라우저 개발자 도구(F12)를 이용해 HTML 태그를 여러 줄 입력이 가능한 `<textarea>`로 변경하면 더 간단하게 공격을 수행할 수 있다.

- 개발자 도구(Elements 탭)에서 기존의 `<input type=text name=id size=20>` 요소를 우클릭한 뒤 **Edit as HTML**을 선택하여 다음과 같이 수정한다.

```html
<!-- 수정 전 -->
<input type=text name=id size=20>

<!-- 수정 후 (서버가 참조하는 파라미터 키값인 name='id' 속성을 유지해야 함) -->
<textarea name='id'></textarea>
```

### Step 3: 페이로드(Payload) 전송 및 인증 우회

수정된 `<textarea>` 입력창에 첫 번째 줄은 임의의 문자열을 적고, `Enter` 키로 줄바꿈한 뒤 두 번째 줄에 `[자신의 공인 IP]:admin`을 입력하여 `Login` 버튼을 클릭한다.

폼 제출이 완료된 후, 주석에 숨겨져 있던 `admin.php` 페이지에서 새로고침하면 위조된 두 번째 줄의 로그 레코드가 정상적인 관리자 로그인 기록으로 인식되면서 문제가 풀린다.

문제 해결!!!!!!!!!@!@!@