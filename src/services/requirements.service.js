const { getSupabase } = require('../config/supabase');
const { getCatalogSupabase } = require('../config/supabaseCatalog');
const projectService = require('./project.service');
const storageService = require('./storage.service');
const documentService = require('./document.service');
const llmService = require('./llm.service');
const catalogService = require('./catalog.service');
const AppError = require('../utils/appError');
const { parseBaseColor } = require('../utils/colorTheory');
const {
  canonicalizeStyles,
  resolveTargetGender,
  matchesGenderStrict,
} = require('../utils/styleTaxonomy');
const {
  assembleOutfits,
  scoreGarmentForBrief,
} = require('../utils/outfitAssembly');
const { assertValidUuid, handleSupabaseError } = require('../utils/supabaseHelpers');
const profileService = require('./profile.service');
const { MOCK_USER_ID } = require('../config/mockUser');

const DEFAULT_DEMO_EMPRESA_ID = '520d6f4f-7dec-4821-9b17-2f54e35772fd';
const PROJECT_USER_FK = 'project_user_id_fkey';

const uniqueValues = (values = []) =>
  [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const uniqueValuesByGarmentId = (garments = []) => {
  const seen = new Set();
  const result = [];

  for (const garment of garments) {
    const key = garment.garmentId || garment.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(garment);
  }

  return result;
};

const resolveEmpresaId = (empresaId) =>
  empresaId || process.env.DEMO_EMPRESA_ID || DEFAULT_DEMO_EMPRESA_ID;

const isMockUser = (userId) => userId === MOCK_USER_ID;

const toPersistableUserId = (userId) => (userId && !isMockUser(userId) ? userId : null);

const isProjectUserFkError = (error) =>
  error?.code === '23503' &&
  String(error?.message || '').includes(PROJECT_USER_FK);

const insertProject = async (payload) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('project')
    .insert(payload)
    .select('*')
    .single();

  if (isProjectUserFkError(error) && payload.user_id) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('project')
      .insert({ ...payload, user_id: null })
      .select('*')
      .single();
    handleSupabaseError(fallbackError, 'Failed to create project');
    return fallback;
  }

  if (error?.message?.includes('check constraint') && payload.status === 'requirements') {
    const { data: fallback, error: fallbackError } = await supabase
      .from('project')
      .insert({ ...payload, status: 'draft' })
      .select('*')
      .single();
    handleSupabaseError(fallbackError, 'Failed to create project');
    return fallback;
  }

  handleSupabaseError(error, 'Failed to create project');
  return data;
};

const saveRequirements = async ({
  empresaId,
  clienteId,
  name,
  freeText,
  imageFiles = [],
  documentFiles = [],
  userId,
}) => {
  const resolvedEmpresaId = resolveEmpresaId(empresaId);

  assertValidUuid(resolvedEmpresaId, 'empresaId');

  if (clienteId) {
    assertValidUuid(clienteId, 'clienteId');
  }

  const project = await insertProject({
    empresa_id: resolvedEmpresaId,
    cliente_id: clienteId || null,
    user_id: toPersistableUserId(userId),
    name: name || `Requirements ${new Date().toISOString()}`,
    status: 'requirements',
    free_text: freeText || '',
  });

  const supabase = getSupabase();

  const uploadedImages = imageFiles.length
    ? await storageService.uploadImages(imageFiles, 'shootai/requirements')
    : [];

  const imageRecords = uploadedImages.map((img) => ({
    project_id: project.id,
    url: img.url,
    public_id: img.publicId,
    caption: '',
  }));

  if (imageRecords.length > 0) {
    const { error: imgError } = await supabase
      .from('project_image')
      .insert(imageRecords);
    handleSupabaseError(imgError);
  }

  const extractedDocs = documentFiles.length
    ? await documentService.extractDocuments(documentFiles)
    : [];

  if (extractedDocs.length > 0) {
    const { error: docError } = await supabase.from('project_document').insert(
      extractedDocs.map((doc) => ({
        project_id: project.id,
        filename: doc.filename,
        extracted_text: doc.extractedText,
      }))
    );
    handleSupabaseError(docError);
  }

  return {
    projectId: project.id,
    empresaId: project.empresa_id,
    status: project.status,
    freeText: freeText || '',
    images: imageRecords.map((img) => ({
      url: img.url,
      publicId: img.public_id,
      caption: img.caption,
    })),
    documents: extractedDocs.map((doc) => ({
      filename: doc.filename,
      extractedText: doc.extractedText,
    })),
    pipeline: {
      storage: imageRecords.length > 0 ? 'cloudinary' : 'none',
      stage: 'requirements-intake',
    },
  };
};

