const CANONICAL_STYLES = [
  'casual',
  'smart-casual',
  'streetwear',
  'formal',
  'minimalist',
  'sportswear',
  'vintage',
  'luxury',
  'bohemian',
  'elegant',
  'y2k',
  'avant-garde',
];

const CANONICAL_SET = new Set(CANONICAL_STYLES);

const STYLE_SYNONYMS = {
  chic: 'elegant',
  classy: 'elegant',
  sophisticated: 'elegant',
  timeless: 'elegant',
  'smart casual': 'smart-casual',
  smartcasual: 'smart-casual',
  sporty: 'sportswear',
  athletic: 'sportswear',
  active: 'sportswear',
  retro: 'vintage',
  classic: 'vintage',
  premium: 'luxury',
  upscale: 'luxury',
  edgy: 'streetwear',
  urban: 'streetwear',
  grunge: 'streetwear',
  basic: 'minimalist',
  clean: 'minimalist',
  essential: 'minimalist',
  boho: 'bohemian',
  hippie: 'bohemian',
  editorial: 'avant-garde',
  artistic: 'avant-garde',
  baggy: 'streetwear',
  oversized: 'streetwear',
  relaxed: 'casual',
  comfy: 'casual',
  business: 'formal',
  tailored: 'formal',
  suit: 'formal',
};

const STRUCTURAL_WORDS = new Set([
  'top',
  'tops',
  'bottom',
  'bottoms',
  'pants',
  'trousers',
  'jeans',
  'shorts',
  'skirt',
  'skirts',
  'dress',
  'dresses',
  'outerwear',
  'footwear',
  'accessory',
  'accessories',
  'polo',
  'shirts',
  'shirt',
  'jacket',
  'jackets',
  'coat',
  'coats',
  'sneakers',
  'shoes',
  'boots',
  'suits',
  'suit',
  'knit',
  'knits',
  'tee',
  't-shirt',
  'tshirt',
  'blazer',
  'blazers',
  'bag',
  'bags',
  'belt',
  'belts',
  'hat',
  'hats',
  'scarf',
  'scarves',
  'polo shirts',
  'contemporary',
  'versatile',
  'modern',
  'trendy',
  'summer',
  'winter',
  'and',
  'fit',
  'regular',
  'straight',
  'wide',
  'leg',
]);

const CONFLICT_PAIRS = [
  ['casual', 'formal'],
  ['streetwear', 'formal'],
  ['streetwear', 'elegant'],
  ['minimalist', 'y2k'],
  ['sportswear', 'formal'],
  ['sportswear', 'elegant'],
  ['bohemian', 'minimalist'],
  ['casual', 'luxury'],
];

