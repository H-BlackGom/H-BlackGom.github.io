/**
 * 내부 링크 끝의 `.md` / `.mdx` 를 떼어냅니다.
 *
 * 왜 필요한가:
 *   src/content/ 를 옵시디언 볼트로 열고 링크 자동완성을 쓰면
 *   `[CAP 이론](/til/cap-theorem.md)` 처럼 확장자가 붙은 링크가 삽입됩니다.
 *   블로그 URL은 `/til/cap-theorem` 이라 확장자만 떼면 그대로 맞습니다.
 *
 * 이 방식을 고른 이유:
 *   위키링크(`[[...]]`) 파서를 만드는 대신 이걸 쓰면 **마크다운이 표준으로 남습니다.**
 *   링크가 옵시디언에서도 유효하고, 다른 플랫폼으로 옮길 때 변환할 게 없습니다.
 *   (옵시디언 설정: Files & Links → Use [[Wikilinks]] OFF,
 *    New link format → Absolute path in vault)
 *
 * 의존성 없음 — unist-util-visit 대신 mdast를 직접 순회합니다.
 */

/** 외부 URL·프로토콜·프로토콜 상대 경로는 건드리지 않습니다. */
const isExternal = (url) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url);

const strip = (url) => {
  if (!url || isExternal(url) || url.startsWith('#')) return url;

  // 앵커와 쿼리는 보존하고 경로 부분만 손봅니다.
  const match = url.match(/^([^#?]*)([#?].*)?$/);
  if (!match) return url;

  const [, pathPart, rest = ''] = match;
  if (!/\.mdx?$/i.test(pathPart)) return url;

  return pathPart.replace(/\.mdx?$/i, '') + rest;
};

const walk = (node) => {
  if (!node || typeof node !== 'object') return;

  // link = 인라인 링크, definition = 참조 링크 정의([id]: /path.md)
  if ((node.type === 'link' || node.type === 'definition') && node.url) {
    node.url = strip(node.url);
  }

  for (const child of node.children ?? []) walk(child);
};

export default function remarkStripMdLinks() {
  return (tree) => {
    walk(tree);
  };
}
