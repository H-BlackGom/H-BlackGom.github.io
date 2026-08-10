#!/usr/bin/env node
/**
 * 발행 전 점검.
 *
 *   npm run doctor
 *   npm run doctor -- --strict   경고도 실패로 취급 (CI용)
 *
 * zod 스키마는 "타입이 맞는가"만 봅니다. 이 스크립트는 "실수인가"를 봅니다.
 * 빌드는 통과하지만 사람이 보면 잘못된 것들 — 빈 description, alt 없는 컷,
 * 오타난 내부 링크, 조용히 갈라진 태그 — 를 잡아냅니다.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';

const ROOT = path.resolve(import.meta.dirname, '..');
const STRICT = process.argv.includes('--strict');

/** content.config.ts 의 컬렉션 구성을 그대로 반영합니다. */
const COLLECTIONS = [
  { name: 'notes', label: '끄적임' },
  { name: 'deepdive', label: '딥다이브' },
  { name: 'til', label: '얕은 지식' },
  { name: 'webtoon', label: '웹툰' },
  { name: 'recipe', label: '레시피' },
];

const STATIC_URLS = new Set([
  '/',
  '/about',
  '/notes',
  '/deepdive',
  '/til',
  '/webtoon',
  '/recipe',
  '/rss.xml',
  '/404',
]);

const errors = [];
const warnings = [];
const infos = [];

const err = (where, message) => errors.push({ where, message });
const warn = (where, message) => warnings.push({ where, message });
const info = (where, message) => infos.push({ where, message });

// ─────────────────────────────────────────── 파일 수집

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // 컬렉션 폴더가 아직 없을 수 있습니다
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.mdx?$/i.test(entry.name)) yield full;
  }
}

const load = async () => {
  const docs = [];

  for (const collection of COLLECTIONS) {
    const base = path.join(ROOT, 'src/content', collection.name);
    for await (const file of walk(base)) {
      const raw = await readFile(file, 'utf8');
      const { data, content } = matter(raw);
      const id = path
        .relative(base, file)
        .replace(/\\/g, '/')
        .replace(/\.mdx?$/i, '');
      docs.push({
        collection: collection.name,
        label: collection.label,
        id,
        rel: path.relative(ROOT, file),
        data,
        content,
        url: `/${collection.name === 'notes' ? 'notes' : collection.name}/${id}`,
      });
    }
  }

  // 시리즈 메타데이터
  const seriesIds = new Set();
  const seriesDir = path.join(ROOT, 'src/content/series');
  try {
    for (const entry of await readdir(seriesDir)) {
      if (entry.endsWith('.json')) seriesIds.add(entry.replace(/\.json$/, ''));
    }
  } catch {
    /* 시리즈가 아직 없을 수 있습니다 */
  }

  return { docs, seriesIds };
};

// ─────────────────────────────────────────── 편집 거리 (태그 오타 탐지용)

const distance = (a, b) => {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3; // 3 이상은 관심 없음 — 조기 종료
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
};

// ─────────────────────────────────────────── 점검

const { docs, seriesIds } = await load();

if (docs.length === 0) {
  console.log('점검할 글이 없습니다.');
  process.exit(0);
}

const now = Date.now();

/** 빌드에 실제로 나가는 글만 링크 대상이 됩니다. */
const isPublished = (doc) => {
  if (doc.data.draft === true) return false;
  const at = new Date(doc.data.publishedAt).getTime();
  return Number.isFinite(at) && at <= now;
};

// 1) 유효한 내부 URL 집합 만들기
const validUrls = new Set(STATIC_URLS);
const tagCount = new Map();

for (const doc of docs) {
  if (isPublished(doc)) validUrls.add(doc.url);
  for (const tag of doc.data.tags ?? []) {
    tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
  }
}
for (const id of seriesIds) validUrls.add(`/deepdive/${id}`);
for (const tag of tagCount.keys()) validUrls.add(`/tags/${tag}`);

// 2) 문서별 점검
const deepdiveOrders = new Map(); // series -> Map(order -> [id])
const episodes = new Map(); // episode -> [id]

