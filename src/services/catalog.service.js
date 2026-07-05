const { getSupabase } = require('../config/supabase');
const { getCatalogSupabase } = require('../config/supabaseCatalog');
const projectService = require('./project.service');
const AppError = require('../utils/appError');
const { parseBaseColor, colorHarmonyScore } = require('../utils/colorTheory');
const {
  assertValidUuid,
  normalizeTags,
  mapGarmentToApi,
  mapRecommendationToApi,
  isValidProductImage,
  handleSupabaseError,
} = require('../utils/supabaseHelpers');
const {
  styleMatchScore,
  inferGenderFromText,
  canonicalizeStyles,
  matchesGenderStrict,
  matchesGenderFilter,
} = require('../utils/styleTaxonomy');

const normalizeGarment = (g, empresaId) => {
  if (!g || !g.name || !g.type) {
    throw new AppError('Each garment requires at least "name" and "type"', 400);
  }

  if (!empresaId && !g.empresaId) {
    throw new AppError('empresaId is required for each garment', 400);
  }

  if (!isValidProductImage(g.imageUrl)) {
    throw new AppError('Each garment requires a valid "imageUrl"', 400);
  }

  return {
    empresa_id: empresaId || g.empresaId,
    name: g.name,
    brand: g.brand || '',
    type: g.type,
    gender:
      g.gender ||
      inferGenderFromText(g.name, g.type, [
        ...(g.categories || []),
        ...(g.aestheticTags || g.tags || []),
        g.productUrl || '',
      ]),
    color: g.color || '',
    color_hex: g.colorHex || '',
    color_hsl: g.colorHsl || null,
    color_palette: Array.isArray(g.colorPalette) ? g.colorPalette : [],
    silhouette: g.silhouette || '',
    categories: normalizeTags(g.categories || []),
    aesthetic_tags: normalizeTags(g.aestheticTags || g.tags || []),
    image_url: g.imageUrl.trim(),
    product_url: g.productUrl || '',
    price: g.price,
    currency: g.currency || 'USD',
    source: g.source || 'manual',
    active: g.active !== false,
  };
};

const addGarments = async (input, empresaId) => {
  const items = (Array.isArray(input) ? input : [input]).filter(Boolean);

  if (items.length === 0) {
    throw new AppError('At least one garment is required', 400);
  }

  const resolvedEmpresaId = empresaId || items[0]?.empresaId;

  if (resolvedEmpresaId) {
    assertValidUuid(resolvedEmpresaId, 'empresaId');
  }

  const supabase = getCatalogSupabase();
  const rows = items.map((g) => normalizeGarment(g, resolvedEmpresaId));

  const { data, error } = await supabase.from('garment').insert(rows).select('*');

  handleSupabaseError(error);

  return (data || []).map(mapGarmentToApi);
};

const listGarments = async ({ type, tag, limit, empresaId } = {}) => {
  const supabase = getCatalogSupabase();
  let query = supabase
    .from('garment')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 100);

  if (empresaId) {
    assertValidUuid(empresaId, 'empresaId');
    query = query.eq('empresa_id', empresaId);
  }

  if (type) query = query.eq('type', type);
  if (tag) query = query.contains('aesthetic_tags', [String(tag).toLowerCase()]);

  const { data, error } = await query;

  handleSupabaseError(error);

  return (data || []).map(mapGarmentToApi);
};

const scoreGarment = (garmentTags = [], projectTags = []) => {
  const projectSet = new Set(projectTags);
  const matchedTags = garmentTags.filter((t) => projectSet.has(t));
  return { score: matchedTags.length, matchedTags };
};

const scoreGarmentByCategories = (garmentCategories = [], extractedCategories = []) => {
  const categorySet = new Set(extractedCategories);
  const matchedCategories = [
    ...new Set(garmentCategories.filter((c) => categorySet.has(c))),
  ];

  return {
    score: matchedCategories.length,
    matchedCategories,
  };
};

const scoreGarmentsByStyle = (garment, briefStyles = []) => {
  const allTags = normalizeTags([
    ...(garment.aesthetic_tags || []),
    ...(garment.categories || []),
  ]);
  const { score, matchedStyles } = styleMatchScore(allTags, briefStyles);

  return {
    score,
    matchedCategories: matchedStyles,
    matchedStyles,
  };
};

const mapScoredGarment = ({ garment, score, matchedStyles }) => ({
  garmentId: garment.id,
  name: garment.name,
  brand: garment.brand,
  type: garment.type,
  gender: garment.gender || 'unisex',
  color: garment.color,
  silhouette: garment.silhouette,
  imageUrl: garment.image_url,
  productUrl: garment.product_url,
  score: Math.round(score * 100) / 100,
  matchedCategories: matchedStyles,
  matchedTags: matchedStyles,
  selected: false,
});

