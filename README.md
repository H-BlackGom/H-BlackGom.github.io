# 서빙하는 아빠곰 (serving-bear)

Astro 5 + GitHub Pages 개인 블로그. 콘텐츠 5종(끄적임 / 딥다이브 / 얕은 지식 / 웹툰 / 레시피)을
각각 다른 방식으로 보여주는 것이 이 스켈레톤의 목적입니다. 디자인은 **도트(픽셀)** 기조입니다.

```
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 생성
npm run check    # 타입 검사 (astro check)
npm run doctor   # 발행 전 점검 — 이게 실제로 사고를 막습니다
npm run brand    # 파비콘·OG·플레이스홀더 컷 재생성
```

---

## 0. 처음 한 번만 하는 일

1. **`astro.config.mjs`의 `site`를 자기 도메인으로 바꾸세요.** 가장 중요한 한 줄입니다.
   `username.github.io/repo` 로 쓸 거면 `base: '/repo'` 도 같이 켜세요.
2. **`src/consts.ts`** 의 `SITE`, `LINKS`(github / velog / instagram)를 채우세요.
3. 자체 도메인을 쓸 거면 **`public/CNAME`** 파일에 도메인 한 줄만 적어 넣으세요.
   (예: `blog.hyoungro.dev`) GitHub Pages가 이걸 읽습니다.
4. GitHub 레포 → **Settings → Pages → Source를 "GitHub Actions"** 로 바꾸세요.
   그 뒤 `main`에 push하면 `.github/workflows/deploy.yml` 이 빌드·배포합니다.
5. 파비콘·OG 이미지는 `npm run brand` 로 생성됩니다(도트 곰). 다른 그림으로 갈 거면
   `scripts/gen-brand-assets.mjs` 의 `BEAR` 비트맵을 고치거나 파일을 직접 갈아치우세요.
6. `src/content/` 안의 샘플 글 7개는 사용법 설명용입니다. 첫 글을 쓰면 지우세요.
   `public/webtoon/ep01/*.png` 도 플레이스홀더 컷입니다.

---

## 0.5 디자인 — 도트(픽셀)

규칙 세 가지를 `src/styles/global.css` 상단 토큰에 박아뒀습니다. 여기만 고치면 전체가 따라옵니다.

1. **`--radius: 0`** — 둥근 모서리 없음
2. **`--shadow: 3px 3px 0`** — blur 0. 그림자가 아니라 "밀린 사각형"
3. **`--border: var(--fg)`** — 흐린 회색 테두리 금지, 풀 콘트라스트

### 폭

| 토큰 | 값 | 쓰이는 곳 |
|---|---|---|
| `--measure` | 46rem (736px) | 본문 글줄. 17px 기준 **한글 약 43자/행** |
| `--wide` | 68rem (1088px) | 목록·홈의 최대 폭 |
| `--webtoon-w` | 48rem (768px) | 웹툰 컷 폭 (원본 800px보다 크게 줄지 않게) |

**한계는 rem이 아니라 자/행입니다.** 폰트 크기가 바뀌면 같은 rem이라도 자수가 달라집니다.

```
자/행 = (measure × 16) ÷ 본문 font-size(px)
```

한국어 장문은 **35~45자**가 편하고 **45자가 상한**입니다(본문 17px 기준 48rem).
그 이상은 줄 끝에서 다음 줄로 시선을 되돌릴 때 행을 놓치기 시작합니다.

본문·글 머리말·시리즈 목차·404가 모두 `--measure` 하나를 참조하므로 여기만 고치면
전부 함께 움직입니다.

### 목차 레일

글의 `h2`/`h3`가 **3개 이상일 때만** 목차가 나타납니다(짧은 글에는 방해만 되니까요).
`render()`가 주는 `headings`를 `ArticleLayout`에 넘기면 자동으로 판단합니다.

- **75rem 미만**: 본문 위에 박스로 쌓입니다
- **75rem 이상**: 본문 오른쪽 빈 공간에 `sticky`로 붙고, 읽는 절을
  `IntersectionObserver`로 강조합니다

