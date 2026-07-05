const { styleMatchScore } = require('./styleTaxonomy');
const { colorHarmonyScore } = require('./colorTheory');

const OUTFIT_SLOTS = ['top', 'bottom', 'footwear', 'outerwear', 'accessory', 'dress'];
const VALID_OUTFIT_SLOTS = new Set(OUTFIT_SLOTS);

const TYPE_KEYWORDS = [
  { type: 'outerwear', words: ['jacket', 'coat', 'puffer', 'blazer', 'parka', 'trench', 'overcoat', 'vest'] },
  { type: 'top', words: ['shirt', 'tee', 't-shirt', 'hoodie', 'sweater', 'sweatshirt', 'top', 'polo', 'knit', 'jumper', 'cardigan', 'blouse', 'camisole'] },
  { type: 'bottom', words: ['pants', 'trousers', 'jeans', 'shorts', 'cargo', 'joggers', 'chino', 'skirt', 'leggings', 'bermuda'] },
  { type: 'dress', words: ['dress', 'gown', 'jumpsuit', 'romper'] },
  { type: 'footwear', words: ['shoes', 'sneakers', 'boots', 'loafers', 'sandals', 'trainers', 'heels', 'footwear'] },
  { type: 'accessory', words: ['bag', 'belt', 'hat', 'cap', 'scarf', 'sunglasses', 'wallet', 'gloves', 'beanie', 'accessory'] },
];

const TYPE_ALIASES = {
  shirts: 'top',
  shirt: 'top',
  tee: 'top',
  tshirt: 'top',
  't-shirt': 'top',
  pants: 'bottom',
  trousers: 'bottom',
  jeans: 'bottom',
  shorts: 'bottom',
  skirt: 'bottom',
  shoes: 'footwear',
  sneakers: 'footwear',
  boots: 'footwear',
  sandals: 'footwear',
  jacket: 'outerwear',
  coat: 'outerwear',
  blazer: 'outerwear',
  bags: 'accessory',
  hat: 'accessory',
  dresses: 'dress',
};

const inferTypeFromName = (name = '') => {
  const lower = String(name).toLowerCase();
  for (const rule of TYPE_KEYWORDS) {
    if (rule.words.some((word) => lower.includes(word))) {
      return rule.type;
    }
  }
  return null;
};