const mapScoredGarment = ({
  garment,
  combinedScore,
  matchedStyles,
  colorScore,
  colorHarmony,
}) => ({
  garmentId: garment.id,
  name: garment.name,
  brand: garment.brand,
  type: garment.type,
  gender: garment.gender || 'unisex',
  color: garment.color,
  silhouette: garment.silhouette,
  imageUrl: garment.image_url,
  productUrl: garment.product_url,
  score: Math.round(combinedScore * 100) / 100,
  categoryScore: matchedStyles.length,
  colorScore: colorScore ? Math.round(colorScore * 100) / 100 : 0,
  colorHarmony: colorHarmony || 'none',
  matchedCategories: matchedStyles,
  matchedTags: matchedStyles,
  selected: false,
});

const scoreCatalogGarments = ({ catalog, briefStyles, baseHsl, gender }) =>
  catalog
    .filter((garment) => matchesGenderStrict(garment.gender, gender, garment.type))
    .map((garment) => scoreGarmentForBrief({ garment, briefStyles, baseHsl }))
    .sort((a, b) => b.combinedScore - a.combinedScore);

const mapScoredPool = (scored = []) =>
  scored.map(
    ({ garment, combinedScore, matchedStyles, colorScore, colorHarmony }) =>
      mapScoredGarment({
        garment,
        combinedScore,
        matchedStyles,
        colorScore,
        colorHarmony,
      })
  );

const matchGarmentsWithColor = async ({
  empresaId,
  categories = [],
  aestheticTags = [],
  baseColor,
  gender,
  poolLimit = 50,
}) => {
  const briefStyles = canonicalizeStyles([...categories, ...aestheticTags]);
  const baseHsl = baseColor ? parseBaseColor(baseColor) : null;
  const limit = Number(poolLimit) || 50;

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

  const pickPool = (scored, minScore) =>
    scored.filter(({ combinedScore, styleScore }) =>
      baseHsl ? combinedScore >= minScore : styleScore >= minScore
    );

  let scored = pickPool(
    scoreCatalogGarments({
      catalog,
      briefStyles,
      baseHsl,
      gender,
    }),
    0.5
  );

  if (scored.length < 12) {
    scored = pickPool(
      scoreCatalogGarments({
        catalog,
        briefStyles,
        baseHsl,
        gender,
      }),
      0
    );
  }

  scored = scored.slice(0, limit);

  if (scored.length === 0) {
    const fallback = await catalogService.matchGarmentsForEmpresa({
      empresaId,
      categories,
      aestheticTags,
      gender,
      poolLimit: limit,
    });
    return { garments: fallback, colorApplied: false };
  }

  return {
    garments: mapScoredPool(scored),
    colorApplied: Boolean(baseHsl),
  };
};

const detectCategories = async ({ projectId, gender }) => {
  assertValidUuid(projectId, 'projectId');

  const project = await projectService.findProjectById(projectId);
  const creativeDump = project.creativeDump || {};

  const imageUrls = (creativeDump.images || []).map((img) => img.url);
  const documentTexts = (creativeDump.documents || []).map((d) => d.extractedText);

  const llmResult = await llmService.extractAestheticTags({
    freeText: creativeDump.freeText || '',
    imageUrls,
    documentTexts,
  });

  const targetGender = resolveTargetGender(gender, llmResult.gender);
  const canonicalCategories = canonicalizeStyles(llmResult.categories);
  const tags = [
    ...canonicalCategories,
    ...(llmResult.aestheticTags || []),
  ];

  const supabase = getSupabase();
  await supabase
    .from('project')
    .update({
      extracted_categories: canonicalCategories,
      aesthetic_tags: llmResult.aestheticTags,
      status: 'processing',
    })
    .eq('id', projectId);

  return {
    projectId,
    extractedCategories: canonicalCategories,
    aestheticTags: llmResult.aestheticTags,
    gender: targetGender,
    tags,
    pipeline: {
      llm: llmResult.source,
      stage: 'category-detection',
    },
  };
};

