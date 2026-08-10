#!/usr/bin/env node
/**
 * 웹툰 컷 목록을 읽어 frontmatter의 panels 블록을 만들어 줍니다.
 *
 * width/height를 손으로 적는 건 현실적으로 불가능하고, 없으면 스크롤 중
 * 레이아웃이 튀기 때문에(CLS) 이 스크립트가 사실상 필수입니다.
 *
 * 입력 3가지 — 섞어 쓸 수 있습니다.
 *
 *   로컬 디렉터리 (파일명 자연순 정렬)
 *     npm run webtoon:manifest -- public/webtoon/ep01
 *
 *   URL 직접 (준 순서를 그대로 유지)
 *     npm run webtoon:manifest -- https://res.cloudinary.com/.../01.png https://.../02.png
 *
 *   URL 목록 파일 (한 줄에 하나, # 주석 허용, 줄 순서 유지)
 *     npm run webtoon:manifest -- ep01.txt
 *
 * 옵션
 *   --alt    alt 자리를 비워둔 채 출력해서 채워넣기 쉽게 합니다
 *   --auto   Cloudinary URL에 f_auto,q_auto 를 끼워 넣습니다.
 *            브라우저에 맞춰 WebP/AVIF로 자동 변환되고 화질도 자동 조절됩니다.
 *            변환 파라미터는 원본 크기를 바꾸지 않으므로 width/height는 그대로 유효합니다.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif']);

const [, , ...argv] = process.argv;
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const inputs = argv.filter((a) => !a.startsWith('--'));

const wantAlt = flags.has('--alt');
const wantAuto = flags.has('--auto');

if (inputs.length === 0) {
  console.error(
    '사용법:\n' +
      '  npm run webtoon:manifest -- public/webtoon/ep01\n' +
      '  npm run webtoon:manifest -- https://res.cloudinary.com/.../01.png ...\n' +
      '  npm run webtoon:manifest -- ep01.txt\n' +
      '옵션: --alt, --auto',
  );
  process.exit(1);
}

const isUrl = (s) => /^https?:\/\//i.test(s);

/** 01.png, 02.png, 10.png 가 사람이 기대하는 순서로 정렬되게. */
const naturalCompare = (a, b) =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

/** public/ 아래 로컬 경로를 브라우저가 쓰는 URL로 바꿉니다. */
const toPublicUrl = (filePath) => {
  const normalized = filePath.split(path.sep).join('/');
  const marker = 'public/';
  const at = normalized.lastIndexOf(marker);
  return at === -1 ? normalized : '/' + normalized.slice(at + marker.length);
};

/**
 * Cloudinary URL의 /upload/ 뒤에 변환 파라미터를 끼웁니다.
 * 이미 변환이 붙어 있으면 건드리지 않습니다.
 */
const withCloudinaryAuto = (url) => {
  if (!wantAuto) return url;
  if (!/res\.cloudinary\.com/i.test(url)) return url;
  if (/\/upload\/[^/]*(f_auto|q_auto)/i.test(url)) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
};

/** 입력들을 "컷 소스 목록"으로 펼칩니다. 순서가 곧 컷 순서입니다. */
const collectSources = async () => {
  const sources = [];

  for (const input of inputs) {
    if (isUrl(input)) {
      sources.push({ kind: 'url', src: input });
      continue;
    }

    // .txt / .list = URL 목록 파일
    if (/\.(txt|list)$/i.test(input)) {
      const raw = await readFile(input, 'utf8');
      const lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '' && !l.startsWith('#'));
      for (const line of lines) {
        sources.push({ kind: isUrl(line) ? 'url' : 'file', src: line });
      }
      continue;
    }

    // 그 외는 디렉터리로 봅니다
    const entries = await readdir(input, { withFileTypes: true });
    const names = entries
      .filter(
        (e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()),
      )
      .map((e) => e.name)
      .sort(naturalCompare);

    if (names.length === 0) {
      console.error(`⚠ ${input} 안에서 이미지를 찾지 못했습니다.`);
    }
    for (const name of names) {
      sources.push({ kind: 'file', src: path.join(input, name) });
    }
  }

  return sources;
};

/** 원본 크기를 잽니다. 원격이면 받아서 잽니다. */
const measure = async (source) => {
  if (source.kind === 'url') {
    const response = await fetch(source.src);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return sharp(buffer).metadata();
  }
  return sharp(source.src).metadata();
};

const sources = await collectSources();

if (sources.length === 0) {
  console.error('컷을 하나도 찾지 못했습니다.');
  process.exit(1);
}

const lines = ['panels:'];
let failed = 0;

for (const source of sources) {
  let width;
  let height;

  try {
    ({ width, height } = await measure(source));
  } catch (error) {
    failed += 1;
    console.error(`⚠ 크기를 읽지 못했습니다: ${source.src} — ${error.message}`);
    continue;
  }

  if (!width || !height) {
    failed += 1;
    console.error(`⚠ 크기가 비어 있습니다: ${source.src}`);
    continue;
  }

  const src =
    source.kind === 'url'
      ? withCloudinaryAuto(source.src)
      : toPublicUrl(source.src);

  lines.push(`  - src: ${src}`);
  lines.push(`    width: ${width}`);
  lines.push(`    height: ${height}`);
  if (wantAlt) lines.push(`    alt: `);
}

console.log(lines.join('\n'));

const ok = sources.length - failed;
console.error(
  `\n✓ ${ok}컷${failed > 0 ? ` (실패 ${failed})` : ''}. ` +
    '위 블록을 화 md 파일의 frontmatter에 붙여넣으세요.',
);

if (failed > 0) process.exit(1);
