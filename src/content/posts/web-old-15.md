---
title: "[webhacking.kr] old-15"
slug: old-15
published: 2026-10-30
draft: false
description: webhacking.kr old-15 문제 write up
categoryId: webhacking-kr
lang: ko
---
### **1. 문제 개요**

플랫폼 : [webhacking.kr](http://webhacking.kr)

난이도 : score 5

핵심 주제 : javascript 동작



### **2. 문제 분석**

old-15 문제 페이지를 클릭하면 자바스크립트 alert가 발생합니다.

이후 확인 버튼을 클릭하면 [webhacking.kr](http://webhacking.kr) 메인 페이지로 이동하게 됩니다.

![](/images/wehacking-kr/old15/mvuh6las-sh95di4x.png)



### **3. 풀이 과정**

javascript의 alert 로 인해 페이지 소스 코드 보기가 어렵기 때문에 alert 동작을 일시적으로 멈추도록 합니다. 

이를 위해 크롬 브라우저의 설정을 변경합니다. 



**'설정 -> 개인 정보 보호 및 보안 -> 사이트 설정 -> 콘텐츠 | 자바스크립트 -> 사이트에서 Javascript를 사용하도록 허용하지 않음'**

이후 정상적으로 페이지 접속이 가능하며 소스 코드 또한 확인할 수 있습니다. 

```html
<html>
<head>
<title>Challenge 15</title>
</head>
<body>
<script>
  alert("Access_Denied");
  location.href='/';
  document.write("<a href=?getFlag>[Get Flag]</a>");
</script>
</body>
```

소스 코드 흐름이 다음과 같음을 확인할 수 있습니다. 

1. alert 띄우기
2. 사용자 확인 후 /, 즉 webhacking.kr/ 메인 페이지로 이동
3. document.write 실행 - getFlag 링크 생성

크롬 브라우저 설정을 통해 getFlag 링크가 생성되었음을 확인하였으니 자바스크립트 설정을 원복 후 해당 링크로 접속합니다. 

webhacking.kr/challengs/js-2/?getFlag

![](/images/wehacking-kr/old15/mvuh6q70-84hf1guv.png)

