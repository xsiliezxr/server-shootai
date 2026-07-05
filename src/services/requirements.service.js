const { getSupabase } = require('../config/supabase');
const { getCatalogSupabase } = require('../config/supabaseCatalog');
const projectService = require('./project.service');
const storageService = require('./storage.service');
const documentService = require('./document.service');
const llmService = require('./llm.service');
const catalogService = require('./catalog.service');
const AppError = require('../utils/appError');
const { parseBaseColor, colorHarmonyScore } = require('../utils/colorTheory');
const {
  assertValidUuid,
  normalizeTags,
  handleSupabaseError,
} = require('../utils/supabaseHelpers');

const insertProject = async (payload) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('project')
    .insert(payload)
    .select('*')
    .single();

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
}) => {
  if (!empresaId) {
    throw new AppError('empresaId is required (set DEMO_EMPRESA_ID)', 400);
  }

  assertValidUuid(empresaId, 'empresaId');

  if (clienteId) {
    assertValidUuid(clienteId, 'clienteId');
  }

  const project = await insertProject({
    empresa_id: empresaId,
    cliente_id: clienteId || null,
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

const matchGarmentsWithColor = async ({
  empresaId,
  categories = [],
  aestheticTags = [],
  baseColor,
  limit = 8,
}) => {
  const matchTags = normalizeTags([...categories, ...aestheticTags]);
  const baseHsl = baseColor ? parseBaseColor(baseColor) : null;

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
    .map((garment) => {
      const allTags = normalizeTags([
        ...(garment.aesthetic_tags || []),
        ...(garment.categories || []),
      ]);
      const { score: categoryScore, matchedCategories } =
        catalogService.scoreGarmentByCategories(allTags, matchTags);

      let colorScore = 0;
      let colorHarmony = null;

      if (baseHsl && garment.color_hsl) {
        const harmony = colorHarmonyScore(baseHsl, garment.color_hsl);
        colorScore = harmony.score;
        colorHarmony = harmony.harmony;
      }

      const combinedScore = baseHsl
        ? categoryScore + colorScore * 2
        : categoryScore;

      return {
        garment,
        categoryScore,
        colorScore,
        colorHarmony,
        combinedScore,
        matchedCategories,
      };
    })
    .filter(({ combinedScore, categoryScore }) =>
      baseHsl ? combinedScore > 0 : categoryScore > 0
    )
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, Number(limit) || 8);

  if (scored.length === 0) {
    const fallback = await catalogService.matchGarmentsForEmpresa({
      empresaId,
      categories,
      aestheticTags,
      limit,
    });
    return { garments: fallback, colorApplied: false };
  }

  const garments = scored.map(
    ({ garment, combinedScore, matchedCategories, colorScore, colorHarmony }) => ({
      garmentId: garment.id,
      name: garment.name,
      brand: garment.brand,
      type: garment.type,
      color: garment.color,
      silhouette: garment.silhouette,
      imageUrl: garment.image_url,
      productUrl: garment.product_url,
      score: Math.round(combinedScore * 100) / 100,
      categoryScore: matchedCategories.length,
      colorScore: colorScore ? Math.round(colorScore * 100) / 100 : 0,
      colorHarmony: colorHarmony || 'none',
      matchedCategories,
      matchedTags: matchedCategories,
      selected: false,
    })
  );

  return { garments, colorApplied: Boolean(baseHsl) };
};

const processRequirements = async ({
  projectId,
  limit = 8,
  baseColor,
}) => {
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

  const supabase = getSupabase();
  await supabase
    .from('project')
    .update({
      extracted_categories: llmResult.categories,
      aesthetic_tags: llmResult.aestheticTags,
      status: 'processing',
    })
    .eq('id', projectId);

  const { garments: recommendedGarments, colorApplied } =
    await matchGarmentsWithColor({
      empresaId: project.empresaId,
      categories: llmResult.categories,
      aestheticTags: llmResult.aestheticTags,
      baseColor,
      limit,
    });

  try {
    await projectService.saveRecommendations(projectId, recommendedGarments);
  } catch (err) {
    console.warn('saveRecommendations skipped (catalog FK):', err.message);
  }

  await supabase
    .from('project')
    .update({ status: 'ready' })
    .eq('id', projectId);

  return {
    projectId,
    extractedCategories: llmResult.categories,
    aestheticTags: llmResult.aestheticTags,
    count: recommendedGarments.length,
    recommendedGarments,
    pipeline: {
      llm: llmResult.source,
      matcher: colorApplied ? 'category-overlap+color-theory' : 'category-overlap',
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
  processRequirements,
  persistShootPlan,
  matchGarmentsWithColor,
};
