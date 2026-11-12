---
title: "[webhacking.kr] old-16"
slug: old16
published: 2026-11-12
draft: false
description: "old16 write up "
categoryId: webhacking-kr
lang: ko
---
## 1. 문제 개요

플랫폼 : [webhacking.kr](http://webhacking.kr)

난이도 : score 10

주제 : JS 코드 분석

## 2. 문제 분석

문제 페이지에 접속하면 검은색 배경에 크기가 큰 노란색 별(`*`) 하나와 작은 별 두 개가 찍혀 있다. 특이하게도 작은 별 중 하나는 색상이 랜덤하게 지정되어 있으며, 마우스 커서를 가져다 대면 화면에서 즉시 사라진다.

정확한 동작 원리를 파악하기 위해 페이지 소스 코드를 확인해 보자.

```javascript
<html>
<head>
<title>Challenge 16</title>
<body bgcolor=black onload=kk(1,1) onkeypress=mv(event.keyCode)>
<font color=silver id=c></font>
<font color=yellow size=100 style=position:relative id=star>*</font>
<script> 
document.body.innerHTML+="<font color=yellow id=aa style=position:relative;left:0;top:0>*</font>";

function mv(cd){  
  kk(star.style.left-50,star.style.top-50);  
  if(cd==100) star.style.left=parseInt(star.style.left+0,10)+50+"px";  
  if(cd==97) star.style.left=parseInt(star.style.left+0,10)-50+"px";  
  if(cd==119) star.style.top=parseInt(star.style.top+0,10)-50+"px";  
  if(cd==115) star.style.top=parseInt(star.style.top+0,10)+50+"px";  
  if(cd==124) location.href=String.fromCharCode(cd)+".php"; // do it!
}

function kk(x,y){  
  rndc=Math.floor(Math.random()*9000000);  
  document.body.innerHTML+="<font color=#"+rndc+" id=aa style=position:relative;left:"+x+";top:"+y+" onmouseover=this.innerHTML=''>*</font>";
}
</script>
</body>
</html>
```

코드를 위에서부터 차례대로 따라가 보면 왜 처음에 별이 3개나 생성되었는지, 그리고 각 이벤트 핸들러(`onload`, `onkeypress`, `onmouseover`)가 어떤 역할을 하는지 알 수 있다.

- **첫 번째 별 (**`id=star`**)**: HTML `<body>` 내부에 직접 작성된 `<font color=yellow size=100 ...>*</font>` 태그에 의해 가장 큰 노란색 별이 먼저 출력된다.
- **두 번째 별 (**`id=aa`**, 노란색)**: `<script>` 태그가 시작되자마자 실행되는 `document.body.innerHTML += ...` 구문에 의해 `(0, 0)` 위치에 작은 노란색 별이 추가된다.
- **세 번째 별 (**`id=aa`**, 랜덤 색상)**: `<body>` 태그에 걸려 있는 `onload=kk(1,1)` 속성에 의해 생성된 별이다. `onload`는 페이지 로딩이 완료되는 시점에 특정 함수를 실행하는 이벤트 핸들러이므로, 페이지가 열리면서 `kk(1,1)` 함수가 자동 호출된 것이다. `kk(x, y)` 함수 내부를 보면 `Math.random()`을 이용해 랜덤한 색상 코드(`rndc`)를 생성하고 `onmouseover=this.innerHTML=''` 속성을 부여하는데, 세 번째 별에 마우스를 올렸을 때 별이 사라졌던 이유가 바로 이 이벤트 때문임을 알 수 있다.

다음으로 `<body>` 태그의 또 다른 속성인 `onkeypress=mv(event.keyCode)`와 `mv(cd)` 함수를 살펴보자. 이는 사용자가 키보드의 키를 누를 때마다 그 키의 아스키코드(ASCII Code) 값을 인자(`cd`)로 넘겨 `mv()` 함수를 실행하라는 의미다.

- 키를 누를 때마다 `kk()` 함수가 호출되어 별의 흔적을 남기고, 입력된 `cd` 값에 따라 `star.style.left`와 `star.style.top` 값을 변경해 큰 별의 가로·세로 위치를 50px씩 이동시킨다.
- 아스키코드 `100`(`d`), `97`(`a`), `119`(`w`), `115`(`s`)는 각각 우, 좌, 상, 하 이동을 담당하는 일종의 눈속임(방향키) 기능이다.
- 우리가 주목해야 할 진짜 핵심은 주석으로 `// do it!`이 달려 있는 `if(cd==124)` 구문이다.

따라서 별을 움직이는 `100`, `97`, `119`, `115` 조건은 전부 건너뛰고, `cd` 값이 `124`가 되도록 이벤트를 발생시키거나 해당 경로로 바로 이동하면 문제를 해결할 수 있다.

![](/images/wehacking-kr/old16/mwctj07m-efkhttg4.png)

## 3. 문제 풀이

`cd == 124` 조건이 참이 되면 `location.href = String.fromCharCode(124) + ".php"`가 실행되어 새로운 페이지로 리다이렉트된다. 여기서 `String.fromCharCode()`는 아스키코드 숫자를 문자로 변환해 주는 자바스크립트 내장 함수다.

아스키코드 124번에 해당하는 문자는 파이프 기호인 `|` 이다. 이를 이용해 문제를 푸는 방법은 두 가지가 있다.

1. **키보드 입력으로** `onkeypress` **이벤트 발생시키기**: 웹페이지 화면을 클릭해 포커스를 맞춘 뒤, 키보드에서 `|` (Shift + `\`) 키를 직접 누른다. 그러면 `event.keyCode`로 `124`가 전달되면서 자동으로 `|.php`로 이동하며 문제가 풀린다.
2. **URL 직접 접근 및 콘솔 활용**: 키보드 이벤트를 거치지 않고 곧바로 목적지 링크로 접속하는 방법이다. 개발자 도구(F12)의 Console 창에 `String.fromCharCode(124)`를 입력해 반환되는 문자가 `|`임을 확인하거나 콘솔에서 직접 `mv(124)`를 호출해도 되고, 브라우저 주소창의 경로 끝부분을 `|.php` (URL 인코딩 시 `%7C.php`)로 직접 수정하여 접속해도 동일하게 문제가 풀린다.

문제 해결!!