const CONFLICT_SET = new Set(
  CONFLICT_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`])
);

const WOMAN_KEYWORDS = [
  'dress',
  'skirt',
  'blouse',
  'halter',
  'gown',
  'bodysuit',
  'heels',
  'cami',
  'corset',
  'midi',
  'maxi',
  'bikini',
  'bralette',
  'stiletto',
  'pumps',
  'earring',
  'earrings',
  'clutch',
  'camisole',
  'romper',
  'jumpsuit',
  'tank top',
  'racerback',
  'vest top',
  'cape skirt',
  'women',
  'woman',
  'feminine',
  'maternity',
  'wrap dress',
  'a-line',
  'peplum',
  'leggings',
  'tights',
  'pantyhose',
  'mules',
  'wedge',
  'platform heel',
  'handbag',
  'purse',
  'tote bag',
  'crossbody',
  'satchel',
  'cardigan',
  'wrap top',
  'off-shoulder',
  'one-shoulder',
  'crop top',
  'bustier',
  'bandeau',
  'culottes',
  'wide leg skirt',
  'pencil skirt',
  'mini skirt',
  'maxi skirt',
  'ballerina',
  'flats',
  'slingback',
  'ankle strap',
  'pearl',
  'choker',
  'pendant necklace',
];

const MAN_KEYWORDS = [
  'tuxedo',
  'tux',
  'oxford',
  'cufflink',
  'cufflinks',
  'tie',
  'boxer',
  'briefs',
  'loafers',
  'chino',
  'cargo pants',
  'men',
  'man',
  'masculine',
  'suit jacket',
  'dress shirt',
  'button-down',
  'button down',
  'polo shirt',
  'henley',
  'suspenders',
  'bow tie',
  'necktie',
  'blazer men',
  'sport coat',
  'trunks',
  'board shorts',
  'cargo short',
  'dress pants',
  'slacks',
  'derby',
  'brogue',
  'monk strap',
  'chelsea boot',
  'work boot',
  'wallet',
  'money clip',
  'cuff',
  'waistcoat',
  'vest men',
  'overcoat men',
];

const NEUTRAL_GARMENT_TYPES = new Set(['footwear', 'outerwear', 'accessory']);

const VALID_GENDERS = new Set(['man', 'woman', 'unisex', 'kids']);

const normalizeToken = (tag) =>
  String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const mapToCanonical = (tag) => {
  const normalized = normalizeToken(tag);
  if (!normalized) return null;
  if (CANONICAL_SET.has(normalized)) return normalized;
  if (STYLE_SYNONYMS[normalized]) return STYLE_SYNONYMS[normalized];
  const hyphenated = normalized.replace(/\s+/g, '-');
  if (CANONICAL_SET.has(hyphenated)) return hyphenated;
  if (STYLE_SYNONYMS[hyphenated]) return STYLE_SYNONYMS[hyphenated];
  return null;
};

const canonicalizeStyles = (tags = []) => {
  const result = new Set();
  for (const tag of tags) {
    const canonical = mapToCanonical(tag);
    if (canonical && !STRUCTURAL_WORDS.has(canonical)) {
      result.add(canonical);
    }
  }
  return [...result];
};

const hasStyleConflict = (a, b) => CONFLICT_SET.has(`${a}|${b}`);

const styleMatchScore = (garmentTags = [], briefTags = []) => {
  const garmentStyles = canonicalizeStyles(garmentTags);
  const briefStyles = canonicalizeStyles(briefTags);
  const garmentSet = new Set(garmentStyles);

  if (briefStyles.length === 0) {
    return { score: 0, matchedStyles: [] };
  }

  const matchedStyles = briefStyles.filter((s) => garmentSet.has(s));
  let score = matchedStyles.length * 2;

  for (const briefStyle of briefStyles) {
    for (const garmentStyle of garmentStyles) {
      if (hasStyleConflict(briefStyle, garmentStyle)) {
        score -= 1.5;
      }
    }
  }

  for (const garmentStyle of garmentStyles) {
    if (!briefStyles.includes(garmentStyle)) {
      score -= 0.25;
    }
  }

  return {
    score: Math.max(0, Math.round(score * 100) / 100),
    matchedStyles,
  };
};

const inferGenderFromText = (name = '', type = '', tags = []) => {
  const text = `${name} ${type} ${(tags || []).join(' ')}`.toLowerCase();

  let womanScore = 0;
  let manScore = 0;

  if (String(type).toLowerCase() === 'dress') {
    womanScore += 3;
  }

  for (const word of WOMAN_KEYWORDS) {
    if (text.includes(word)) womanScore += 1;
  }

  for (const word of MAN_KEYWORDS) {
    if (text.includes(word)) manScore += 1;
  }

  if (text.includes('/women/') || text.includes('/woman/')) {
    womanScore += 5;
  }
  if (text.includes('/men/') || text.includes('/man/')) {
    manScore += 5;
  }

  if (womanScore > manScore && womanScore > 0) return 'woman';
  if (manScore > womanScore && manScore > 0) return 'man';
  return 'unisex';
};

const inferGenderFromListingUrl = (url = '') => {
  const lower = String(url).toLowerCase();
  if (/\/kids[-/]|kids-boy|kids-girl|\/boy-|\/girl-/.test(lower)) {
    return 'kids';
  }
  if (/\/woman[-/]|woman-/.test(lower)) {
    return 'woman';
  }
  if (/\/man[-/]|man-/.test(lower)) {
    return 'man';
  }
  return null;
};

const normalizeGender = (value) => {
  const g = String(value || '').trim().toLowerCase();
  if (g === 'male' || g === 'hombre' || g === 'men' || g === 'man') return 'man';
  if (g === 'female' || g === 'mujer' || g === 'women' || g === 'woman') {
    return 'woman';
  }
  if (g === 'kids' || g === 'niño' || g === 'niños') return 'kids';
  if (VALID_GENDERS.has(g)) return g;
  return 'unisex';
};

const resolveTargetGender = (selectorGender, llmGender) => {
  const selector = normalizeGender(selectorGender);
  const inferred = normalizeGender(llmGender);

  if (selector === 'man' || selector === 'woman' || selector === 'kids') {
    return selector;
  }

  if (inferred === 'man' || inferred === 'woman' || inferred === 'kids') {
    return inferred;
  }

  return 'unisex';
};

const matchesGenderFilter = (garmentGender, targetGender) => {
  const garment = normalizeGender(garmentGender);
  const target = normalizeGender(targetGender);

  if (target === 'unisex') return true;
  if (target === 'man') return garment === 'man' || garment === 'unisex';
  if (target === 'woman') return garment === 'woman' || garment === 'unisex';
  if (target === 'kids') return garment === 'kids' || garment === 'unisex';
  return true;
};

const matchesGenderStrict = (garmentGender, targetGender, garmentType = '') => {
  const garment = normalizeGender(garmentGender);
  const target = normalizeGender(targetGender);
  const type = String(garmentType || '').toLowerCase();

  if (target === 'unisex') return true;

  if (garment === target) return true;

  if (garment === 'unisex' && NEUTRAL_GARMENT_TYPES.has(type)) {
    return true;
  }

  return false;
};

const inferGenderFromBrief = (freeText = '') => {
  const text = String(freeText).toLowerCase();
  if (/\b(mujer|femenin|woman|women|female|dama|ella)\b/.test(text)) {
    return 'woman';
  }
  if (/\b(hombre|masculin|man|men|male|caballero|él)\b/.test(text)) {
    return 'man';
  }
  if (/\b(kids|niño|niña|children|infantil)\b/.test(text)) {
    return 'kids';
  }
  return 'unisex';
};

module.exports = {
  CANONICAL_STYLES,
  CANONICAL_SET,
  STYLE_SYNONYMS,
  STRUCTURAL_WORDS,
  CONFLICT_PAIRS,
  canonicalizeStyles,
  styleMatchScore,
  inferGenderFromText,
  inferGenderFromListingUrl,
  normalizeGender,
  resolveTargetGender,
  matchesGenderFilter,
  matchesGenderStrict,
  NEUTRAL_GARMENT_TYPES,
  inferGenderFromBrief,
};