const recommendForProject = async ({ projectId, limit = 8, gender }) => {
  const project = await projectService.findProjectById(projectId);
  const projectTags = normalizeTags(project.creativeDump?.aestheticTags);
  const projectCategories = normalizeTags(
    project.creativeDump?.extractedCategories
  );
  const briefStyles = canonicalizeStyles([...projectTags, ...projectCategories]);

  const supabase = getCatalogSupabase();
  const { data: catalog, error } = await supabase
    .from('garment')
    .select('*')
    .eq('active', true)
    .eq('empresa_id', project.empresaId);

  handleSupabaseError(error);

  if (!catalog || catalog.length === 0) {
    throw new AppError(
      'Catalog is empty. Load garments via POST /api/catalog/scrape or POST /api/catalog first',
      409
    );
  }

  const scored = catalog
    .filter((g) => matchesGenderStrict(g.gender, gender, g.type))
    .map((g) => {
      const { score, matchedStyles } = scoreGarmentsByStyle(g, briefStyles);
      return { garment: g, score, matchedStyles };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, Number(limit) || 8);

  const recommendedGarments = top.map(({ garment, score, matchedStyles }) =>
    mapScoredGarment({ garment, score, matchedStyles })
  );

  try {
    await projectService.saveRecommendations(projectId, recommendedGarments);
  } catch (err) {
    console.warn('saveRecommendations skipped (catalog FK):', err.message);
  }

  const supabaseClient = getSupabase();
  await supabaseClient
    .from('project')
    .update({ status: project.status === 'draft' ? 'processing' : project.status })
    .eq('id', projectId);

  return {
    projectId: project._id,
    basedOnTags: briefStyles,
    count: recommendedGarments.length,
    recommendedGarments,
  };
};

const matchGarmentsForEmpresa = async ({
  empresaId,
  categories = [],
  aestheticTags = [],
  limit = 8,
  gender,
  poolLimit,
}) => {
  assertValidUuid(empresaId, 'empresaId');

  const briefStyles = canonicalizeStyles([...categories, ...aestheticTags]);
  const fetchLimit = Number(poolLimit) || Math.max(Number(limit) || 8, 40);

  const supabase = getCatalogSupabase();
  const { data: catalog, error } = await supabase
    .from('garment')
    .select('*')
    .eq('active', true)
    .eq('empresa_id', empresaId);

  handleSupabaseError(error);

  if (!catalog || catalog.length === 0) {
    throw new AppError(
      'Catalog is empty for this empresa. Run POST /api/catalog/scrape first',
      409
    );
  }

  const scored = catalog
    .filter((g) => matchesGenderStrict(g.gender, gender, g.type))
    .map((g) => {
      const { score, matchedStyles } = scoreGarmentsByStyle(g, briefStyles);
      return { garment: g, score, matchedStyles };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  let top = scored.slice(0, fetchLimit);

  if (top.length === 0) {
    const relaxed = catalog
      .filter((g) => matchesGenderFilter(g.gender, gender))
      .map((g) => {
        const { score, matchedStyles } = scoreGarmentsByStyle(g, briefStyles);
        return { garment: g, score, matchedStyles };
      })
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, fetchLimit);

    top = relaxed;
  }

  return top.map(({ garment, score, matchedStyles }) =>
    mapScoredGarment({ garment, score, matchedStyles })
  );
};

const countGarments = async (empresaId) => {
  const supabase = getCatalogSupabase();
  let query = supabase
    .from('garment')
    .select('*', { count: 'exact', head: true });

  if (empresaId) {
    query = query.eq('empresa_id', empresaId);
  }

  const { count, error } = await query;
  handleSupabaseError(error);

  return count || 0;
};

const matchGarmentsByColor = async ({
  empresaId,
  baseColor,
  limit = 8,
  type,
}) => {
  if (!empresaId) {
    throw new AppError('empresaId is required', 400);
  }

  if (!baseColor) {
    throw new AppError('baseColor is required (HEX or HSL array)', 400);
  }

  assertValidUuid(empresaId, 'empresaId');

  const baseHsl = parseBaseColor(baseColor);
  if (!baseHsl) {
    throw new AppError('Invalid baseColor. Use HEX (#rrggbb) or HSL [h,s,l]', 400);
  }

  const supabase = getCatalogSupabase();
  let query = supabase
    .from('garment')
    .select('*')
    .eq('active', true)
    .eq('empresa_id', empresaId)
    .not('color_hsl', 'is', null);

  if (type) query = query.eq('type', type);

  const { data: catalog, error } = await query;
  handleSupabaseError(error);

  if (!catalog || catalog.length === 0) {
    throw new AppError(
      'No garments with color data found. Run POST /api/catalog/scrape first',
      409
    );
  }

  const scored = catalog
    .map((garment) => {
      const { score, harmony } = colorHarmonyScore(baseHsl, garment.color_hsl);
      return { garment, score, harmony };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(limit) || 8);

  return {
    empresaId,
    baseColor: baseHsl,
    count: scored.length,
    garments: scored.map(({ garment, score, harmony }) => ({
      ...mapGarmentToApi(garment),
      colorScore: score,
      colorHarmony: harmony,
    })),
  };
};

module.exports = {
  addGarments,
  listGarments,
  recommendForProject,
  matchGarmentsForEmpresa,
  matchGarmentsByColor,
  countGarments,
  scoreGarmentByCategories,
  scoreGarmentsByStyle,
};
