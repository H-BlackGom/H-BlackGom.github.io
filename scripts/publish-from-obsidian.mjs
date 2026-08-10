#!/usr/bin/env node
/**
 * 개인 볼트 → 블로그 콘텐츠 **복사**(반입).
 *
 * 전제: 개인 볼트는 지식 그래프로 남고, 발행본은 블로그 레포에 복사됩니다.
 * 두 문서는 목적이 다른 별개 문서입니다(정원 vs 수확). 그래서:
 *
 *   ⚠️ 반입은 글당 한 번입니다. 반입된 뒤에는 **블로그 쪽이 그 글의 원본**입니다.
 *      오타 수정·문장 다듬기는 src/content/ 에서 하세요.
 *      그래서 이 스크립트는 이미 있는 파일을 절대 조용히 덮지 않습니다.
 *
 * 사용법:
 *   OBSIDIAN_VAULT=~/vault npm run publish                    # 미리보기(기본)
 *   OBSIDIAN_VAULT=~/vault npm run publish -- --write         # 새 글만 반입
 *   OBSIDIAN_VAULT=~/vault npm run publish -- --write --force  # 기존 글 diff 확인
 *   OBSIDIAN_VAULT=~/vault npm run publish -- --write --force --yes  # 실제 덮어쓰기
 *
 * 반입에 성공하면 볼트 노트에 `published: <URL>` 을 기록합니다(볼트를 쓰는 유일한 지점).
 * 이걸로 볼트에서 "발행했다"를 알 수 있고, 그래프는 그대로 유지됩니다.
 * 끄려면 --no-stamp.
 *
 * 볼트 노트 frontmatter 예:
 *   ---
 *   publish: true
 *   blog: deepdive
 *   series: opensearch-architecture   # deepdive 전용 (폴더가 됩니다)
 *   order: 3                          # deepdive 전용
 *   slug: shard-count                 # 없으면 파일명에서 만듭니다
 *   title: 샤드 수는 왜 못 바꾸는가
 *   publishedAt: 2026-08-10
 *   tags: [opensearch]
 *   ---
 */
import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  copyFile,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';

const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');
const YES = process.argv.includes('--yes');
const STAMP = !process.argv.includes('--no-stamp');
const CANDIDATES = process.argv.includes('--candidates');
const VAULT = process.env.OBSIDIAN_VAULT
  ? process.env.OBSIDIAN_VAULT.replace(/^~/, process.env.HOME ?? '~')
  : null;

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT = path.join(ROOT, 'src', 'content');
const PUBLIC_IMAGES = path.join(ROOT, 'public', 'images');

if (!VAULT) {
  console.error(
    'OBSIDIAN_VAULT 환경변수에 볼트 경로를 지정하세요.\n' +
      '예: OBSIDIAN_VAULT=~/Documents/vault npm run publish',
  );
  process.exit(1);
}

/** 섹션별로 블로그 스키마가 받는 필드만 통과시킵니다. 나머지는 볼트 전용. */
const COMMON = [
  'title',
  'description',
  'publishedAt',
  'updatedAt',
  'tags',
  'draft',
  'cover',
  'canonical',
  'crosspostedTo',
];
const ALLOWED = {
  notes: COMMON,
  deepdive: [...COMMON, 'order', 'takeaway'],
  til: [...COMMON, 'aka'],
  webtoon: [...COMMON, 'episode', 'format', 'panels'],
};

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

/**
 * YAML은 `2026-08-09` 를 Date로 파싱하고 다시 쓸 때 ISO 타임스탬프로 늘려 씁니다.
 * 날짜만 있는 값은 날짜로 되돌려서 콘텐츠 파일의 diff를 깨끗하게 유지합니다.
 */
const normalizeDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value;
  const isMidnightUtc =
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0;
  return isMidnightUtc ? value.toISOString().slice(0, 10) : value;
};

const slugify = (name) =>
  name
    .replace(/\.mdx?$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]/gu, '');

