---
name: publish-post
description: 서빙하는 아빠곰 블로그에 글 한 편을 발행한다. 개인 볼트에서 반입 → 블로그 글로 다듬기 → doctor/check 점검 → 커밋·푸시까지 순서대로 안내한다. 섹션별 필수 필드(웹툰 컷 매니페스트, 레시피 cover, 딥다이브 시리즈)와 velog 크로스포스트도 챙긴다. 이미 발행된 글 수정도 이 스킬로 한다. "/publish-post", "블로그 글 발행", "새 글 올려줘", "블로그에 올려줘", "글 발행해줘" 라고 하면 사용.
---

# publish-post

`hyoungro-blog`(서빙하는 아빠곰)에 글 한 편을 발행하는 전체 플로우를 진행한다.

## 이 스킬이 반드시 지키는 것

1. **반입은 글당 한 번.** 반입 후에는 `src/content/` 가 그 글의 원본이다.
   볼트 노트를 고쳐서 다시 반입하는 방식으로 갱신하지 않는다.
2. **스크립트는 기계적 변환만 한다.** 사적 맥락 제거와 도입부 추가는 사람이 한다.
   무엇이 사적인지(회사명·동료·미공개 정보)는 **반드시 사용자에게 확인**한다.
2-1. **개인 볼트에는 두 가지만 쓴다** — 발행 표시(`publish`/`blog` 등, Step 1-3)와
   반입 후 `published: <URL>` 기록. 둘 다 **줄 추가만** 하고 기존 내용은 건드리지 않는다.
   볼트 노트의 본문을 고치지 않는다.
3. **`npm run doctor` 통과 전에 push 하지 않는다.**
4. **push 는 항상 사용자 확인을 받고 한다.** 자동으로 밀지 않는다.
5. 커밋 메시지에 **JIRA ID를 넣지 않는다.** 개인 블로그이므로 `commit` 스킬의
   JIRA 컨벤션을 적용하지 않는다.

---

## Step 0. 전제 확인 후 진입점 묻기

먼저 `hyoungro-blog` 레포에 있는지 확인한다 (`package.json` 의 name).
아니면 사용자에게 알리고 중단한다.

그다음 **어디서 시작하는지 물어본다.** 추측하지 말 것.

| 진입점 | 다음 단계 |
|---|---|
| (a) 개인 볼트에 완성된 노트가 있다 | Step 1 부터 |
| (b) 이미 `src/content/` 에 초안이 있다 | Step 2 부터 |
| (c) 지금부터 새로 쓴다 | Step 2 부터 (파일 생성) |
| (d) 이미 발행된 글을 수정한다 | 맨 아래 "발행된 글 수정" 절로 |

---

## Step 1. 개인 볼트에서 반입 (진입점 a)

> **사용자가 볼트에서 미리 뭘 준비해야 하는 게 아니다.**
> 노트만 다 써두면 되고, 발행 표시(`publish`/`blog` 등)는 **이 스킬이 넣는다.**
> 필드 이름이나 섹션 id를 사용자에게 외우라고 요구하지 않는다.

### 1-1. 볼트 경로 확인

```bash
printenv OBSIDIAN_VAULT
```

비어 있으면 볼트 경로를 물어보고, 이번 세션에서는 명령마다 앞에 붙여 쓴다.
그리고 **매번 묻지 않게 셸 프로필에 넣어두라고 한 번 안내한다**
(`export OBSIDIAN_VAULT=~/…` in `~/.zshrc`).

### 1-2. 어느 노트인지 정하기

사용자가 노트를 특정하지 않았다면 후보를 보여주고 고르게 한다.

```bash
OBSIDIAN_VAULT=<경로> npm run publish -- --candidates
```

발행 표시가 없는 노트를 **최근 수정순**으로 보여준다("방금 끝낸 그 노트"가 위에 온다).
사용자가 경로나 제목을 바로 말하면 이 단계를 건너뛴다.

### 1-3. 발행 표시를 볼트 노트에 넣기 — 스킬이 한다

사용자에게 **섹션만 물어본다.**

| 섹션 | 무엇을 담는 칸인지 |
|---|---|
| `notes` | 끄적임 — 주제를 가리지 않는 짧은 기록 |
| `deepdive` | 한 주제를 시리즈로 끝까지 |
| `til` | 얕은 지식 — 개념 하나를 짧게 |
| `webtoon` | 웹툰 |
| `recipe` | 레시피 |

그다음 **Edit 도구로 볼트 노트 frontmatter에 필드를 추가한다.**
frontmatter가 없으면 새로 만들어 맨 위에 넣는다.
**기존 필드는 건드리지 않고 줄만 추가한다.**