const computeMatchPercentage = (outfits, briefStyles, colorApplied) => {
  const maxTheoreticalScore = briefStyles.length * 2 + (colorApplied ? 2 : 0);
  const bestScore = outfits[0]?.score ?? 0;
  return maxTheoreticalScore > 0
    ? Math.min(100, Math.round((bestScore / maxTheoreticalScore) * 100))
    : 0;
};

const processRequirements = async ({
  projectId,
  limit = 8,
  baseColor,
  gender,
  userId,
  accessToken,
}) => {
  assertValidUuid(projectId, 'projectId');

  const project = await projectService.findProjectById(projectId);
  const creativeDump = project.creativeDump || {};

  let profile = null;
  if (userId) {
    profile = await profileService.getProfile(userId, accessToken);
    const persistableUserId = toPersistableUserId(userId);

    if (persistableUserId && project.userId && project.userId !== persistableUserId) {
      throw new AppError('Project does not belong to this user', 403);
    }

    if (persistableUserId && !project.userId) {
      const supabase = getSupabase();
      const { error: userUpdateError } = await supabase
        .from('project')
        .update({ user_id: persistableUserId })
        .eq('id', projectId);

      if (userUpdateError && !isProjectUserFkError(userUpdateError)) {
        handleSupabaseError(userUpdateError, 'Failed to associate project user');
      }
    }
  }

  let canonicalCategories = canonicalizeStyles(
    creativeDump.extractedCategories || []
  );
  let aestheticTags = creativeDump.aestheticTags || [];
  let targetGender = resolveTargetGender(
    gender || profile?.gender,
    null
  );
  let llmSource = 'stored';

  if (canonicalCategories.length === 0 && aestheticTags.length === 0) {
    const imageUrls = (creativeDump.images || []).map((img) => img.url);
    const documentTexts = (creativeDump.documents || []).map((d) => d.extractedText);

    const llmResult = await llmService.extractAestheticTags({
      freeText: creativeDump.freeText || '',
      imageUrls,
      documentTexts,
    });

    targetGender = resolveTargetGender(
      gender || profile?.gender,
      llmResult.gender
    );
    canonicalCategories = canonicalizeStyles(llmResult.categories);
    aestheticTags = llmResult.aestheticTags;
    llmSource = llmResult.source;

    const supabase = getSupabase();
    await supabase
      .from('project')
      .update({
        extracted_categories: canonicalCategories,
        aesthetic_tags: aestheticTags,
        status: 'processing',
      })
      .eq('id', projectId);
  } else if (gender || profile?.gender) {
    targetGender = resolveTargetGender(gender || profile?.gender, null);
  }

  const profileColors = profile?.bodyAttributes?.recommendedColors || [];
  const resolvedBaseColor =
    baseColor || profileColors[0] || null;

  const categoriesToProcess = uniqueValues([
    ...canonicalCategories,
    ...canonicalizeStyles(aestheticTags),
  ]);
  if (categoriesToProcess.length === 0) {
    categoriesToProcess.push('casual');
  }
  const minOutfitsPerCategory = categoriesToProcess.length === 1 ? 3 : 2;

  const outfitsByCategory = [];
  let allOutfits = [];
  let colorApplied = false;

  for (const category of categoriesToProcess) {
    const { garments: scoredGarments, colorApplied: catColorApplied } =
      await matchGarmentsWithColor({
        empresaId: project.empresaId,
        categories: [category],
        aestheticTags,
        baseColor: resolvedBaseColor,
        gender: targetGender,
        poolLimit: Math.max(Number(limit) || 8, 50),
      });

    if (catColorApplied) colorApplied = true;

    let categoryOutfits = assembleOutfits(
      scoredGarments,
      Math.max(3, minOutfitsPerCategory),
      category
    );

    if (categoryOutfits.length === 0) {
      const { garments: broadPool } = await matchGarmentsWithColor({
        empresaId: project.empresaId,
        categories: categoriesToProcess,
        aestheticTags,
        baseColor: resolvedBaseColor,
        gender: targetGender,
        poolLimit: Math.max(Number(limit) || 8, 80),
      });
      categoryOutfits = assembleOutfits(
        uniqueValuesByGarmentId([...scoredGarments, ...broadPool]),
        Math.max(3, minOutfitsPerCategory),
        category,
        { allowReuse: categoryOutfits.length < minOutfitsPerCategory }
      );
    }

    if (categoryOutfits.length < minOutfitsPerCategory) {
      categoryOutfits = assembleOutfits(
        scoredGarments,
        minOutfitsPerCategory,
        category,
        { allowReuse: true }
      );
    }

    if (categoryOutfits.length === 0) continue;

    const briefStyles = canonicalizeStyles([category, ...aestheticTags]);
    const matchPercentage = computeMatchPercentage(
      categoryOutfits,
      briefStyles,
      catColorApplied
    );

    outfitsByCategory.push({
      category,
      matchPercentage,
      outfits: categoryOutfits,
    });

    allOutfits = allOutfits.concat(categoryOutfits);
  }

  if (allOutfits.length === 0) {
    const { garments: globalPool, colorApplied: globalColorApplied } =
      await matchGarmentsWithColor({
        empresaId: project.empresaId,
        categories: categoriesToProcess,
        aestheticTags,
        baseColor: resolvedBaseColor,
        gender: targetGender,
        poolLimit: Math.max(Number(limit) || 8, 80),
      });

    if (globalColorApplied) colorApplied = true;

    const fallbackCategory = categoriesToProcess[0] || 'casual';
    const fallbackOutfits = assembleOutfits(globalPool, 3, fallbackCategory);
    const briefStyles = canonicalizeStyles([
      ...categoriesToProcess,
      ...aestheticTags,
    ]);
    const fallbackMatch = computeMatchPercentage(
      fallbackOutfits,
      briefStyles,
      globalColorApplied
    );

    if (fallbackOutfits.length > 0) {
      outfitsByCategory.push({
        category: fallbackCategory,
        matchPercentage: fallbackMatch,
        outfits: fallbackOutfits,
      });
      allOutfits = fallbackOutfits;
    }
  }

  const recommendedGarments = allOutfits.flatMap((outfit) => outfit.garments);

  try {
    await projectService.saveRecommendations(projectId, recommendedGarments);
  } catch (err) {
    console.warn('saveRecommendations skipped (catalog FK):', err.message);
  }

  const supabase = getSupabase();
  await supabase
    .from('project')
    .update({ status: 'ready' })
    .eq('id', projectId);

  const briefStyles = canonicalizeStyles([
    ...canonicalCategories,
    ...aestheticTags,
  ]);
  const matchPercentage = computeMatchPercentage(
    allOutfits,
    briefStyles,
    colorApplied
  );

  return {
    projectId,
    extractedCategories: canonicalCategories,
    aestheticTags,
    gender: targetGender,
    matchPercentage,
    count: allOutfits.length,
    outfits: allOutfits,
    outfitsByCategory,
    recommendedGarments,
    profileApplied: Boolean(profile?.bodyPhotoUrl),
    pipeline: {
      llm: llmSource,
      matcher: colorApplied
        ? 'style-canonical+color-theory+gender+outfits+profile'
        : 'style-canonical+gender+outfits+profile',
      colorTheory: colorApplied ? 'applied' : 'skipped',
    },
  };
};

const persistShootPlan = async (projectId, shootPlan) => {
  const supabase = getSupabase();

  const visionAnalysis = {
    modelImage: shootPlan.modelImage || { url: '', publicId: '' },
    proportions: shootPlan.proportions || {},
    recommendation: shootPlan.recommendation || {},
    shootPlan: {
      poses: shootPlan.poses,
      angles: shootPlan.angles,
      camera: shootPlan.camera,
      lens: shootPlan.lens,
      lighting: shootPlan.lighting,
      source: shootPlan.source,
      modelEndpoint: shootPlan.modelEndpoint,
    },
  };

  const { error } = await supabase
    .from('project')
    .update({
      vision_analysis: visionAnalysis,
      status: 'planned',
    })
    .eq('id', projectId);

  if (error?.message?.includes('check constraint')) {
    await supabase
      .from('project')
      .update({
        vision_analysis: visionAnalysis,
        status: 'ready',
      })
      .eq('id', projectId);
    return;
  }

  handleSupabaseError(error);
};

module.exports = {
  saveRequirements,
  detectCategories,
  processRequirements,
  persistShootPlan,
  matchGarmentsWithColor,
};
