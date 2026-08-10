#!/usr/bin/env node
/**
 * 도트 스타일 브랜드 애셋 생성기.
 *
 *   npm run brand
 *
 * 만드는 것:
 *   public/favicon.svg          — 16x16 도트 곰 (벡터, crispEdges)
 *   public/avatar.png           — 320px 원형 아바타 (일러스트, 배경 투명)
 *   public/og-default.png       — 1200x630 기본 OG 이미지
 *   public/webtoon/ep01/*.png   — 데모용 플레이스홀더 컷 3장
 *
 * 마크가 둘인 이유 — 크기마다 살아남는 그림이 다릅니다.
 *   도트 곰   : 16~32px(파비콘). 일러스트는 이 크기에서 뭉개집니다
 *   일러스트  : 56px 이상(히어로·소개·OG). 도트는 이 크기에서 밋밋합니다
 *
 * 실제 웹툰 원고가 생기면 webtoon 부분은 지우고 쓰세요.
 * 색은 src/styles/global.css 의 토큰과 맞춰뒀습니다.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * sharp(librsvg)는 Galmuri woff2를 읽지 못하므로 시스템 폰트로 렌더됩니다.
 * 지정하지 않으면 한글이 명조체로 잡혀 도트 곰과 어긋나므로 산세리프를 명시합니다.
 * (로컬 macOS 기준. CI에서 돌리면 폰트가 달라집니다 — 애셋은 커밋해 두세요.)
 */
const KO = 'Apple SD Gothic Neo, AppleGothic, Noto Sans KR, sans-serif';

const C = {
  paper: '#f2eee2',
  ink: '#1e1c16',
  accent: '#a8531a',
  amber: '#f0a742',
  terminal: '#12130e',
  dot: '#2a2b21',
};

/**
 * 16x16 도트 곰. 1 = 몸통, 2 = 밝은 부분(주둥이), 0 = 투명.
 * 눈은 0으로 뚫어서 배경색이 보이게 합니다.
 */
const BEAR = [
  '0011000000001100',
  '0111100000011110',
  '0111100000011110',
  '0111111111111110',
  '0111111111111110',
  '0110011111100110',
  '0110011111100110',
  '0111111111111110',
  '0111111111111110',
  '0111122222211110',
  '0111122222211110',
  '0111120000211110',
  '0111122222211110',
  '0011111111111100',
  '0001111111111000',
  '0000011111100000',
];

/** 비트맵을 <rect> 묶음으로. shape-rendering=crispEdges 라서 확대해도 각집니다. */
const bitmapToRects = (rows, { scale = 1, colors }) => {
  const out = [];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      const fill = colors[cell];
      if (!fill) return;
      out.push(
        `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`,
      );
    });
  });
  return out.join('');
};

// ─────────────────────────────────────────── favicon

const faviconRects = bitmapToRects(BEAR, {
  scale: 1,
  colors: { 1: C.paper, 2: C.amber },
});

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
<rect width="16" height="16" fill="${C.accent}"/>
${faviconRects}
</svg>
`;

await writeFile(path.join(ROOT, 'public/favicon.svg'), favicon, 'utf8');

// ─────────────────────────────────────────── 아바타 (일러스트)

const AVATAR_SRC = path.join(ROOT, 'assets/avatar-source.webp');

/** 원형으로 잘라내는 알파 마스크. 흰 모서리를 남기면 다크모드에서 사각형이 튑니다. */
const circleMask = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>` +
      `</svg>`,
  );

/**
 * 일러스트를 도트로 변환합니다. 사이트가 도트 기조라 매끈한 카툰은 언어가 어긋납니다.
 *
 * 두 단계가 다 필요합니다.
 *   1. 작게 줄이기(PIXEL_GRID)  — 픽셀 격자를 만든다
 *   2. 색 수 줄이기(PIXEL_COLOURS) — 이걸 안 하면 '흐릿한 저해상도 사진'이지 도트가 아니다
 *
 * 64px/24색이 최적점입니다. 48px 이하로 내리면 안경과 표정이 뭉개져
 * "누구인지"가 사라집니다.
 *
 * 원형 마스크를 격자 크기에서 적용하는 이유: 테두리도 픽셀 계단이 되어야
 * 내용과 언어가 맞습니다. 큰 크기에서 자르면 매끈한 원이 되어 어긋납니다.
 */
const PIXEL_GRID = 64;
const PIXEL_COLOURS = 24;

