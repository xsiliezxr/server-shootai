const { getSupabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const {
  assertValidUuid,
  mapProjectToApi,
  handleSupabaseError,
} = require('../utils/supabaseHelpers');

const fetchProjectRelations = async (projectId) => {
  const supabase = getSupabase();

  const [imagesRes, docsRes, recsRes, eventsRes] = await Promise.all([
    supabase.from('project_image').select('*').eq('project_id', projectId),
    supabase.from('project_document').select('*').eq('project_id', projectId),
    supabase
      .from('recommendation')
      .select('*')
      .eq('project_id', projectId)
      .order('score', { ascending: false }),
    supabase
      .from('whatsapp_event')
      .select('*')
      .eq('project_id', projectId)
      .order('received_at', { ascending: false }),
  ]);

  handleSupabaseError(imagesRes.error);
  handleSupabaseError(docsRes.error);
  handleSupabaseError(recsRes.error);
  handleSupabaseError(eventsRes.error);

  return {
    images: imagesRes.data || [],
    documents: docsRes.data || [],
    recommendations: recsRes.data || [],
    whatsappEvents: eventsRes.data || [],
  };
};

const findProjectRowById = async (projectId) => {
  assertValidUuid(projectId, 'projectId');

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('project')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    throw new AppError('Project not found', 404);
  }

  return data;
};

const findProjectById = async (projectId) => {
  const project = await findProjectRowById(projectId);
  const relations = await fetchProjectRelations(projectId);
  return mapProjectToApi(project, relations);
};

const createProject = async ({ name, status, empresaId, clienteId }) => {
  if (!name || !name.trim()) {
    throw new AppError('Project name is required', 400);
  }

  if (!empresaId) {
    throw new AppError('empresaId is required', 400);
  }

  assertValidUuid(empresaId, 'empresaId');

  if (clienteId) {
    assertValidUuid(clienteId, 'clienteId');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('project')
    .insert({
      name: name.trim(),
      status: status || 'draft',
      empresa_id: empresaId,
      cliente_id: clienteId || null,
    })
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to create project');

  return mapProjectToApi(data, {});
};

const getProjects = async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('project')
    .select('*')
    .order('updated_at', { ascending: false });

  handleSupabaseError(error);

  return (data || []).map((p) => mapProjectToApi(p, {}));
};

const getProjectById = async (projectId) => findProjectById(projectId);

const updateProject = async (projectId, updates) => {
  await findProjectRowById(projectId);

  const patch = {};

  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.freeText !== undefined) patch.free_text = updates.freeText;
  if (updates.aestheticTags !== undefined) {
    patch.aesthetic_tags = updates.aestheticTags;
  }
  if (updates.extractedCategories !== undefined) {
    patch.extracted_categories = updates.extractedCategories;
  }
  if (updates.visionAnalysis !== undefined) {
    patch.vision_analysis = updates.visionAnalysis;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('project')
    .update(patch)
    .eq('id', projectId)
    .select('*')
    .single();

  handleSupabaseError(error);

  const relations = await fetchProjectRelations(projectId);
  return mapProjectToApi(data, relations);
};

const deleteProject = async (projectId) => {
  await findProjectRowById(projectId);

  const supabase = getSupabase();
  const { error } = await supabase.from('project').delete().eq('id', projectId);

  handleSupabaseError(error);

  return { id: projectId };
};

const exportProject = async (projectId) => {
  const project = await findProjectById(projectId);

  return {
    id: project._id,
    name: project.name,
    status: project.status,
    creativeDump: project.creativeDump,
    recommendedGarments: project.recommendedGarments,
    visionAnalysis: project.visionAnalysis,
    whatsappEvents: project.whatsappEvents,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    exportedAt: new Date().toISOString(),
  };
};

const saveRecommendations = async (projectId, recommendedGarments) => {
  const supabase = getSupabase();

  await supabase.from('recommendation').delete().eq('project_id', projectId);

  if (recommendedGarments.length === 0) return [];

  const rows = recommendedGarments.map((g) => ({
    project_id: projectId,
    garment_id: g.garmentId,
    score: g.score,
    matched_categories: g.matchedCategories || g.matchedTags || [],
    selected: g.selected || false,
    name: g.name,
    brand: g.brand || '',
    type: g.type,
    color: g.color || '',
    silhouette: g.silhouette || '',
    image_url: g.imageUrl || '',
    product_url: g.productUrl || '',
  }));

  const { data, error } = await supabase
    .from('recommendation')
    .insert(rows)
    .select('*');

  handleSupabaseError(error);

  return data || [];
};

const addWhatsappEvent = async (projectId, event) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('whatsapp_event')
    .insert({
      project_id: projectId,
      direction: event.direction,
      from: event.from || '',
      type: event.type || 'message',
      payload: event.payload || {},
      received_at: event.receivedAt || new Date().toISOString(),
    })
    .select('*')
    .single();

  handleSupabaseError(error);

  return data;
};

module.exports = {
  findProjectById,
  findProjectRowById,
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  exportProject,
  saveRecommendations,
  addWhatsappEvent,
  fetchProjectRelations,
};
