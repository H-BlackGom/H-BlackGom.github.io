import { getCollection, type CollectionEntry } from 'astro:content';

/** 개발 서버에서는 초안과 미래 날짜 글도 보여줍니다. 빌드에서는 빠집니다. */
const SHOW_DRAFTS = import.meta.env.DEV;

const visible = (data: { draft: boolean; publishedAt: Date }) =>
  SHOW_DRAFTS || (!data.draft && data.publishedAt.getTime() <= Date.now());

const newestFirst = (
  a: { data: { publishedAt: Date } },
  b: { data: { publishedAt: Date } },
) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime();

export type Note = CollectionEntry<'notes'>;
export type DeepdiveEntry = CollectionEntry<'deepdive'>;
export type Til = CollectionEntry<'til'>;
export type Webtoon = CollectionEntry<'webtoon'>;
export type Recipe = CollectionEntry<'recipe'>;
export type Series = CollectionEntry<'series'>;

// ─────────────────────────────────────────────── 섹션별 조회

export const getNotes = async () =>
  (await getCollection('notes', (e) => visible(e.data))).sort(newestFirst);

export const getTil = async () =>
  (await getCollection('til', (e) => visible(e.data))).sort(newestFirst);

export const getWebtoons = async () =>
  (await getCollection('webtoon', (e) => visible(e.data))).sort(
    (a, b) => b.data.episode - a.data.episode,
  );

export const getRecipes = async () =>
  (await getCollection('recipe', (e) => visible(e.data))).sort(newestFirst);

export const getDeepdiveEntries = async () =>
  await getCollection('deepdive', (e) => visible(e.data));

// ─────────────────────────────────────────────── 딥다이브 시리즈

/** 딥다이브는 디렉터리가 시리즈다: "<series>/<slug>" */
export const seriesIdOf = (entry: DeepdiveEntry) => {
  const [seriesId, ...rest] = entry.id.split('/');
  if (rest.length === 0) {
    throw new Error(
      `딥다이브 글은 시리즈 폴더 안에 있어야 합니다: src/content/deepdive/<시리즈>/${entry.id}.md`,
    );
  }
  return seriesId;
};

export const slugOf = (entry: DeepdiveEntry) =>
  entry.id.split('/').slice(1).join('/');

export type SeriesWithEpisodes = {
  series: Series;
  episodes: DeepdiveEntry[];
};

/** 시리즈 목록. 각 시리즈에 order로 정렬된 편들이 붙어서 나옵니다. */
export const getSeriesList = async (): Promise<SeriesWithEpisodes[]> => {
  const [allSeries, entries] = await Promise.all([
    getCollection('series'),
    getDeepdiveEntries(),
  ]);

  const byId = new Map<string, DeepdiveEntry[]>();
  for (const entry of entries) {
    const id = seriesIdOf(entry);
    if (!allSeries.some((s) => s.id === id)) {
      throw new Error(
        `시리즈 메타데이터가 없습니다: src/content/series/${id}.json 을 만들어 주세요.`,
      );
    }
    byId.set(id, [...(byId.get(id) ?? []), entry]);
  }

  return allSeries
    .map((series) => ({
      series,
      episodes: (byId.get(series.id) ?? []).sort(
        (a, b) => a.data.order - b.data.order,
      ),
    }))
    .filter(({ episodes }) => SHOW_DRAFTS || episodes.length > 0)
    .sort(
      (a, b) =>
        b.series.data.startedAt.getTime() - a.series.data.startedAt.getTime(),
    );
};

/** 시리즈 내 이전/다음 편. 시리즈 네비게이션용. */
export const neighborsInSeries = (
  episodes: DeepdiveEntry[],
  current: DeepdiveEntry,
) => {
  const i = episodes.findIndex((e) => e.id === current.id);
  return {
    index: i,
    total: episodes.length,
    prev: i > 0 ? episodes[i - 1] : undefined,
    next: i < episodes.length - 1 ? episodes[i + 1] : undefined,
  };
};

// ─────────────────────────────────────────────── URL

export const urlOf = {
  note: (e: Note) => `/notes/${e.id}`,
  deepdive: (e: DeepdiveEntry) => `/deepdive/${seriesIdOf(e)}/${slugOf(e)}`,
  series: (s: Series) => `/deepdive/${s.id}`,
  til: (e: Til) => `/til/${e.id}`,
  webtoon: (e: Webtoon) => `/webtoon/${e.id}`,
  recipe: (e: Recipe) => `/recipe/${e.id}`,
};

// ─────────────────────────────────────────────── 통합 피드 (홈 / RSS)

export type FeedItem = {
  section: 'notes' | 'deepdive' | 'til' | 'webtoon' | 'recipe';
  title: string;
  description?: string;
  href: string;
  publishedAt: Date;
  tags: string[];
  /** 딥다이브면 "시리즈명 3편" 같은 문맥 */
  context?: string;
};

export const getFeed = async (): Promise<FeedItem[]> => {
  const [notes, til, webtoons, recipes, seriesList] = await Promise.all([
    getNotes(),
    getTil(),
    getWebtoons(),
    getRecipes(),
    getSeriesList(),
  ]);

  const items: FeedItem[] = [
    ...notes.map((e) => ({
      section: 'notes' as const,
      title: e.data.title,
      description: e.data.description,
      href: urlOf.note(e),
      publishedAt: e.data.publishedAt,
      tags: e.data.tags,
    })),
    ...til.map((e) => ({
      section: 'til' as const,
      title: e.data.title,
      description: e.data.description,
      href: urlOf.til(e),
      publishedAt: e.data.publishedAt,
      tags: e.data.tags,
    })),
    ...webtoons.map((e) => ({
      section: 'webtoon' as const,
      title: e.data.title,
      description: e.data.description,
      href: urlOf.webtoon(e),
      publishedAt: e.data.publishedAt,
      tags: e.data.tags,
      context: `${e.data.episode}화`,
    })),
    ...recipes.map((e) => ({
      section: 'recipe' as const,
      title: e.data.title,
      description: e.data.description,
      href: urlOf.recipe(e),
      publishedAt: e.data.publishedAt,
      tags: e.data.tags,
      context: `${e.data.servings} · ${e.data.totalMinutes}분`,
    })),
    ...seriesList.flatMap(({ series, episodes }) =>
      episodes.map((e) => ({
        section: 'deepdive' as const,
        title: e.data.title,
        description: e.data.description ?? e.data.takeaway,
        href: urlOf.deepdive(e),
        publishedAt: e.data.publishedAt,
        tags: e.data.tags,
        context: `${series.data.title} ${e.data.order}편`,
      })),
    ),
  ];

  return items.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
};

// ─────────────────────────────────────────────── 태그

export const tagCounts = (items: { tags: string[] }[]) => {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'),
  );
};

export const formatDate = (d: Date) =>
  d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });

export const isoDate = (d: Date) => d.toISOString();