넣을 것:

```yaml
publish: true
blog: <섹션>
publishedAt: <오늘 날짜 YYYY-MM-DD>   # 없으면 필수. 없으면 반입이 건너뛴다
title: <제목>                         # 없으면 추가
description: <한 문장>                # til은 필수. 나머지도 권장
slug: <영문 slug>                     # 생략하면 파일명이 URL이 된다.
                                      # 한글 파일명이면 URL도 한글이 되므로 지정을 권한다
```

**딥다이브면 추가로**: `series`, `order`.
기존 시리즈를 확인하고 사용자에게 어디에 속하는지 묻는다.

```bash
ls src/content/series/
```

새 시리즈면 `src/content/series/<슬러그>.json` 을 먼저 만든다
(`title`, `description`, `status`, `startedAt`, `plannedCount?`).
**이 파일이 없으면 빌드가 일부러 실패한다.**

`order` 는 그 시리즈의 기존 최대값 + 1 을 제안한다.

### 1-4. 미리보기 → 반입

미리보기를 건너뛰지 않는다.

```bash
OBSIDIAN_VAULT=<경로> npm run publish              # 아무것도 쓰지 않음
OBSIDIAN_VAULT=<경로> npm run publish -- --write   # 새 글만 반입
```

출력을 사용자에게 그대로 전달한다.

- `새 글 N개` — 반입됨
- `보호됨 N개` — **이미 있고 내용이 다른 글. 이건 정상 동작이다.**
  덮어쓰기를 원하면 `--force`(diff만 확인) → `--force --yes`(실제 덮어쓰기) 순서로만 가고,
  **`--force --yes` 는 사용자가 diff를 보고 명시적으로 승인한 뒤에만** 실행한다.
- `건너뜀 N개` — 내용이 동일해서 쓸 필요가 없었다는 뜻

반입에 성공하면 볼트 노트에 `published: <URL>` 이 자동 기록된다. 이건 정상이다.

---

## Step 2. 블로그 글로 다듬기 — 여기가 사람의 일

**이 단계를 스킵하지 않는다.** 개인 노트와 블로그 글은 목적이 다른 별개 문서다.

반입/작성된 파일을 읽고 아래를 점검한 뒤, **사용자에게 확인받는다.**

- [ ] **사적 맥락 제거** — 회사명, 동료 이름, 미공개 정보, 내부 URL.
      의심되는 것을 찾아 **목록으로 제시하고 사용자 판단을 받는다.** 혼자 지우지 않는다.
- [ ] **도입부** — 개인 노트는 맥락 없이 시작한다. 첫 문단이 "왜 이 글인지"를 세우는지 확인
- [ ] **`description`** — 목록 카드와 검색 결과에 쓰인다. 한 문장으로 글이 서는지
- [ ] **내부 링크** — 발행되지 않은 노트를 가리키는 링크가 남아 있지 않은지
- [ ] **제목에 대괄호 접두사가 없는지** — velog에서 쓰던 `[아빠곰의 얕은 지식]` 같은 것.
      여기서는 섹션이 그 역할을 하므로 뗀다

### 섹션별 필수 필드

| 섹션 | 추가로 반드시 필요한 것 |
|---|---|
| `notes` | 없음 |
| `deepdive` | `order`, 그리고 `src/content/series/<시리즈>.json` 존재 (없으면 빌드 실패) |
| `til` | `description` **필수**(카드 앞면), `aka` 권장(영문 용어 병기) |
| `recipe` | `servings`, `totalMinutes`, `ingredients`, `cover` 권장 |
| `webtoon` | `episode`, `panels`(각 컷 `src`/`width`/`height`), `format` |

### 웹툰이면 컷 매니페스트를 만든다

`width`/`height` 없이는 스크롤 중 화면이 튄다(CLS). 손으로 적지 말고 생성한다.

```bash
# Cloudinary URL (권장) — --auto 로 WebP/AVIF 자동 변환까지
npm run webtoon:manifest -- <URL들> --auto --alt

# 로컬 파일이면
npm run webtoon:manifest -- public/webtoon/ep01 --alt
```

출력된 `panels:` 블록을 frontmatter에 붙여넣고 **`alt` 를 채운다.**
alt는 사용자에게 컷 설명을 물어보거나, 초안을 제시해 승인받는다.

---

## Step 3. 점검

```bash
npm run doctor
npm run check
```

`doctor` 의 **에러는 반드시 고치고 넘어간다.** 경고는 사용자에게 보여주고 판단을 받는다.

자주 나오는 것과 대처:

| 출력 | 대처 |
|---|---|
| 존재하지 않는 내부 링크 | 오타 수정, 또는 그 글이 아직 미발행이면 링크 제거 |
| 태그가 갈라진 것 같습니다 | 한쪽으로 통일. 어느 쪽으로 할지 사용자에게 확인 |
| `description` 비었음 | Step 2로 돌아간다 |
| 웹툰 `alt` 누락 | 채운다 |
| 레시피 `cover` 없음 | 사진이 있으면 넣고, 없으면 사용자 승인 후 넘어간다 |

그다음 **로컬에서 눈으로 확인하도록 권한다.**

```bash
npm run dev   # http://localhost:4321
```

배포 전 실제 렌더를 한 번 보는 것을 권하되, 사용자가 생략하겠다면 존중한다.

---

## Step 4. 커밋 · 배포

### 4-0. ⚠️ 커밋 전 신원 검사 — 건너뛰지 않는다

이 레포는 **개인 계정**용인데 이 맥으로는 **회사 계정**도 쓴다.
전역 git 설정이 회사 신원(`hyoungrolee` / `@dramancompany.com` / 회사 GPG 키)이라
레포 로컬 설정이 빠지면 **공개 레포에 회사 신원이 영구히 박힌다.**

실제로 한 번 발생했다: `user.email` 만 확인하고 `commit.gpgsign` 을 놓쳐서
회사 GPG 키로 서명된 커밋이 push 됐다. **세 가지를 모두** 확인한다.

```bash
git config user.email          # noreply 여야 함 (@dramancompany.com 이면 중단)
git config commit.gpgsign      # false 여야 함 (전역이 true 다)
git remote get-url origin      # H-BlackGom/... 이어야 함
```

기대값:

| 항목 | 기대값 | 틀리면 |
|---|---|---|
| `user.email` | `29194595+H-BlackGom@users.noreply.github.com` | 커밋 중단, 로컬 설정 다시 |
| `commit.gpgsign` | `false` | `git config --local commit.gpgsign false` |
| `core.sshCommand` | 개인 키(`id_ed25519_personal`) | 회사 키로 push 됨 |
| `remote` | `H-BlackGom/H-BlackGom.github.io` | 잘못된 레포 |

**하나라도 어긋나면 커밋하지 말고 사용자에게 알린다.**
이미 커밋한 뒤 발견했다면 `git commit --amend --no-gpg-sign --reset-author --no-edit` 로
고칠 수 있다 — 단 **push 전에만** 완전하다.

### 4-1. 커밋

```bash
git status          # 의도한 파일만 변경됐는지 확인
git add <파일들>     # -A 보다 명시적으로
```

커밋 메시지는 한글로, JIRA ID 없이. 형식:

```
<섹션> <제목> 발행

- (필요하면 부가 설명)
```

예: `얕은 지식 PACELC 이론 발행`, `웹툰 1화 크리스마스_마켓_비용_최적화_실패.log 발행`

**push 는 사용자 확인을 받고 한다.** push 하면 GitHub Actions가 빌드·배포한다.

---

## Step 5. velog 크로스포스트 (선택)

사용자에게 velog에도 올릴지 물어본다. 올린다면:

1. **velog에는 전문을 올리지 않는다.** 도입부 + "전문은 여기" 링크만.
   전문을 양쪽에 두면 구글이 velog를 원본으로 고를 위험이 있다
   (velog는 외부 canonical 지정이 불가능하다).
2. 블로그 글 frontmatter에 `crosspostedTo: <velog URL>` 을 추가하고 다시 커밋한다.
3. `canonical` 은 **넣지 않는다.** 이 블로그가 원본이다.
   `canonical` 은 "순위는 포기하고 아카이브만 할 옛 글"에만 쓴다.

---

## 발행된 글 수정 (진입점 d)

반입을 다시 돌리지 않는다. `src/content/` 에서 직접 고친다.

1. 해당 파일을 찾아 수정
2. 내용이 크게 달라졌으면 frontmatter에 `updatedAt: <오늘>` 추가
3. `npm run doctor && npm run check`
4. 커밋 메시지: `<섹션> <제목> 수정`
5. 사용자 확인 후 push

볼트 노트도 같이 고칠지는 사용자에게 묻는다 — 두 문서는 독립적으로 진화하는 게 정상이므로
**반드시 맞춰야 하는 것은 아니다.**

---

## 참고

전체 배경과 설계 근거는 레포 `README.md` 에 있다. 특히:

- `3. 옵시디언과의 관계` — 왜 복사인지, 왜 반입이 한 번인지
- `3.5 발행 전 점검` — doctor가 잡는 것 전체 목록
- `3.7 글 한 편 발행하는 순서` — 이 스킬의 원본 런북
