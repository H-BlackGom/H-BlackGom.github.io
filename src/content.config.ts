import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/**
 * 4종 콘텐츠가 공유하는 필드.
 * canonical: velog 등에 원본이 있는 글이면 그 URL을 넣습니다.
 *            (보통은 비워두고 = 이 블로그가 원본)
 * crosspostedTo: 이 블로그가 원본이고 velog에 요약을 올린 경우 그 링크.
 */
const base = {
  title: z.string(),
  description: z.string().optional(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  cover: z.string().optional(),
  canonical: z.string().url().optional(),
  crosspostedTo: z.string().url().optional(),
};

/** 노트 — 그때그때 다양한 주제. 가장 평범한 글. */
const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({ ...base }),
});

/**
 * 딥다이브 — 시리즈물.
 * 디렉터리 구조가 곧 시리즈다: src/content/deepdive/<시리즈 slug>/<글>.md
 * 그래서 frontmatter에 series를 또 적지 않습니다. order만 있으면 됩니다.
 */
const deepdive = defineCollection({
  loader: glob({ base: './src/content/deepdive', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    ...base,
    order: z.number().int().positive(),
    /** 이 편을 읽고 나면 무엇을 알게 되는지. 시리즈 목차에 노출됩니다. */
    takeaway: z.string().optional(),
  }),
});

/** 시리즈 메타데이터. src/content/series/<시리즈 slug>.json */
const series = defineCollection({
  loader: glob({ base: './src/content/series', pattern: '**/*.json' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['ongoing', 'done', 'paused']).default('ongoing'),
    startedAt: z.coerce.date(),
    /** 총 몇 편 예정인지. 진행률 표시에 쓰입니다. 모르면 비워두세요. */
    plannedCount: z.number().int().positive().optional(),
    cover: z.string().optional(),
  }),
});

/**
 * 얕은 지식 — 개념 하나를 짧게. 카드 벽 + 개별 페이지 둘 다 만듭니다.
 * description이 카드 앞면이라 필수입니다.
 */
const til = defineCollection({
  loader: glob({ base: './src/content/til', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    ...base,
    description: z.string(),
    /** 영문 용어 등 병기. 검색 필터에 함께 걸립니다. */
    aka: z.array(z.string()).default([]),
  }),
});

/**
 * 웹툰 — 스크롤 방식이 기본. format: 'carousel' 로 바꾸면
 * 인스타툰(가로 스와이프)으로 같은 원고를 렌더합니다.
 * width/height는 필수 — 없으면 스크롤 중 레이아웃이 튑니다(CLS).
 * `npm run webtoon:manifest -- public/webtoon/ep01` 로 자동 생성하세요.
 */
const webtoon = defineCollection({
  loader: glob({ base: './src/content/webtoon', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    ...base,
    episode: z.number().int().positive(),
    format: z.enum(['scroll', 'carousel']).default('scroll'),
    panels: z
      .array(
        z.object({
          src: z.string(),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
          alt: z.string().optional(),
        }),
      )
      .min(1),
  }),
});

/**
 * 레시피 — "가족에겐 맛있는 밥을"의 실물.
 * 구조화 데이터(schema.org Recipe)를 붙이므로 servings·totalMinutes·ingredients가
 * 필수입니다. 구글 레시피 리치 결과에 그대로 쓰이는 필드입니다.
 */
const recipe = defineCollection({
  loader: glob({ base: './src/content/recipe', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    ...base,
    /** "2인분", "아이 1 + 성인 2" 처럼 자유롭게. */
    servings: z.string(),
    /** 총 소요 시간(분). 손질+조리 합계. */
    totalMinutes: z.number().int().positive(),
    /** 아이도 먹을 수 있는지. 목록에 배지로 표시됩니다. */
    kidFriendly: z.boolean().default(false),
    /** 그룹으로 묶은 재료. group을 생략하면 묶음 없이 나열됩니다. */
    ingredients: z
      .array(
        z.object({
          group: z.string().optional(),
          items: z.array(z.string()).min(1),
        }),
      )
      .min(1),
  }),
});

/** 사이트 어디서든 쓰는 짧은 데이터. 지금은 소개 문구 정도. */
const now = defineCollection({
  loader: file('./src/content/now.json'),
  schema: z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
  }),
});

export const collections = {
  notes,
  deepdive,
  series,
  til,
  webtoon,
  recipe,
  now,
};
