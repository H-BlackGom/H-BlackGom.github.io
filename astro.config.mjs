import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkStripMdLinks from './plugins/remark-strip-md.mjs';

export default defineConfig({
  // GitHub Pages user site (H-BlackGom.github.io) — 루트에서 서비스되므로 base가 없습니다.
  //
  // 나중에 자체 도메인을 붙일 때는 이 한 줄만 바꾸고 public/CNAME 을 추가하면 됩니다.
  // 내부 경로가 하나도 안 바뀌므로 쌓아둔 URL이 그대로 살아있습니다.
  // (project site 로 만들었다면 base 제거 때문에 모든 URL이 바뀌고,
  //  GitHub Pages는 리다이렉트를 못 해서 복구가 불가능했을 겁니다.)
  site: 'https://h-blackgom.github.io',

  trailingSlash: 'never',

  integrations: [mdx(), sitemap()],

  markdown: {
    // 옵시디언이 넣는 `/til/cap-theorem.md` 형태를 블로그 URL로 맞춥니다.
    remarkPlugins: [remarkStripMdLinks],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },

  image: {
    // 웹툰 이미지를 R2/Cloudinary 등 외부 호스트에 두면 여기에 도메인을 추가하세요.
    // remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }],
  },

  build: { format: 'directory' },
});