/** 볼트 전체를 훑되 숨김 폴더와 템플릿은 건너뜁니다. */
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'templates' || entry.name === 'Templates') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** 볼트 안 어디에 있든 파일명으로 찾을 수 있게 인덱스를 만들어 둡니다. */
const buildFileIndex = async () => {
  const index = new Map();
  for await (const file of walk(VAULT)) {
    const key = path.basename(file);
    if (!index.has(key)) index.set(key, file);
  }
  return index;
};

const collect = async () => {
  const found = [];
  for await (const file of walk(VAULT)) {
    if (!/\.mdx?$/i.test(file)) continue;
    const raw = await readFile(file, 'utf8');
    if (!raw.startsWith('---')) continue;

    const { data, content } = matter(raw);
    if (data.publish !== true) continue;

    const section = data.blog;
    if (!section || !(section in ALLOWED)) {
      console.warn(
        `⚠ ${path.relative(VAULT, file)}: blog 필드가 없거나 알 수 없는 값입니다 (${section}). 건너뜁니다.`,
      );
      continue;
    }
    found.push({ file, data, content, section });
  }
  return found;
};

/**
 * --candidates : 아직 발행 표시가 없는 볼트 노트를 최근 수정순으로 보여줍니다.
 *
 * "방금 끝낸 그 노트"를 찾는 용도입니다. 발행 표시(publish/blog)를 손으로 적는 대신
 * 이 목록에서 고르고 스킬이 표시를 넣어주는 흐름을 위해 있습니다.
 */
if (CANDIDATES) {
  const rows = [];

  for await (const file of walk(VAULT)) {
    if (!/\.mdx?$/i.test(file)) continue;

    const raw = await readFile(file, 'utf8');
    const hasFrontmatter = raw.startsWith('---');
    const data = hasFrontmatter ? matter(raw).data : {};

    // 이미 발행한 것과 발행 예정으로 표시된 것은 후보가 아닙니다.
    if (data.published || data.publish === true) continue;

    const { mtime } = await stat(file);
    rows.push({
      file,
      mtime,
      title: data.title ?? path.basename(file).replace(/\.mdx?$/i, ''),
      lines: raw.split('\n').length,
      hasFrontmatter,
    });
  }

  rows.sort((a, b) => b.mtime - a.mtime);
  const top = rows.slice(0, 15);

  if (top.length === 0) {
    console.log('발행 표시가 없는 노트를 찾지 못했습니다.');
    process.exit(0);
  }

  console.log(`발행 후보 (최근 수정순, 상위 ${top.length}개 / 전체 ${rows.length}개)\n`);
  for (const [i, row] of top.entries()) {
    const day = row.mtime.toISOString().slice(0, 10);
    console.log(`${String(i + 1).padStart(2)}. ${row.title}`);
    console.log(
      `    ${day} · ${row.lines}줄${row.hasFrontmatter ? '' : ' · frontmatter 없음'}`,
    );
    console.log(`    ${path.relative(VAULT, row.file)}`);
  }
  process.exit(0);
}

const fileIndex = await buildFileIndex();
const notes = await collect();

if (notes.length === 0) {
  console.log('publish: true 인 노트가 없습니다.');
  process.exit(0);
}

/** 발행 대상 노트의 "제목 → URL" 지도. 위키링크를 실제 링크로 바꾸는 데 씁니다. */
const linkTargets = new Map();
for (const note of notes) {
  const slug = note.data.slug ?? slugify(path.basename(note.file));
  const url =
    note.section === 'deepdive'
      ? `/deepdive/${note.data.series}/${slug}`
      : `/${note.section}/${slug}`;
  linkTargets.set(path.basename(note.file).replace(/\.mdx?$/i, ''), url);
  note.slug = slug;
  note.url = url;
}

const plannedImages = [];