폭 계산: 46rem(본문) + 2.5rem(간격) + 14rem(레일) = 62.5rem — `.wrap` 안에 들어갑니다.
**"글 페이지가 홈보다 좁다"는 문제가 여기서 해소됩니다** — 오른쪽 빈 공간이 기능으로 채워집니다.
레시피에서 재료를 sticky로 붙인 것과 같은 패턴입니다.

`.prose` 제목에는 `scroll-margin-top: 5.5rem`이 걸려 있어서 앵커로 이동해도
sticky 헤더에 제목이 가리지 않습니다.

### 구분선은 넓게, 글줄은 좁게 (`.page-block`)

페이지 머리말·꼬리말의 **구분선은 `.wrap` 전체 폭(68rem)** 을 쓰고,
**안쪽 텍스트만 `--measure`(46rem)** 로 묶습니다. 이 둘을 분리하는 게 핵심입니다.

- 구분선을 `--measure`로 두면 홈의 섹션 구분선보다 짧아서 글 페이지가 좁아 보입니다
- 그렇다고 글줄까지 68rem으로 늘리면 **64자/행**이 되어 못 읽습니다

그래서 `.page-block` 유틸리티를 씁니다. 새 페이지의 머리말·꼬리말에는 이 클래스를 붙이고,
블록 자체에는 `max-width`를 주지 마세요.

```html
<header class="list-head page-block"> ... </header>
```

같은 이유로 **본문 `h2`에는 구분선을 쓰지 않습니다** — 46rem에서 끊겨 머리말의
전체 폭 구분선과 어긋나 보입니다. 대신 앞에 도트 블록(`::before`)을 붙였습니다.

### 왼쪽 기준선 정렬 규칙 — ⚠️ 콘텐츠를 가운데 정렬하지 마세요

**모든 콘텐츠 컬럼은 `.wrap`의 왼쪽 끝에서 시작하고, 남는 공간은 오른쪽에 둡니다.**
`margin-inline: auto`를 콘텐츠 블록에 쓰면 페이지를 옮길 때 왼쪽 기준선이 어긋나서
글 페이지가 좁아 보입니다(실제로 이 문제를 겪고 고쳤습니다).

가운데 정렬이 허용되는 곳은 세 군데뿐입니다.

- `.wrap` — 페이지 컨테이너 자체
- `.prose img/video` — 본문 안 이미지
- 웹툰 페이지 — 만화는 갤러리처럼 가운데 두는 게 맞아서 예외입니다

폭도 `--measure` 하나로 통일했습니다. 목록 헤더(`.list-head`), 홈 히어로, 주인장 헤더,
글 머리말·본문·꼬리말, 시리즈 목차, 404가 전부 같은 값을 씁니다.
따라서 **목록 → 글로 이동해도 왼쪽 기준선과 컬럼 폭이 그대로 유지됩니다.**

카드 그리드(`.grid`)만 `--wide`를 꽉 씁니다 — 그리드는 채우는 게 목적이라 예외입니다.

호버는 `transition: transform .1s steps(2, end)` 로 **부드럽게 뜨지 않고 한 칸 툭 밀립니다.**
`steps()` 이징이 도트 느낌의 핵심입니다. 현재 위치/활성 상태는 반대로
그림자를 없애고 2px 밀어서 "눌린" 상태로 표현합니다(헤더 메뉴, 태그 필터).

### 폰트 — ⚠️ 도트는 "한 단어 라벨"에만 씁니다

이게 이 프로젝트에서 가장 중요한 규칙이고, 두 번 시행착오를 거쳐 정해졌습니다.

Galmuri11은 **11px 기준 비트맵**입니다. 라틴 문자는 11px에서도 버티지만
**한글은 초성·중성·종성이 그 안에 다 들어가야 해서 뭉개집니다.** 그리고 22px로 키워도
**문장이 되면 급격히 안 읽힙니다** — 글자마다 획이 굵고 균일해서 단어 경계가 사라집니다.

그래서 도트가 살아남는 자리는 딱 두 군데입니다.