/** 도트화된 원형 아바타. png=OG 합성용, webp=화면용(용량 1/4). */
const avatarBuffer = async (size, format = 'png') => {
  const meta = await sharp(AVATAR_SRC).metadata();
  // 원본은 원형 일러스트 주변에 흰 여백이 있습니다. 중앙 88%만 써서 피사체를 키웁니다.
  const crop = Math.round(meta.width * 0.88);
  const off = Math.round((meta.width - crop) / 2);

  const dotted = await sharp(AVATAR_SRC)
    .extract({ left: off, top: off, width: crop, height: crop })
    .resize(PIXEL_GRID, PIXEL_GRID, { fit: 'cover' })
    .composite([{ input: circleMask(PIXEL_GRID), blend: 'dest-in' }])
    .png({ palette: true, colours: PIXEL_COLOURS, dither: 0 })
    .toBuffer();

  // nearest 로 확대해야 픽셀이 뭉개지지 않습니다.
  const scaled = sharp(dotted).resize(size, size, { kernel: 'nearest' });
  return format === 'webp'
    ? scaled.webp({ quality: 92 }).toBuffer()
    : scaled.png({ compressionLevel: 9 }).toBuffer();
};

// 화면에서 쓰는 아바타. 160px 자리까지 2배 밀도로 감당합니다.
// OG는 크롤러 호환 때문에 PNG여야 하지만, 페이지 안에서는 WebP로 충분합니다.
await writeFile(
  path.join(ROOT, 'public/avatar.webp'),
  await avatarBuffer(320, 'webp'),
);

// ─────────────────────────────────────────── OG 기본 이미지

/**
 * 도트 그리드 배경 + 아바타 일러스트 + 제목.
 * 공유 카드는 큰 자리라 도트 곰 대신 일러스트를 씁니다.
 * 텍스트는 시스템 폰트로 렌더됩니다 — sharp가 Galmuri woff2를 못 읽기 때문입니다.
 */
const OG_AVATAR = 300;

const ogBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="${C.terminal}"/>
      <circle cx="1" cy="1" r="1" fill="${C.dot}"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="${C.amber}" stroke-width="6"/>

  <text x="470" y="272" font-family="${KO}" font-size="72" font-weight="700" fill="${C.amber}">서빙하는 아빠곰</text>
  <text x="470" y="322" font-family="Menlo, monospace" font-size="28" fill="#9c9a84">serving-bear</text>
  <text x="470" y="392" font-family="${KO}" font-size="27" fill="#8b8474">가족에겐 맛있는 밥을, 서버에겐 안정적인 코드를</text>
  <text x="470" y="436" font-family="${KO}" font-size="24" fill="#6b6959">끄적임 · 딥다이브 · 얕은 지식 · 웹툰 · 레시피</text>
</svg>`;

await sharp(Buffer.from(ogBackground))
  .composite([
    {
      input: await avatarBuffer(OG_AVATAR),
      top: Math.round((630 - OG_AVATAR) / 2),
      left: 110,
    },
  ])
  .png()
  .toFile(path.join(ROOT, 'public/og-default.png'));

// ─────────────────────────────────────────── 웹툰 플레이스홀더 컷

const panelDir = path.join(ROOT, 'public/webtoon/ep01');
await mkdir(panelDir, { recursive: true });

const panelCaptions = [
  'velog 화면을 본다',
  '새 레포를 만든다',
  '빌드가 통과한다',
];

for (const [i, caption] of panelCaptions.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">
    <defs>
      <pattern id="p" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="${C.paper}"/>
        <circle cx="1" cy="1" r="1" fill="#d3cbb4"/>
      </pattern>
    </defs>
    <rect width="800" height="1000" fill="url(#p)"/>
    <rect x="32" y="32" width="736" height="936" fill="none" stroke="${C.ink}" stroke-width="6"/>
    <g transform="translate(256, 260)">${bitmapToRects(BEAR, { scale: 18, colors: { 1: C.ink, 2: C.accent } })}</g>
    <text x="400" y="680" font-family="Menlo, monospace" font-size="88" font-weight="700" fill="${C.accent}" text-anchor="middle">${i + 1}</text>
    <text x="400" y="750" font-family="${KO}" font-size="30" fill="${C.ink}" text-anchor="middle">${caption}</text>
    <text x="400" y="800" font-family="Menlo, monospace" font-size="22" fill="#8b8474" text-anchor="middle">placeholder panel</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(panelDir, `0${i + 1}.png`));
}

console.log('✓ favicon.svg, og-default.png, webtoon/ep01/0{1,2,3}.png 생성');