/** 옵시디언 문법을 표준 마크다운으로. */
const transform = (body, note) => {
  let out = body;

  // ![[image.png]] / ![[image.png|300]] → ![](/images/<slug>/image.png)
  out = out.replace(/!\[\[([^\]|]+?)(\|[^\]]*)?\]\]/g, (match, target) => {
    const name = target.trim();
    if (!IMAGE_EXT.test(name)) return match;
    const source = fileIndex.get(name);
    if (!source) {
      console.warn(`⚠ ${note.slug}: 이미지를 볼트에서 찾지 못했습니다 — ${name}`);
      return match;
    }
    const destDir = path.join(PUBLIC_IMAGES, note.section, note.slug);
    plannedImages.push({ source, destDir, name });
    return `![](/images/${note.section}/${note.slug}/${name})`;
  });

  // [[다른 노트|보이는 글자]] → 발행된 노트면 링크, 아니면 글자만 남김
  out = out.replace(/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (_full, target, alias) => {
    const name = target.trim();
    const label = (alias ?? name).trim();
    const href = linkTargets.get(name);
    if (href) return `[${label}](${href})`;
    // 발행하지 않은 노트로 향하는 링크는 죽은 링크가 되므로 텍스트로 떨어뜨립니다.
    return label;
  });

  // 옵시디언 주석 %%...%% 제거
  out = out.replace(/%%[\s\S]*?%%/g, '');

  return out.trim() + '\n';
};

const plan = [];

for (const note of notes) {
  const allowed = ALLOWED[note.section];
  const frontmatter = {};
  for (const key of allowed) {
    if (note.data[key] !== undefined) {
      frontmatter[key] = normalizeDate(note.data[key]);
    }
  }

  if (!frontmatter.title) {
    console.warn(`⚠ ${note.slug}: title이 없어 건너뜁니다.`);
    continue;
  }
  if (!frontmatter.publishedAt) {
    console.warn(`⚠ ${note.slug}: publishedAt이 없어 건너뜁니다.`);
    continue;
  }
  if (note.section === 'deepdive') {
    if (!note.data.series) {
      console.warn(`⚠ ${note.slug}: deepdive인데 series가 없어 건너뜁니다.`);
      continue;
    }
    if (frontmatter.order === undefined) {
      console.warn(`⚠ ${note.slug}: deepdive인데 order가 없어 건너뜁니다.`);
      continue;
    }
  }

  const destDir =
    note.section === 'deepdive'
      ? path.join(CONTENT, 'deepdive', String(note.data.series))
      : path.join(CONTENT, note.section);
  const dest = path.join(destDir, `${note.slug}.md`);

  const body = transform(note.content, note);
  const output = matter.stringify(body, frontmatter);

  plan.push({ note, dest, output });
}

// ─────────────────────────────────────────── 기존 파일 판별

const rel = (p) => path.relative(ROOT, p);

const readIfExists = async (file) => {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
};

/** 줄 단위 LCS diff. 파일이 작아서 이 정도면 충분합니다. */
const diffLines = (a, b) => {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(`  - ${a[i]}`);
      i += 1;
    } else {
      out.push(`  + ${b[j]}`);
      j += 1;
    }
  }
  while (i < m) out.push(`  - ${a[i++]}`);
  while (j < n) out.push(`  + ${b[j++]}`);
  return out;
};

for (const item of plan) {
  const current = await readIfExists(item.dest);
  item.existing = current !== null;
  item.unchanged = current === item.output;
  item.current = current;
}

const fresh = plan.filter((p) => !p.existing);
const changed = plan.filter((p) => p.existing && !p.unchanged);
const unchanged = plan.filter((p) => p.unchanged);

// ─────────────────────────────────────────── 출력

console.log(`${WRITE ? '반입' : '미리보기'} — 발행 대상 노트 ${plan.length}개\n`);

if (fresh.length > 0) {
  console.log(`새 글 ${fresh.length}개 — 반입됩니다`);
  for (const { note, dest } of fresh) {
    console.log(`  ${note.section.padEnd(8)} ${rel(dest)}`);
  }
}

if (unchanged.length > 0) {
  console.log(`\n내용 동일 ${unchanged.length}개 — 건너뜁니다`);
  for (const { dest } of unchanged) console.log(`  ${rel(dest)}`);
}

if (changed.length > 0) {
  console.log(
    `\n⚠ 이미 있고 내용이 다른 글 ${changed.length}개 — 기본적으로 건너뜁니다`,
  );
  console.log(
    '  반입 후에는 블로그 쪽이 원본입니다. 여기서 덮으면 블로그에서 다듬은 내용이 사라집니다.',
  );
  for (const { dest } of changed) console.log(`  ${rel(dest)}`);
}