| 쓰이는 곳 | 클래스 | 크기 |
|---|---|---|
| 섹션 이름 — 끄적임 / 딥다이브 / 얕은 지식 / 웹툰 / 레시피 / #태그 | `.dot .section-title` | 33 → 44px |
| 헤더 브랜드 — 서빙하는 아빠곰 | `.dot` | 22px |

**그 외 전부 산세리프입니다** — 글 제목, 시리즈 제목, 카드 제목, 본문 소제목(`.prose h2/h3`),
본문, 설명, 리드문. `h1`~`h4`는 기본이 `--font-prose`이고 도트를 원하면 `class="dot"`을
명시적으로 붙여야 합니다. 실수로 문장이 도트가 되는 걸 막기 위한 구조입니다.

| 토큰 | 폰트 | 쓰이는 곳 |
|---|---|---|
| `--font-dot` | Galmuri11 | `.dot` 뿐 (섹션 이름, 브랜드) |
| `--font-prose` | Pretendard/시스템 산세리프 | **기본 폰트.** 제목·본문·설명·작은 라벨 전부 |
| `--font-mono` | 시스템 모노 | 코드, `.tag`, `.pill`, `.eyebrow` — 터미널 톤만 빌려옵니다 |

- 22px 미만의 도트 크기 토큰은 **일부러 만들지 않았습니다.** 작은 글자는 `--label`(0.8rem).
- `-webkit-font-smoothing: none` 은 `.dot` 안에서만 켭니다(22px = 설계 크기의 2배라
  픽셀이 맞아떨어져 더 선명해짐). **본문에는 절대 켜지 마세요** — 산세리프가 거칠어집니다.
- 작은 라벨을 모노로 둔 이유: 11px 도트를 포기하되 레트로 톤은 유지하려고요.
  한글이 또렷하게 읽히면서 터미널 느낌이 남습니다(기존 `.log` 작명과도 맞습니다).
- 배경 도트 그리드(`--dot`)는 **글자 뒤에 깔리므로 대비를 낮게** 유지해야 합니다.
  진하게 하면 본문 가독성이 바로 떨어집니다.

폰트는 `public/fonts/` 에 자체 호스팅합니다(Galmuri, SIL OFL 1.1).
Regular 493K + Bold 163K이고 Regular만 `<link rel="preload">` 합니다.
한글 도트 폰트는 원래 이 정도 크기이고, 더 줄이려면 서브셋을 떠야 합니다.
Mono 도트(GalmuriMono11, 478K)는 코드 가독성과 용량 때문에 일부러 뺐습니다.

---

## 0.7 워딩은 `consts.ts` 한 곳에서

라벨은 전부 `src/consts.ts`에 모여 있습니다. 바꿔도 **URL과 컬렉션 이름은 그대로**이므로
링크가 깨지지 않습니다 (예: 라벨은 `끄적임`, URL은 `/notes`).

| 지금 쓰는 말 | 원래 후보였던 것 | 왜 이걸 골랐나 |
|---|---|---|
| `끄적임` | 노트, 잡기, 밑반찬 | "노트"가 식상해서. 딥다이브(깊게 판 것)와 축을 이룹니다 |
| `주인장` | 소개, About, 주방장 | 밥을 서빙하는 가게라는 세계관에 맞습니다 |
| `서빙하는 아빠곰` | 서빙곰, serving-bear | 원래 이름의 이중 의미(밥 서빙 / 서버 serving)를 유지 |

`SITE.description`에는 **나이와 특정 기술을 넣지 않습니다.** 나이는 매년 고쳐야 하고,
"분산 시스템·검색 엔진"처럼 주제를 못박으면 다루는 범위가 넓어질 때 바로 안 맞습니다.
대신 섹션이 하는 일(파고들기·정리·그리기·차리기)로 표현했습니다.

## 1. 콘텐츠 5종 쓰는 법

모든 섹션이 공유하는 필드: `title`(필수), `publishedAt`(필수), `description`,
`tags`, `draft`, `cover`, `canonical`, `crosspostedTo`.

