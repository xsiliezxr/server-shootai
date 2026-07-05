const { getDbClient } = require('../config/supabase');
const llmService = require('./llm.service');
const AppError = require('../utils/appError');
const { assertValidUuid, handleSupabaseError } = require('../utils/supabaseHelpers');

const mapFavoriteToApi = (row) => ({
  id: row.id,
  userId: row.user_id,
  projectId: row.project_id,
  title: row.title || '',
  category: row.category || '',
  event: row.event || '',
  occasion: row.occasion || '',
  matchPercentage: row.match_percentage || 0,
  garments: row.garments || [],
  createdAt: row.created_at,
});

const suggestOccasion = async ({ category, garments = [], title = '', event = '' }) => {
  const garmentNames = garments.map((g) => g.name).filter(Boolean).join(', ');
  const fallback = event || category || 'Ocasion casual';

  const { apiKey } = llmService.getLlmConfig();
  if (!apiKey) return fallback;

  try {
    const { parsed } = await llmService.chatCompletion({
      messages: [
        {
          role: 'system',
          content:
            'Suggest a short occasion label for a saved outfit. Respond with JSON only: { "occasion": "..." }',
        },
        {
          role: 'user',
          content: `Category: ${category || 'general'}
Event/theme: ${event || title || 'none'}
Garments: ${garmentNames || 'unknown'}

Suggest one concise occasion in Spanish (e.g. "Cena formal", "Oficina casual", "Salida nocturna").`,
        },
      ],
      temperature: 0.3,
    });

    return parsed?.occasion || fallback;
  } catch {
    return fallback;
  }
};

const createFavorite = async (userId, accessToken, payload) => {
  const {
    projectId,
    title = '',
    category = '',
    event = '',
    occasion,
    matchPercentage = 0,
    garments = [],
  } = payload;

  if (projectId) assertValidUuid(projectId, 'projectId');

  const resolvedOccasion =
    occasion ||
    (await suggestOccasion({ category, garments, title, event }));

  const supabase = getDbClient(accessToken);
  const { data, error } = await supabase
    .from('favorite_outfit')
    .insert({
      user_id: userId,
      project_id: projectId || null,
      title,
      category,
      event,
      occasion: resolvedOccasion,
      match_percentage: Number(matchPercentage) || 0,
      garments,
    })
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to save favorite');
  return mapFavoriteToApi(data);
};

const listFavorites = async (userId, accessToken, filters = {}) => {
  const supabase = getDbClient(accessToken);
  let query = supabase
    .from('favorite_outfit')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.event) query = query.eq('event', filters.event);
  if (filters.occasion) query = query.eq('occasion', filters.occasion);

  const { data, error } = await query;
  handleSupabaseError(error, 'Failed to list favorites');
  return (data || []).map(mapFavoriteToApi);
};

const updateFavorite = async (userId, accessToken, favoriteId, updates = {}) => {
  assertValidUuid(favoriteId, 'favoriteId');

  const patch = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.event !== undefined) patch.event = updates.event;
  if (updates.occasion !== undefined) patch.occasion = updates.occasion;

  if (Object.keys(patch).length === 0) {
    throw new AppError('No fields to update', 400);
  }

  const supabase = getDbClient(accessToken);
  const { data, error } = await supabase
    .from('favorite_outfit')
    .update(patch)
    .eq('id', favoriteId)
    .eq('user_id', userId)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to update favorite');
  if (!data) throw new AppError('Favorite not found', 404);
  return mapFavoriteToApi(data);
};

const removeFavorite = async (userId, accessToken, favoriteId) => {
  assertValidUuid(favoriteId, 'favoriteId');

  const supabase = getDbClient(accessToken);
  const { error } = await supabase
    .from('favorite_outfit')
    .delete()
    .eq('id', favoriteId)
    .eq('user_id', userId);

  handleSupabaseError(error, 'Failed to delete favorite');
  return { deleted: true, id: favoriteId };
};

const suggestOccasionForOutfit = async (payload) => suggestOccasion(payload);

module.exports = {
  createFavorite,
  listFavorites,
  updateFavorite,
  removeFavorite,
  suggestOccasionForOutfit,
  mapFavoriteToApi,
};