const normalizeGarmentType = (type = '', name = '') => {
  const raw = String(type || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (VALID_OUTFIT_SLOTS.has(raw)) return raw;
  if (TYPE_ALIASES[raw]) return TYPE_ALIASES[raw];

  const compact = raw.replace(/[^a-z|]/g, '');
  if (compact.includes('top') && compact.includes('bottom')) {
    return 'set';
  }

  const fromName = inferTypeFromName(name);
  if (fromName) return fromName;

  return VALID_OUTFIT_SLOTS.has(raw.replace(/\|.*$/, ''))
    ? raw.replace(/\|.*$/, '')
    : 'top';
};

const normalizeGarmentForOutfit = (garment = {}) => {
  const normalizedType = normalizeGarmentType(garment.type, garment.name);
  if (normalizedType === garment.type) return garment;
  return { ...garment, type: normalizedType };
};

const toGarmentSlot = (garment, slot) => ({
  slot,
  garmentId: garment.garmentId,
  name: garment.name,
  brand: garment.brand,
  type: garment.type,
  imageUrl: garment.imageUrl,
  productUrl: garment.productUrl,
  score: garment.score,
});

const groupGarmentsByType = (garments = []) => {
  const byType = Object.fromEntries(OUTFIT_SLOTS.map((slot) => [slot, []]));

  for (const garment of garments) {
    const normalized = normalizeGarmentForOutfit(garment);
    const type = String(normalized.type || '').toLowerCase();

    if (type === 'set') {
      byType.top.push(normalized);
      byType.bottom.push(normalized);
      continue;
    }

    if (byType[type]) {
      byType[type].push(normalized);
    }
  }

  for (const slot of OUTFIT_SLOTS) {
    byType[slot].sort((a, b) => b.score - a.score);
  }

  return byType;
};

const ensureOutfitSlotCoverage = (pool = [], fullPool = []) => {
  const sourcePool = fullPool.length ? fullPool : pool;
  if (!pool.length) return pool;

  const byType = groupGarmentsByType(pool);
  const fullByType = groupGarmentsByType(sourcePool);
  const usedIds = new Set(pool.map((garment) => garment.garmentId));
  const result = [...pool];

  const appendFromSlot = (slot, minCount) => {
    const current = byType[slot]?.length || 0;
    if (current >= minCount) return;

    let needed = minCount - current;
    for (const garment of fullByType[slot] || []) {
      if (usedIds.has(garment.garmentId)) continue;
      result.push(garment);
      usedIds.add(garment.garmentId);
      byType[slot] = byType[slot] || [];
      byType[slot].push(garment);
      needed -= 1;
      if (needed <= 0) break;
    }
  };

  appendFromSlot('footwear', 2);

  const hasDress = (byType.dress?.length || 0) > 0;
  const hasSeparates =
    (byType.top?.length || 0) > 0 && (byType.bottom?.length || 0) > 0;

  if (!hasDress && !hasSeparates) {
    appendFromSlot('top', 3);
    appendFromSlot('bottom', 3);
    appendFromSlot('dress', 1);
  }

  return result;
};

const pickFromSlot = (byType, slot, usedIds, index = 0, allowReuse = false) => {
  const garments = byType[slot] || [];
  if (allowReuse) {
    return garments.length ? garments[index % garments.length] : null;
  }
  return garments.find((g) => !usedIds.has(g.garmentId));
};

const averageScore = (items = []) => {
  if (!items.length) return 0;
  const sum = items.reduce((acc, item) => acc + (item.score || 0), 0);
  return Math.round((sum / items.length) * 100) / 100;
};

const assembleOutfits = (
  garments = [],
  maxOutfits = 3,
  idPrefix = 'outfit',
  options = {}
) => {
  const preparedGarments = ensureOutfitSlotCoverage(garments, garments);
  const byType = groupGarmentsByType(preparedGarments);
  const usedIds = new Set();
  const outfits = [];
  const allowReuse = options.allowReuse === true;

  for (let i = 0; i < maxOutfits; i += 1) {
    const dress = pickFromSlot(byType, 'dress', usedIds, i, allowReuse);
    const top = pickFromSlot(byType, 'top', usedIds, i, allowReuse);
    const bottom = pickFromSlot(byType, 'bottom', usedIds, i, allowReuse);
    const footwear = pickFromSlot(byType, 'footwear', usedIds, i, allowReuse);

    if (!footwear) break;

    const dressScore = dress?.score ?? 0;
    const separateScore = (top?.score ?? 0) + (bottom?.score ?? 0);
    const useDress = Boolean(dress) && (dressScore > separateScore || !top || !bottom);

    const outfitGarments = [];

    if (useDress && dress) {
      outfitGarments.push(toGarmentSlot(dress, 'dress'));
      usedIds.add(dress.garmentId);
    } else if (top && bottom) {
      outfitGarments.push(toGarmentSlot(top, 'top'));
      outfitGarments.push(toGarmentSlot(bottom, 'bottom'));
      usedIds.add(top.garmentId);
      usedIds.add(bottom.garmentId);
    } else if (dress) {
      outfitGarments.push(toGarmentSlot(dress, 'dress'));
      usedIds.add(dress.garmentId);
    } else {
      break;
    }

    outfitGarments.push(toGarmentSlot(footwear, 'footwear'));
    usedIds.add(footwear.garmentId);

    const outerwear = pickFromSlot(byType, 'outerwear', usedIds, i, allowReuse);
    if (outerwear) {
      outfitGarments.push(toGarmentSlot(outerwear, 'outerwear'));
      usedIds.add(outerwear.garmentId);
    }

    const accessory = pickFromSlot(byType, 'accessory', usedIds, i, allowReuse);
    if (accessory) {
      outfitGarments.push(toGarmentSlot(accessory, 'accessory'));
      usedIds.add(accessory.garmentId);
    }

    outfits.push({
      id: `${idPrefix}-${i + 1}`,
      score: averageScore(outfitGarments),
      garments: outfitGarments,
    });
  }

  return outfits;
};

const scoreGarmentForBrief = ({ garment, briefStyles = [], baseHsl = null }) => {
  const allTags = [
    ...(garment.aesthetic_tags || []),
    ...(garment.categories || []),
  ];
  const { score: styleScore, matchedStyles } = styleMatchScore(allTags, briefStyles);

  let colorScore = 0;
  let colorHarmony = null;

  if (baseHsl && garment.color_hsl) {
    const harmony = colorHarmonyScore(baseHsl, garment.color_hsl);
    colorScore = harmony.score;
    colorHarmony = harmony.harmony;
  }

  const combinedScore = baseHsl ? styleScore + colorScore * 2 : styleScore;

  return {
    garment,
    styleScore,
    colorScore,
    colorHarmony,
    combinedScore,
    matchedStyles,
  };
};

module.exports = {
  assembleOutfits,
  groupGarmentsByType,
  scoreGarmentForBrief,
  normalizeGarmentType,
  ensureOutfitSlotCoverage,
};