`draft: true` 는 개발 서버에서만 보이고 빌드에서 빠집니다.
**미래 날짜도 마찬가지로 빌드에서 빠집니다** — 예약 발행처럼 쓸 수 있습니다.

### 끄적임 — `src/content/notes/<slug>.md`

가장 평범한 글. 추가 필드 없음. "어디에 넣을지 모르겠는 글"의 기본 목적지입니다.

### 딥다이브 — `src/content/deepdive/<시리즈>/<slug>.md`

**디렉터리가 곧 시리즈입니다.** `series` 필드를 적지 않습니다. 대신:

- 시리즈 메타데이터를 `src/content/series/<시리즈>.json` 에 만듭니다
  (`title`, `description`, `status`, `startedAt`, `plannedCount?`)
- 각 글에 `order: 1` 로 순서를 줍니다
- `takeaway`: "이 편을 읽으면 무엇을 알게 되는가" 한 줄. 목차에 부제로 붙습니다

진행률(`3 / 5편`)은 `plannedCount`를 분모로 계산합니다. 비워두면 지금까지 쓴 편 수가 분모입니다.
목차·현재 위치·이전/다음 편은 전부 파일 시스템에서 자동 계산되므로 어디에도 등록하지 않습니다.

`src/content/series/<시리즈>.json` 이 없으면 **빌드가 일부러 실패합니다** —
시리즈 이름을 오타 냈을 때 조용히 새 시리즈가 생기는 걸 막기 위해서입니다.

### 얕은 지식 — `src/content/til/<slug>.md`

- `description` **필수**. 이게 카드 앞면입니다. 한 문장으로 개념이 서게 쓰세요
- `aka: [idempotency]` — 영문 용어 등을 병기하면 카드 목록 검색에 함께 걸립니다

목록 페이지는 **검색 + 태그 필터**가 붙은 카드 벽입니다. 필터는 빌드 시 심어둔
data 속성으로 동작해서 런타임 요청이 없습니다. 글 하단에는 태그가 겹치는 카드를
3개까지 자동 추천합니다.

### 레시피 — `src/content/recipe/<slug>.md`

```yaml
servings: 아이 1 + 성인 2 # 자유 문자열
totalMinutes: 45 # 손질+조리 합계
kidFriendly: true # 목록에 "아이도 OK" 배지
ingredients:
  - group: 주재료 # group 생략 가능
    items: [닭 600g, 감자 2개]
  - group: 양념
    items: [간장 4T, 맛술 2T]
```

세 필드가 **필수**인 이유: 그대로 **schema.org/Recipe 구조화 데이터**로 나갑니다.
구글 레시피 리치 결과(조리 시간·사진이 붙은 카드)에 잡힐 수 있어서, 이 블로그에서
검색 노출이 가장 유리한 섹션입니다. `cover`에 완성 사진을 넣으면 효과가 커집니다.

넓은 화면(60rem↑)에서는 재료가 왼쪽에 `sticky`로 붙어 따라옵니다 —
요리하면서 재료를 다시 보려고 스크롤을 올릴 일이 없습니다.

### 웹툰 — `src/content/webtoon/<slug>.md`

```yaml
episode: 1
format: scroll # 'scroll'=세로 스크롤툰(기본), 'carousel'=인스타툰(가로 스와이프)
panels:
  - src: /webtoon/ep01/01.png
    width: 800
    height: 1000
    alt: 컷 설명
```

**`width`/`height`는 필수입니다.** 없으면 스크롤 중 화면이 튑니다(CLS).
손으로 적지 말고 생성하세요 — 로컬 파일과 Cloudinary URL 둘 다 됩니다.

```bash
# 로컬 디렉터리 (파일명 자연순 정렬)
npm run webtoon:manifest -- public/webtoon/ep01

# Cloudinary URL 직접 (준 순서를 그대로 유지)
npm run webtoon:manifest -- https://res.cloudinary.com/.../01.png https://.../02.png

# URL 목록 파일 (한 줄에 하나, # 주석 허용)
npm run webtoon:manifest -- ep01.txt

# 옵션
--alt    alt 자리를 비워둔 채 출력
--auto   Cloudinary URL에 f_auto,q_auto 를 끼워 넣음
```

