const { getSupabase } = require('../config/supabase');
const projectService = require('./project.service');
const storageService = require('./storage.service');
const llmService = require('./llm.service');
const documentService = require('./document.service');
const catalogService = require('./catalog.service');
const AppError = require('../utils/appError');
const {
  assertValidUuid,
  handleSupabaseError,
} = require('../utils/supabaseHelpers');

const processStyleMatch = async ({
  empresaId,
  clienteId,
  name,
  freeText,
  imageFiles = [],
  documentFiles = [],
  limit = 8,
}) => {
  if (!empresaId) {
    throw new AppError('empresaId is required', 400);
  }

  assertValidUuid(empresaId, 'empresaId');

  if (clienteId) {
    assertValidUuid(clienteId, 'clienteId');
  }

  const supabase = getSupabase();

  const { data: project, error: projectError } = await supabase
    .from('project')
    .insert({
      empresa_id: empresaId,
      cliente_id: clienteId || null,
      name: name || `Style Match ${new Date().toISOString()}`,
      status: 'processing',
      free_text: freeText || '',
    })
    .select('*')
    .single();

  handleSupabaseError(projectError, 'Failed to create project');

  const uploadedImages = imageFiles.length
    ? await storageService.uploadImages(imageFiles, 'shootai/style-match')
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

  const llmResult = await llmService.extractAestheticTags({
    freeText: freeText || '',
    imageUrls: imageRecords.map((img) => img.url),
    documentTexts: extractedDocs.map((d) => d.extractedText),
  });

  await supabase
    .from('project')
    .update({
      extracted_categories: llmResult.categories,
      aesthetic_tags: llmResult.aestheticTags,
    })
    .eq('id', project.id);

  const recommendedGarments = await catalogService.matchGarmentsForEmpresa({
    empresaId,
    categories: llmResult.categories,
    aestheticTags: llmResult.aestheticTags,
    limit,
  });

  try {
    await projectService.saveRecommendations(project.id, recommendedGarments);
  } catch (err) {
    console.warn('saveRecommendations skipped (catalog FK):', err.message);
  }

  const { data: outfit, error: outfitError } = await supabase
    .from('outfit')
    .insert({
      project_id: project.id,
      name: 'Style Match Result',
    })
    .select('*')
    .single();

  handleSupabaseError(outfitError);

  if (recommendedGarments.length > 0) {
    const outfitRows = recommendedGarments.map((g) => ({
      outfit_id: outfit.id,
      garment_id: g.garmentId,
      score: g.score,
      matched_categories: g.matchedCategories,
    }));

    const { error: ogError } = await supabase
      .from('outfit_garment')
      .insert(outfitRows);
    if (ogError) {
      console.warn('outfit_garment insert skipped:', ogError.message);
    }
  }

  await supabase
    .from('project')
    .update({ status: 'ready' })
    .eq('id', project.id);

  return {
    projectId: project.id,
    outfitId: outfit.id,
    extractedCategories: llmResult.categories,
    aestheticTags: llmResult.aestheticTags,
    count: recommendedGarments.length,
    recommendedGarments,
    pipeline: {
      storage: imageRecords.length > 0 ? 'cloudinary' : 'none',
      llm: llmResult.source,
      matcher: 'category-overlap',
    },
  };
};

module.exports = { processStyleMatch };
