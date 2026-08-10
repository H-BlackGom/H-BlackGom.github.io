# 서빙하는 아빠곰 — h-blackgom.github.io

Astro 5 + GitHub Pages(user site) 개인 블로그.

이 파일에는 **어기면 사고 나는 규칙**만 둔다.
배경·설계 근거는 `README.md`, 발행 절차는 `/publish-post` 스킬에 있다.

---

## ⚠️ 1. 커밋 전 git 신원 검사 — 예외 없음

이 맥에는 **회사 계정과 개인 계정이 섞여 있다.** 전역 git 설정이 회사 신원이라
레포 로컬 설정이 빠지면 **공개 레포에 회사 신원이 영구히 박힌다.**

실제로 한 번 발생했다: `user.email` 만 확인하고 `commit.gpgsign` 을 놓쳐서
회사 GPG 키로 서명된 커밋이 push 됐다(공개 전에 발견해 레포를 재생성함).

**커밋 전 네 가지를 모두 확인한다.** 하나라도 어긋나면 커밋하지 말고 사용자에게 알린다.

```bash
git config user.email     # 29194595+H-BlackGom@users.noreply.github.com
git config commit.gpgsign # false  (전역은 true 다)
git config core.sshCommand # ssh -i ~/.ssh/id_ed25519_personal ...
git remote get-url origin  # H-BlackGom/H-BlackGom.github.io
```

- `@dramancompany.com`, `hyoungrolee`, 회사 GPG 키(`3D6683E891EF16F8`)가 보이면 **즉시 중단**
- 커밋 메시지에 **JIRA ID를 넣지 않는다** (개인 블로그. `commit` 스킬의 컨벤션을 적용하지 않는다)
- 이미 커밋한 뒤 발견했다면 `git commit --amend --no-gpg-sign --reset-author --no-edit`.
  **push 전에만 완전하다.**

## 2. push 는 항상 사용자 확인을 받고

push 하면 GitHub Actions가 곧바로 공개 사이트에 배포한다. 자동으로 밀지 않는다.

---

## 3. 콘텐츠

`src/content/<섹션>/*.md`. 섹션은 `notes`(끄적임) `deepdive` `til`(얕은 지식) `webtoon` `recipe`.

**URL과 컬렉션 id는 영문 그대로 두고 라벨만 `src/consts.ts` 에서 바꾼다.**
(예: 라벨 `끄적임`, URL `/notes`) 라벨을 바꿔도 링크가 깨지지 않는 이유다.

### 섹션별로 빠뜨리면 안 되는 것

| 섹션 | 필수 |
|---|---|
| `deepdive` | `order` + `src/content/series/<시리즈>.json` — **없으면 빌드가 일부러 실패한다** |
| `til` | `description` (카드 앞면이라 스키마에서 필수) |
| `webtoon` | 각 컷의 `width`/`height` — 없으면 스크롤 중 화면이 튄다(CLS) |
| `recipe` | `servings` `totalMinutes` `ingredients` — schema.org/Recipe 로 그대로 나간다 |

- **딥다이브는 디렉터리가 곧 시리즈다.** `series` 필드를 적지 않는다
- 웹툰 컷 목록은 손으로 적지 말고 `npm run webtoon:manifest` 로 만든다
- `draft: true` 와 미래 `publishedAt` 은 빌드에서 빠진다(예약 발행)
- 제목에 `[아빠곰의 얕은 지식]` 같은 대괄호 접두사를 넣지 않는다 — 섹션이 그 역할을 한다

### 개인 볼트와의 관계

개인 볼트 노트는 **옮기지 않고 복사**한다. 두 문서는 목적이 다른 별개 문서다.

**반입 후에는 `src/content/` 가 그 글의 원본이다.** 볼트 노트를 고쳐서 재반입하는
방식으로 갱신하지 않는다. 갱신은 `src/content/` 에서 직접 하고 `updatedAt` 을 찍는다.

볼트에 쓰는 것은 발행 표시와 `published: <URL>` 기록뿐. **본문은 건드리지 않는다.**

---

## 4. 디자인 — 세 규칙

`src/styles/global.css` 상단 토큰이 전부를 지배한다. 개별 컴포넌트에서 색·모서리·그림자를
직접 쓰지 않는다.