for (const doc of docs) {
  const at = doc.rel;

  // 빌드에서 빠지는 글 알려주기 — "발행한 줄 알았는데 안 나갔다" 방지
  if (doc.data.draft === true) {
    info(at, 'draft: true — 빌드에서 빠집니다');
  } else if (new Date(doc.data.publishedAt).getTime() > now) {
    info(at, `publishedAt이 미래(${doc.data.publishedAt}) — 빌드에서 빠집니다`);
  }

  // description
  if (!doc.data.description || String(doc.data.description).trim() === '') {
    warn(at, 'description이 비었습니다 — 목록 카드와 검색 결과가 비어 보입니다');
  }

  // canonical / crosspostedTo 모순
  if (doc.data.canonical && doc.data.crosspostedTo) {
    warn(
      at,
      'canonical과 crosspostedTo가 같이 있습니다 — 원본이 저쪽이면서 요약을 저쪽에 올렸다는 뜻이 되어 모순입니다',
    );
  }

  // 컬렉션별
  if (doc.collection === 'deepdive') {
    const parts = doc.id.split('/');
    if (parts.length < 2) {
      err(at, '딥다이브 글이 시리즈 폴더 안에 없습니다 (deepdive/<시리즈>/글.md)');
    } else {
      const series = parts[0];
      if (!seriesIds.has(series)) {
        err(at, `시리즈 메타데이터가 없습니다 — src/content/series/${series}.json`);
      }
      const orders = deepdiveOrders.get(series) ?? new Map();
      const same = orders.get(doc.data.order) ?? [];
      orders.set(doc.data.order, [...same, doc.id]);
      deepdiveOrders.set(series, orders);
    }
  }

  if (doc.collection === 'webtoon') {
    const panels = doc.data.panels ?? [];
    const missingAlt = panels.filter((p) => !p.alt || String(p.alt).trim() === '');
    if (missingAlt.length > 0) {
      warn(
        at,
        `컷 ${missingAlt.length}/${panels.length}장에 alt가 없습니다 — 접근성과 이미지 검색 유입을 잃습니다`,
      );
    }
    const list = episodes.get(doc.data.episode) ?? [];
    episodes.set(doc.data.episode, [...list, doc.id]);
  }

  if (doc.collection === 'recipe') {
    if (!doc.data.cover) {
      warn(
        at,
        'cover가 없습니다 — Recipe 구조화 데이터에 사진이 빠져 리치 결과가 약해집니다',
      );
    }
  }

  // 3) 내부 링크 검사 — 마크다운 링크만 봅니다
  const links = [...doc.content.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
  for (const link of links) {
    // plugins/remark-strip-md.mjs 가 빌드 때 .md 를 떼므로 여기서도 같게 봅니다.
    const clean =
      link
        .split('#')[0]
        .split('?')[0]
        .replace(/\.mdx?$/i, '')
        .replace(/\/$/, '') || '/';
    // 이미지·정적 파일은 대상이 아닙니다
    if (/\.(png|jpe?g|gif|webp|avif|svg|pdf)$/i.test(clean)) continue;
    if (!validUrls.has(clean)) {
      err(at, `존재하지 않는 내부 링크: ${link}`);
    }
  }
}

// 4) 딥다이브 order 중복
for (const [series, orders] of deepdiveOrders) {
  for (const [order, ids] of orders) {
    if (ids.length > 1) {
      err(
        `src/content/deepdive/${series}`,
        `order: ${order} 가 ${ids.length}개 겹칩니다 — ${ids.join(', ')}`,
      );
    }
  }
}

// 5) 웹툰 episode 중복
for (const [episode, ids] of episodes) {
  if (ids.length > 1) {
    err(
      'src/content/webtoon',
      `episode: ${episode} 가 ${ids.length}개 겹칩니다 — ${ids.join(', ')}`,
    );
  }
}

// 6) 태그 오타 후보
// 공백·대소문자를 지우면 같아지는 쌍, 또는 편집거리 1 이하인 쌍.
// 한쪽이 1번만 쓰인 경우만 보고합니다 — 그게 오타일 가능성이 높습니다.
const tags = [...tagCount.keys()];
const normalize = (t) => t.replace(/\s+/g, '').toLowerCase();

for (let i = 0; i < tags.length; i += 1) {
  for (let j = i + 1; j < tags.length; j += 1) {
    const a = tags[i];
    const b = tags[j];
    const rare = tagCount.get(a) === 1 || tagCount.get(b) === 1;
    if (!rare) continue;

    const sameNormalized = normalize(a) === normalize(b);
    const close = a.length >= 3 && b.length >= 3 && distance(a, b) <= 1;

    if (sameNormalized || close) {
      warn(
        'tags',
        `태그가 갈라진 것 같습니다: "${a}"(${tagCount.get(a)}회) vs "${b}"(${tagCount.get(b)}회)`,
      );
    }
  }
}

// ─────────────────────────────────────────── 출력

const print = (title, list, mark) => {
  if (list.length === 0) return;
  console.log(`\n${mark} ${title} ${list.length}건`);
  for (const item of list) {
    console.log(`   ${item.where}`);
    console.log(`     ${item.message}`);
  }
};

console.log(`글 ${docs.length}개 점검`);

print('에러', errors, '✕');
print('경고', warnings, '▲');
print('참고', infos, 'ℹ');

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✓ 문제 없습니다.');
}

const failed = errors.length > 0 || (STRICT && warnings.length > 0);
process.exit(failed ? 1 : 0);
