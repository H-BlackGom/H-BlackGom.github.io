/**
 * velog(@hblackgom)에서 쓰던 정체성을 그대로 가져왔습니다.
 * 다른 이름으로 갈 거면 여기만 고치면 헤더·OG·RSS·JSON-LD가 전부 따라옵니다.
 */
export const SITE = {
  /** 블로그 이름. "밥을 서빙 / 서버에 serving" 이중 의미를 한국어로 옮긴 이름. */
  title: '서빙하는 아빠곰',
  /** 로마자 표기 — OG 이미지와 푸터에서 보조로 씁니다. */
  titleEn: 'serving-bear',
  /** 필명. 얕은 지식 시리즈에서 쓰던 이름을 그대로 유지합니다. */
  author: '아빠곰',
  /** 헤더 부제 · 홈 히어로 · 메타 설명 · OG 이미지에 공통으로 쓰입니다. */
  tagline: '가족에겐 맛있는 밥을, 서버에겐 안정적인 코드를',
  /**
   * 나이("3살")나 특정 주제("분산 시스템, 검색 엔진")를 넣지 않습니다.
   * 나이는 매년 고쳐야 하고, 주제를 못박으면 다루는 범위가 넓어질 때 바로 안 맞습니다.
   * 대신 섹션 5종이 하는 일(파고들기·정리·그리기·차리기)로 표현했습니다.
   */
  description:
    '하나뿐인 딸과 함께 조금씩 성장하는 서버 개발자의 기록. 파고든 것, 짧게 정리한 것, 그린 것, 차린 것을 남깁니다.',
  locale: 'ko-KR',
} as const;

export const LINKS = {
  // ⚠️ 개인 계정입니다. 회사 계정(hyoungrolee)과 섞이지 않게 주의하세요.
  github: 'https://github.com/H-BlackGom',
  velog: 'https://velog.io/@hblackgom',
  instagram: '', // 인스타툰으로 전환하면 채우세요
} as const;

/**
 * 콘텐츠 4종. 헤더·홈·RSS가 모두 이 배열을 참조하므로
 * 섹션을 추가·제거할 때 여기만 고치면 됩니다.
 *
 * velog에서는 제목에 [아빠곰의 얕은 지식], [404 Rest Not Found] 처럼
 * 대괄호 접두사를 붙여 시리즈를 표시해야 했습니다.
 * 여기서는 섹션이 그 역할을 하므로 접두사를 떼고 제목만 쓰면 됩니다.
 */
export const SECTIONS = [
  {
    /**
     * id와 URL은 'notes'로 유지합니다 — 라벨만 바꾸면 링크가 깨지지 않습니다.
     * "노트"가 식상해서 "끄적임"으로. 딥다이브(깊게 판 것)와 축을 이룹니다.
     * 다른 후보였던 것: 잡기, 밑반찬, 그때그때.
     */
    id: 'notes',
    label: '끄적임',
    href: '/notes',
    blurb: '주제를 가리지 않고 남기는 짧은 기록',
    kind: 'article',
  },
  {
    id: 'deepdive',
    label: '딥다이브',
    href: '/deepdive',
    blurb: '한 주제를 시리즈로 끝까지',
    kind: 'series',
  },
  {
    id: 'til',
    label: '얕은 지식',
    href: '/til',
    blurb: '짧게 설명하는 개념 하나',
    kind: 'card',
  },
  {
    id: 'webtoon',
    label: '웹툰',
    href: '/webtoon',
    blurb: '개발하다 겪은 일을 그린 것',
    kind: 'comic',
  },
  {
    id: 'recipe',
    label: '레시피',
    href: '/recipe',
    blurb: '가족에게 서빙한 것',
    kind: 'recipe',
  },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

export const sectionOf = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;

/**
 * 헤더 네비게이션 = 콘텐츠 섹션 + 소개 페이지.
 *
 * "소개" 대신 "주인장"을 씁니다 — 밥을 서빙하는 가게라는 세계관에 맞고,
 * 흔한 About/소개보다 이 블로그다운 말입니다.
 * 다른 후보였던 것: 주방장, 누가 쓰나요, 아빠곰은.
 */
export const ABOUT = { label: '주인장', href: '/about' } as const;

export const NAV: readonly { label: string; href: string }[] = [
  ...SECTIONS.map((s) => ({ label: s.label, href: s.href })),
  ABOUT,
];