if (plannedImages.length > 0) {
  console.log(`\n이미지 ${plannedImages.length}개`);
  for (const image of plannedImages) {
    console.log(`  ${rel(path.join(image.destDir, image.name))}`);
  }
}

if (!WRITE) {
  console.log('\n실제로 쓰려면 --write 를 붙이세요.');
  process.exit(0);
}

// ─────────────────────────────────────────── 덮어쓰기는 2단 확인

let willOverwrite = [];

if (changed.length > 0) {
  if (!FORCE) {
    console.log(
      '\n기존 글을 덮어쓰려면 --force 를 붙여 diff를 먼저 확인하세요.',
    );
  } else if (!YES) {
    console.log('\n───────── 덮어쓰면 이렇게 바뀝니다 (- 현재 / + 볼트) ─────────');
    for (const item of changed) {
      console.log(`\n${rel(item.dest)}`);
      const lines = diffLines(
        item.current.split('\n'),
        item.output.split('\n'),
      );
      const shown = lines.slice(0, 40);
      console.log(shown.join('\n'));
      if (lines.length > shown.length) {
        console.log(`  … ${lines.length - shown.length}줄 더`);
      }
    }
    console.log(
      '\n이대로 덮어쓰려면 --force --yes 를 붙여 다시 실행하세요. 지금은 쓰지 않았습니다.',
    );
  } else {
    willOverwrite = changed;
  }
}

// ─────────────────────────────────────────── 쓰기

for (const image of plannedImages) {
  await mkdir(image.destDir, { recursive: true });
  await copyFile(image.source, path.join(image.destDir, image.name));
}

const written = [...fresh, ...willOverwrite];

for (const { dest, output } of written) {
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, output, 'utf8');
}

// ─────────────────────────────────────────── 볼트에 published: 기록

/** astro.config.mjs 의 site 값을 읽습니다. 볼트에 남길 절대 URL을 만들기 위해서. */
const readSiteUrl = async () => {
  const config = await readIfExists(path.join(ROOT, 'astro.config.mjs'));
  const match = config?.match(/^\s*site:\s*['"]([^'"]+)['"]/m);
  return match ? match[1].replace(/\/$/, '') : null;
};

/**
 * 볼트 노트 frontmatter에 published 한 줄을 끼웁니다.
 * gray-matter로 재직렬화하면 개인 노트의 frontmatter 서식이 뭉개지므로
 * 텍스트로 삽입해서 나머지를 바이트 그대로 보존합니다.
 */
const stampPublished = async (file, url) => {
  const raw = await readIfExists(file);
  if (raw === null) return false;

  const lines = raw.split('\n');
  if (lines[0].trim() !== '---') return false;

  const end = lines.indexOf('---', 1);
  if (end === -1) return false;
  if (lines.slice(1, end).some((l) => /^published\s*:/.test(l))) return false;

  lines.splice(end, 0, `published: ${url}`);
  await writeFile(file, lines.join('\n'), 'utf8');
  return true;
};

let stamped = 0;

if (STAMP && written.length > 0) {
  const siteUrl = await readSiteUrl();
  if (!siteUrl) {
    console.log('\n⚠ astro.config.mjs 에서 site 를 읽지 못해 published 기록을 건너뜁니다.');
  } else {
    for (const item of written) {
      if (await stampPublished(item.note.file, `${siteUrl}${item.note.url}`)) {
        stamped += 1;
      }
    }
  }
}

// ─────────────────────────────────────────── 요약

const parts = [`새 글 ${fresh.length}개`];
if (willOverwrite.length > 0) parts.push(`덮어쓴 글 ${willOverwrite.length}개`);
if (unchanged.length > 0) parts.push(`건너뜀 ${unchanged.length}개`);
if (changed.length > 0 && willOverwrite.length === 0) {
  parts.push(`보호됨 ${changed.length}개`);
}
if (stamped > 0) parts.push(`볼트에 published 기록 ${stamped}개`);

console.log(`\n✓ ${parts.join(' · ')}`);
if (written.length > 0) {
  console.log('  git diff 로 확인한 뒤 커밋하세요.');
}
