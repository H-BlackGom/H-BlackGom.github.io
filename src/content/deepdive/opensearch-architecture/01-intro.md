---
title: 'Intro: 숲을 보자'
takeaway: 클러스터·노드·샤드가 각각 무슨 일을 하는지 한 장으로 정리
description: 나무부터 보면 길을 잃습니다. OpenSearch 전체 구조를 먼저 훑습니다.
publishedAt: 2025-12-30
order: 1
tags: [opensearch, 검색엔진, 아키텍처]
# velog에 이미 올린 글이라면 원본을 가리켜 두세요.
# canonical: https://velog.io/@hblackgom/OpenSearch-Architecture-해부-1.-Intro-숲을-보자
---

> 이건 사용법을 보여주는 **샘플 글**입니다. 첫 글을 쓰면 지우세요.

딥다이브는 **디렉터리가 곧 시리즈**입니다. 이 글은
`src/content/deepdive/opensearch-architecture/01-intro.md` 에 있고,
같은 폴더의 글들이 자동으로 한 시리즈로 묶입니다. `series` 필드를 적지 않습니다.

## velog와 달라지는 점

velog에서는 제목에 `[OpenSearch Architecture 해부] 1.` 처럼 접두사를 붙여야
시리즈임을 알릴 수 있었습니다. 여기서는 **섹션과 시리즈 페이지가 그 역할을 하므로
제목에서 접두사를 떼도 됩니다.** 위 제목이 그냥 `Intro: 숲을 보자` 인 이유입니다.

제목에 콜론이 들어가면 YAML이 깨지므로 `'Intro: 숲을 보자'` 처럼 따옴표로 감싸세요.

## 필요한 건 order 하나

정렬은 `order`로 합니다. 파일명 앞의 `01-`은 사람이 보기 좋도록 붙인 것이고
실제 순서에는 영향이 없습니다.

`takeaway`는 시리즈 목차에 부제처럼 붙습니다. "이 편을 읽으면 무엇을 알게 되는가"를
한 줄로 적어두면, 목차만 보고도 어디를 읽어야 할지 판단할 수 있습니다.

## 진행률은 어디서 오나

`src/content/series/opensearch-architecture.json` 의 `plannedCount`입니다.
6편 예정 중 2편을 썼다면 33%로 표시됩니다. 예정 편수를 모르면 비워두세요 —
그러면 지금까지 쓴 편 수를 분모로 씁니다.