출력된 `panels:` 블록을 frontmatter에 붙여넣으면 됩니다.
원격 이미지는 받아서 크기를 재므로 URL을 줘도 `width`/`height`가 정확히 채워집니다.

`--auto`가 넣는 `f_auto,q_auto`는 브라우저에 맞춰 WebP/AVIF로 자동 변환하고 화질을
자동 조절합니다. **원본 크기는 바꾸지 않으므로 width/height는 그대로 유효합니다.**
모바일에서 웹툰 컷 전송량이 크게 줄어드니 켜두는 쪽을 권합니다.

**인스타툰 전환은 `format: carousel` 한 줄입니다.** 같은 원고로 세로 스크롤과
가로 스와이프 둘 다 렌더되므로, 나중에 인스타툰으로 방향을 바꿔도 원고를 다시 만들 필요가 없습니다.

본문(작가의 말)은 비워두면 그 영역이 아예 렌더되지 않습니다.

> **이미지 호스팅**: 지금은 `public/` 에 넣는 구조입니다. 화수가 쌓이면 레포가 무거워지니
> 20화쯤에서 Cloudflare R2나 Cloudinary로 옮기세요. `src`에 절대 URL을 쓰고
> `astro.config.mjs`의 `image.remotePatterns`에 도메인을 추가하면 나머지는 그대로 동작합니다.

---

## 2. velog 병행 운영

velog를 버리지 않고 **유입 채널**로 쓰는 전제로 필드가 두 개 있습니다.

| 상황 | 넣을 필드 | 효과 |
|---|---|---|
| 이 블로그가 원본, velog에 요약+링크를 올림 | `crosspostedTo: https://velog.io/...` | 글 하단에 velog 링크 안내 |
| velog가 원본, 옛 글을 여기로 아카이브 | `canonical: https://velog.io/...` | `<link rel="canonical">`이 velog를 가리켜 검색엔진이 원본을 헷갈리지 않음 |

velog는 외부 canonical 지정 기능이 없으므로, **전문 크로스포스트는 구글이 velog 쪽을
원본으로 고를 위험이 있습니다.** 딥다이브처럼 공들인 글은 velog에 도입부 + 링크만 올리는 쪽을 권합니다.

---

## 3. 옵시디언과의 관계

### 원칙 — 두 문서는 같은 문서가 아닙니다

| | 개인 볼트 노트 | 블로그 글 |
|---|---|---|
| 독자 | 나 | 남 |
| 형태 | 단편적, 링크 밀집, 미완성 허용 | 완결된 서술, 도입·맥락·결론 |
| 내용 | 사적 맥락 포함 | 그걸 걷어낸 버전 |

**정원과 수확의 관계입니다. 열매를 딴다고 나무를 옮기지 않습니다.**
개인 볼트 노트는 **옮기지 않고 복사**합니다. 그래야 지식 그래프에 구멍이 안 생깁니다.

> 참고: 개인 볼트를 블로그 빌드가 직접 읽게 하는 방식은 불가능합니다 —
> GitHub Actions 러너에 볼트가 없어서 "push하면 배포"가 깨집니다.
> 그래서 발행본이 이 레포에 물리적으로 존재해야 합니다.

### ⚠️ 반입은 글당 한 번, 그 뒤엔 블로그가 원본

복사한 뒤 오타 수정·문장 다듬기는 **`src/content/` 에서** 합니다.
그래서 반입 스크립트는 이미 있는 파일을 **절대 조용히 덮지 않습니다.**

```bash
OBSIDIAN_VAULT=~/vault npm run publish -- --candidates            # 발행 후보 노트 목록
OBSIDIAN_VAULT=~/vault npm run publish                            # 미리보기(기본)
OBSIDIAN_VAULT=~/vault npm run publish -- --write                 # 새 글만 반입
OBSIDIAN_VAULT=~/vault npm run publish -- --write --force         # 기존 글 diff만 확인
OBSIDIAN_VAULT=~/vault npm run publish -- --write --force --yes   # 실제 덮어쓰기
```

