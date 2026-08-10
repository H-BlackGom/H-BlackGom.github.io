---
title: velog를 떠나면서 남겨둔 것들
description: 플랫폼을 옮길 때 진짜 비용은 글이 아니라 유입 경로였다.
publishedAt: 2026-08-09
tags: [블로그, 회고]
# 이 글의 요약을 velog에도 올렸다면 링크를 넣어두세요.
# crosspostedTo: https://velog.io/@hyoungro/...
---

노트는 주제를 가리지 않는 칸입니다. 짧은 회고, 삽질 기록, 읽은 것 정리 —
"어디에 넣을지 모르겠는 글"의 기본 목적지입니다.

## 프론트매터는 이 다섯 개만 기억하면 됩니다

- `title` — 필수
- `publishedAt` — 필수. `2026-08-09` 형태
- `description` — 목록 카드와 검색 결과에 쓰입니다. 웬만하면 채우세요
- `tags` — 배열
- `draft: true` — 개발 서버에서만 보이고 빌드에서 빠집니다

## velog와의 관계

이 블로그가 원본이고 velog에 요약을 올렸다면 `crosspostedTo`에 링크를 넣으세요.
반대로 velog가 원본인 옛 글을 여기 옮겨왔다면 `canonical`에 velog URL을 넣습니다.
그러면 `<link rel="canonical">`이 velog를 가리켜서 검색엔진이 원본을 헷갈리지 않습니다.

```yaml
# 옛 velog 글을 아카이브 목적으로 옮겨온 경우
canonical: https://velog.io/@hyoungro/old-post
```
