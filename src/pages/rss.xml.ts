import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE, sectionOf } from '../consts';
import { getFeed } from '../lib/content';

export async function GET(context: APIContext) {
  const feed = await getFeed();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    trailingSlash: false,
    customData: `<language>ko-kr</language>`,
    items: feed.map((item) => ({
      title: item.title,
      description: item.description,
      link: item.href,
      pubDate: item.publishedAt,
      // 리더에서 섹션을 구분할 수 있게 카테고리로 노출합니다.
      categories: [sectionOf(item.section).label, ...item.tags],
    })),
  });
}