`--candidates` 는 **발행 표시가 없는 노트를 최근 수정순으로** 보여줍니다
("방금 끝낸 그 노트"가 위에 옵니다). `/publish-post` 스킬이 이걸로 후보를 제시하고,
고른 노트에 발행 표시를 대신 넣어줍니다 — **필드 이름을 외울 필요가 없습니다.**

| 대상 파일 상태 | 기본 동작 |
|---|---|
| 없음 | 반입 |
| 있고 내용 동일 | 건너뜀 |
| 있고 내용 다름 | **보호(건너뜀) + 경고** |
| 있고 내용 다름 + `--force` | diff만 출력하고 **쓰지 않음** |
| 있고 내용 다름 + `--force --yes` | 덮어씀 |

반입에 성공하면 볼트 노트 frontmatter에 `published: <URL>` 한 줄을 기록합니다
(볼트에 쓰는 유일한 지점, `--no-stamp` 로 끌 수 있음). 텍스트로 삽입하므로
개인 노트의 다른 필드는 **바이트 그대로 보존**됩니다.

이걸로 볼트에서 "발행했다"를 알 수 있고, Dataview로 발행한 노트 목록을 뽑을 수 있습니다.

**볼트 노트를 크게 고쳐서 블로그도 갱신하고 싶을 때**는 반입을 다시 돌리지 말고
`src/content/` 쪽을 직접 고치고 `updatedAt` 을 찍으세요.

### 볼트 노트 frontmatter

```yaml
---
publish: true
blog: deepdive # notes | deepdive | til | webtoon | recipe
series: opensearch-architecture # deepdive 전용 — 이 값이 폴더가 됩니다
order: 3 # deepdive 전용
slug: shard-count # 없으면 파일명에서 만듭니다
title: 샤드 수는 왜 못 바꾸는가
publishedAt: 2026-08-10
tags: [opensearch]
아무거나: 볼트 전용 필드는 반입할 때 걸러집니다
---
```

스크립트가 하는 변환:

- `![[image.png]]` → 이미지를 `public/images/<섹션>/<slug>/` 로 복사하고 경로를 고쳐씁니다
- `[[다른 노트|보이는 글자]]` → 그 노트도 발행 대상이면 실제 링크로, 아니면 죽은 링크가 되지 않게 텍스트만 남깁니다
- `%%옵시디언 주석%%` → 삭제
- 스키마에 없는 필드 → 제거 (`publish`, `blog`, `series`, `slug` 포함)
- 날짜 → `2026-08-10` 형태로 정규화

**스크립트가 못 하는 것**: 사적 맥락 제거, 도입부 추가. 그게 정원과 수확의 차이입니다.

### `src/content/` 를 옵시디언 볼트로 열기 (선택)

발행본을 옵시디언으로 편집하고 싶으면 `src/content/` 를 **별도 볼트**로 열면 됩니다.
사본이 안 생기므로 동기화 문제가 없습니다.

옵시디언 설정을 이렇게 바꾸세요.

```
Settings → Files & Links
  Use [[Wikilinks]]   → OFF
  New link format     → Absolute path in vault
```

그러면 링크 자동완성이 `[CAP 이론](/til/cap-theorem.md)` 형태로 삽입되고,
`plugins/remark-strip-md.mjs` 가 빌드 때 `.md` 를 떼어 `/til/cap-theorem` 으로 맞춥니다.

**위키링크 파서를 만들지 않은 이유**: `[[...]]` 는 마크다운 표준이 아니라 이식성을
해칩니다. 이 방식은 링크가 옵시디언에서도, 블로그에서도, 다른 플랫폼에서도 유효합니다.
`doctor` 도 `.md` 를 벗기고 링크를 검사하므로 오타 안전망은 그대로입니다.

---

## 3.5 발행 전 점검 — `npm run doctor`

`astro check`(타입)와 zod 스키마(필드 형태)가 못 잡는 것들을 잡습니다.
**빌드는 통과하지만 사람이 보면 잘못된 것들**입니다.

