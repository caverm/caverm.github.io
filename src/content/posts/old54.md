---
title: "[webhacking.kr] old-54"
slug: old54
published: 2026-11-02
draft: false
description: old54 write up
categoryId: webhacking-kr
lang: ko
---
1. 문제 개요

플랫폼 : [webhacking.kr](http://webhacking.kr)

난이도 : score 10

핵심 주제 : JS 함수 오버라이딩을 통한 DOM 객체 수정

2. 문제 분석

처음 문제 화면을 보면 플래그 값들이 매우 빠른 속도로 지나감을 확인할 수 있다.

플래그 값들이 모조리 찍힌 후에는 ? 가 찍힌 상태이다. 

![](/images/wehacking-kr/old-54/mvyqpqy4-0dk87og7.png)

플래그 값들을 찍는 코드를 확인하기 위해 개발자도구(F12) 를 열어 코드를 확인한다. 

코드는 서버와 비동기/동기 통신을 하기 위한 XMLHttpRequest 객체를 생성하는 초기화 함수 run(), 화면에 flag를 찍는 answer()로 이루어져 있다. 

중요한 것은 answer() 함수이다. 그 동작 순서는 다음과 같다.

- 코드가 ?m=0, ?m=1 ... 요청할 때마다 서버에서 플래그를 한 글자씩 던져준다. 
- aview.innerHTML = x.responseText; 코드를 통해 글자를 덮어쓴다. 
- i++; 를 통해 다음 플래그를 가져올 준비를 마친다. 
- if(x.responseText) setTimeout("answer("+i+")",20); 20ms 뒤에 anser(i) 를 호출한다.
- if(x.responseText=="") aview.innerHTML="?"; 서버로부터 빈 값을 받으면 ?로 덮어쓴다.

여기서 핵심은 플래그가 대입 연산자를 통해 덮어씌어진다는 것이다. 

이를 해결하기 위해 += 연산자를 사용해 덮어쓰지 않고 누적해 flag를 찍고자 한다.

```javascript
<!-- 수정 전 -->
function run(){
  if(window.ActiveXObject){
   try {
    return new ActiveXObject('Msxml2.XMLHTTP');
   } catch (e) {
    try {
     return new ActiveXObject('Microsoft.XMLHTTP');
    } catch (e) {
     return null;
    }
   }
  }else if(window.XMLHttpRequest){
   return new XMLHttpRequest();
 
  }else{
   return null;
  }
 }
x=run();
function answer(i){
  x.open('GET','?m='+i,false);
  x.send(null);
  aview.innerHTML=x.responseText;
  i++;
  if(x.responseText) setTimeout("answer("+i+")",20);
  if(x.responseText=="") aview.innerHTML="?";
}
setTimeout("answer(0)",1000);
```

3. 풀이 과정

+= 연산자를 사용해 flag를 화면에 누적시키는 것으로 수정했다.

또한 마지막 ? 또한 += 연산자를 사용해 ?를 누적시키고자 하였다.

개발자 도구(F12) 에서 콘솔창을 열어(ESC) 함수를 오버라이딩 한 결과는 아래 사진과 같다.

```javascript
<!-- 수정 후 -->
function answer(i){
  x.open('GET','?m='+i,false);
  x.send(null);
  aview.innerHTML+=x.responseText;
  i++;
  if(x.responseText) setTimeout("answer("+i+")",20);
  if(x.responseText=="") aview.innerHTML +="?";
}
setTimeout("answer(0)",1000);
```

![](/images/wehacking-kr/old-54/mvyqptqe-5rd705r9.png)

문제 해결!

4. 번외 풀이

개발자 도구의 network 탭을 확인하면 서버와의 통신 패킷을 확인할 수 있다. 

이를 통해 한글자씩 flag를 획득할 수도 있다.

![](/images/wehacking-kr/old-54/mvyr6rwe-v84a97y4.png)