### 도트 폰트는 22px 이상, 두 곳에만

Galmuri11은 11px 비트맵이라 **한글이 22px 미만에서 깨진다.** 22px로 키워도
**문장이 되면 급격히 안 읽힌다.** 그래서 도트가 허용되는 자리는 둘뿐이다.

- 섹션 이름 (`.dot .section-title`) — 노트/딥다이브/얕은 지식/웹툰/레시피/#태그
- 헤더 브랜드, 홈 히어로·블록 제목 (`.dot`)

**그 외 전부 산세리프다.** 글 제목, 카드 제목, 본문 소제목, 본문, 설명.
`h1`~`h4` 기본값이 `--font-prose` 이고 도트를 원하면 `class="dot"` 을 명시해야 한다.
22px 미만 도트 크기 토큰은 **일부러 만들지 않았다.** 작은 글자는 `--label`(0.8rem).

### 콘텐츠를 가운데 정렬하지 않는다

모든 콘텐츠 컬럼은 `.wrap` 의 **왼쪽 끝에서 시작**하고 남는 공간은 오른쪽에 둔다.
`margin-inline: auto` 를 콘텐츠 블록에 쓰면 페이지를 옮길 때 왼쪽 기준선이 어긋난다.

허용되는 예외는 셋뿐: `.wrap` 자체, 본문 안 이미지, 웹툰 페이지(만화는 갤러리).

### 구분선은 넓게, 글줄은 좁게

페이지 머리말·꼬리말은 **`.page-block` 을 붙이고 `max-width` 를 주지 않는다.**
구분선은 `.wrap` 전체 폭을 쓰고 안쪽 텍스트만 `--measure` 로 묶인다.

- 구분선을 `--measure` 로 두면 홈의 섹션 구분선보다 짧아 글 페이지가 좁아 보인다
- 글줄까지 전체 폭으로 늘리면 64자/행이 되어 못 읽는다
- 같은 이유로 **본문 `h2` 에 구분선을 쓰지 않는다** (도트 블록 `::before` 로 대체)

### 글줄 폭의 한계는 rem이 아니라 자/행

```
자/행 = (measure × 16) ÷ 본문 font-size(px)
```

한국어 장문은 35~45자가 편하고 **45자가 상한**(본문 17px 기준 48rem).
현재 `--measure: 46rem` = 약 43자.

---

## 5. 검증 — 커밋 전에 돌린다

```bash
npm run doctor   # 깨진 내부 링크·갈라진 태그·빈 description·alt 누락
npm run check    # 타입
npm run build    # 빌드
```

`doctor` 의 **에러는 반드시 고친다.** 경고는 사용자에게 보여주고 판단을 받는다.
`astro check` 와 zod 스키마는 타입만 본다 — "실수인가"는 `doctor` 가 본다.

특히 **태그 분기**(`분산시스템` vs `분산 시스템`)는 사람 눈으로 늦게 발견되고,
쌓인 뒤 고치는 비용이 크다.

---

## 6. 구조

```
src/
├── consts.ts          사이트 정보 · 섹션 정의 · NAV  ← 라벨은 전부 여기
├── content.config.ts  컬렉션 스키마 7개
├── lib/content.ts     조회 · 시리즈 계산 · URL · 통합 피드 · 태그 집계
├── styles/global.css  디자인 토큰 · 폰트 · prose      ← 색/폭은 전부 여기
├── layouts/           BaseLayout · ArticleLayout(TOC 레일 포함)
├── components/        Header · Footer · PostCard · SeriesNav · WebtoonViewer
└── pages/             홈 · about · tags/[tag] · 섹션별 목록+상세 · rss.xml · 404

plugins/remark-strip-md.mjs   내부 링크의 .md 제거 (옵시디언 호환)
scripts/                       doctor · webtoon-manifest · publish · brand
.claude/skills/publish-post/   발행 절차
```

배포는 `main` push → `.github/workflows/deploy.yml` → GitHub Pages.
`astro.config.mjs` 의 `site` 가 canonical·OG·sitemap의 기준이다.
자체 도메인을 붙일 때 **그 한 줄만** 바꾸면 된다(user site라 `base` 가 없다).