```bash
npm run doctor              # 에러가 있으면 exit 1
npm run doctor -- --strict  # 경고도 실패로 취급 (CI에 넣을 때)
```

| 등급 | 잡는 것 |
|---|---|
| 에러 | 존재하지 않는 내부 링크 (`/til/cap-theorm` 같은 오타) |
| 에러 | 딥다이브가 시리즈 폴더 밖에 있음 / `series/<이름>.json` 누락 |
| 에러 | 같은 시리즈에서 `order` 중복, 웹툰 `episode` 중복 |
| 경고 | `description` 비었음 — 목록 카드와 검색 결과가 비어 보입니다 |
| 경고 | 웹툰 컷 `alt` 누락 — 접근성 + 이미지 검색 유입 손실 |
| 경고 | 레시피 `cover` 없음 — 리치 결과가 약해집니다 |
| 경고 | `canonical`과 `crosspostedTo` 동시 설정 (모순) |
| 경고 | **태그가 갈라짐** — `분산시스템` vs `분산 시스템` 같은 쌍을 찾아냅니다 |
| 참고 | `draft`/미래 날짜로 빌드에서 빠지는 글 목록 |

태그 탐지가 특히 값어치가 있습니다. 태그 시스템이 망가지는 가장 흔한 경로가
**오타로 태그가 조용히 두 개로 갈라지는 것**인데, 사람 눈으로는 목록이 길어지기 전까지
알아채기 어렵습니다. 편집거리 1 이하이고 한쪽이 1번만 쓰인 쌍만 보고하므로 오탐이 적습니다.

## 3.7 글 한 편 발행하는 순서

> **외우지 마세요.** Claude Code에서 `/publish-post` 를 호출하면
> 아래 순서를 대신 진행합니다 (`.claude/skills/publish-post/SKILL.md`).
> 아래는 그 스킬의 원본 런북이자, 스킬 없이 직접 할 때의 참고입니다.

```bash
# 1. 개인 볼트에서 글 완성 → frontmatter 채우기 (publish: true, blog: <섹션>)

# 2. 어디로 갈지 먼저 확인 (아무것도 쓰지 않음)
OBSIDIAN_VAULT=~/vault npm run publish

# 3. 반입
OBSIDIAN_VAULT=~/vault npm run publish -- --write

# 4. 블로그 글로 다듬기 — 여기서부터 src/content/ 가 원본
#    사적 맥락 제거, 도입부 추가, description 확인
npm run dev        # http://localhost:4321 에서 확인

# 5. 점검
npm run doctor     # 링크 오타·태그 분기·빈 description·alt 누락
npm run check      # 타입

# 6. 커밋 → 배포 (Actions 가 빌드·배포)
git add -A && git commit -m "..." && git push
```

**웹툰이면 3번과 4번 사이에** 컷 목록을 만듭니다.

```bash
npm run webtoon:manifest -- https://res.cloudinary.com/.../01.png ... --auto --alt
# 출력된 panels: 블록을 frontmatter에 붙여넣고 alt 채우기
```

**velog에도 올릴 거면 6번 뒤에**: velog에 도입부 + 링크만 올리고,
블로그 글 frontmatter에 `crosspostedTo: <velog URL>` 을 추가해 다시 커밋합니다.

> 급할 때는 4·5번을 건너뛰어도 배포는 됩니다. 대신 `doctor` 를 건너뛰면
> 깨진 링크와 갈라진 태그가 쌓입니다 — 나중에 한꺼번에 고치는 게 훨씬 비쌉니다.

## 4. 배포

`main`에 push하면 끝입니다. `withastro/action`이 설치·빌드·업로드를,
`actions/deploy-pages`가 배포를 합니다.

**로컬에 node가 없어도 글은 쓸 수 있습니다.** GitHub 웹 에디터(또는 모바일 브라우저)에서
`.md` 파일을 추가하고 커밋하면 Actions가 빌드해서 배포합니다.

---

## 5. 아직 안 한 것 (우선순위 순)

