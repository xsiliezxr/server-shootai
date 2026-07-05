const { styleMatchScore } = require('./styleTaxonomy');
const { colorHarmonyScore } = require('./colorTheory');

const OUTFIT_SLOTS = ['top', 'bottom', 'footwear', 'outerwear', 'accessory', 'dress'];

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
    const type = String(garment.type || '').toLowerCase();
    if (byType[type]) {
      byType[type].push(garment);
    }
  }

  for (const slot of OUTFIT_SLOTS) {
    byType[slot].sort((a, b) => b.score - a.score);
  }

  return byType;
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
  const byType = groupGarmentsByType(garments);
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
};
