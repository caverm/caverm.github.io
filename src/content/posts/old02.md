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