1. **구글 서치 콘솔 + 네이버 서치어드바이저 등록.** `sitemap-index.xml`과 `rss.xml`은
   이미 빌드에 포함되어 있으니 제출만 하면 됩니다. 한국어 블로그에서 네이버 누락은 은근히 큽니다
2. **OG 이미지 자동 생성** — 지금은 `public/og-default.png` 하나를 공용으로 씁니다.
   글마다 만들려면 `satori` 로 붙일 수 있습니다. 도트로 뽑으려면 글자까지 비트맵으로 찍어야 합니다
3. **댓글(giscus)** — GitHub Discussions 기반. 무료지만 로그인 장벽 때문에 댓글이 거의 안 달립니다.
   반응이 동기부여였다면 velog 크로스포스트를 유지하는 게 낫습니다
4. **Galmuri 서브셋** — 493K를 줄이려면 실제 쓰는 글자만 남기는 서브셋이 필요합니다.
   `subset-font`(harfbuzz wasm) 로 빌드 단계에 넣을 수 있습니다
5. **velog 옛 글 이전** — 6편. `canonical`을 velog로 두고 아카이브만 할지, 원본을 옮길지 결정이 먼저입니다.
   진행 중인 시리즈라면 **이쪽을 원본으로 옮기고 velog는 도입부+링크로 줄이는 쪽**을 권합니다 —
   canonical을 velog로 두면 새 도메인은 그 키워드로 영구히 순위를 못 올립니다

### 보류 중인 결정 두 가지

- **옵시디언과 레포를 어떻게 겹칠지.** 유력한 안은 `src/content/` 자체를 옵시디언 볼트로
  여는 것입니다(사본이 안 생겨서 동기화·드리프트 문제가 사라짐). 이걸 택하면 위키링크를
  빌드 때 실제 링크로 바꾸는 remark 플러그인이 같이 필요합니다.
- **⚠️ `scripts/publish-from-obsidian.mjs` 에 데이터 유실 경로가 있습니다.**
  존재 확인 없이 `writeFile`로 덮어씁니다 — 레포에서 고친 내용이 다음 반입 때 사라집니다.
  위 결정이 나면 덮어쓰기 방지를 넣을 예정입니다. **그전까지 `--write`는 새 글에만 쓰세요.**

> ⚠️ 이 순서를 지키는 것보다 중요한 건 **글을 쓰는 것**입니다.
> 자체 블로그 전환의 압도적 1위 실패 모드는 "블로그 만들기가 취미가 되고 글은 안 씀"입니다.
> 기능 추가는 글 3편당 1개 정도로 예산을 걸어두세요.

---

## 구조

```
src/
├── consts.ts            사이트 정보 · 섹션 4종 · NAV (헤더/홈/RSS가 이걸 참조)
├── content.config.ts    컬렉션 스키마 7개 (notes, deepdive, series, til, webtoon, recipe, now)
├── lib/content.ts       조회 · 시리즈 계산 · URL · 통합 피드 · 태그 집계
├── styles/global.css    도트 디자인 토큰 + Galmuri @font-face + prose
├── layouts/
│   ├── BaseLayout       html 껍데기 (contained={false} 로 전폭 레이아웃)
│   └── ArticleLayout    글 공용 (제목부 · prose · JSON-LD · canonical 안내)
├── components/
│   ├── SeriesNav        딥다이브 목차 + 진행률 + 이전/다음
│   ├── WebtoonViewer    스크롤툰 / 인스타툰 렌더 + 진행바
│   └── PostCard         목록 카드
└── pages/
    ├── index            히어로 + 섹션 4칸 + 최근 + 태그 둘러보기
    ├── about            소개 · 섹션 안내 · 요즘(now.json) · 링크
    ├── tags/[tag]       태그 아카이브
    ├── notes|deepdive|til|webtoon|recipe   섹션별 목록 + 상세
    └── rss.xml, 404
```

스크립트 4개: `brand`(애셋) · `webtoon:manifest`(컷 목록) · `publish`(옵시디언 반입) · `check`(타입).
