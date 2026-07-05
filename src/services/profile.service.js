const { getDbClient } = require('../config/supabase');
const storageService = require('./storage.service');
const bodyPhotoService = require('./bodyPhoto.service');
const AppError = require('../utils/appError');
const { normalizeGender } = require('../utils/styleTaxonomy');
const { handleSupabaseError } = require('../utils/supabaseHelpers');

const mapProfileToApi = (row) => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name || '',
  gender: row.gender || 'unisex',
  bodyPhotoUrl: row.body_photo_url || '',
  bodyPhotoPublicId: row.body_photo_public_id || '',
  bodyAttributes: row.body_attributes || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getProfile = async (userId, accessToken) => {
  const supabase = getDbClient(accessToken);
  const { data, error } = await supabase
    .from('app_user')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch profile');

  if (!data) return null;
  return mapProfileToApi(data);
};

const upsertProfile = async (userId, accessToken, { email, displayName, gender }) => {
  const supabase = getDbClient(accessToken);
  const patch = {
    id: userId,
    email: email || '',
    updated_at: new Date().toISOString(),
  };

  if (displayName !== undefined) patch.display_name = displayName;
  if (gender !== undefined) patch.gender = normalizeGender(gender);

  const { data, error } = await supabase
    .from('app_user')
    .upsert(patch, { onConflict: 'id' })
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to upsert profile');
  return mapProfileToApi(data);
};

const ensureProfile = async (user, accessToken) => {
  const existing = await getProfile(user.id, accessToken);
  if (existing) return existing;

  return upsertProfile(user.id, accessToken, {
    email: user.email || '',
    displayName: user.user_metadata?.display_name || '',
    gender: 'unisex',
  });
};

const setBodyPhoto = async (userId, accessToken, file) => {
  if (!file || !file.buffer) {
    throw new AppError('No image file provided', 400);
  }

  const uploaded = await storageService.uploadImage(file, 'shootai/body-photos');
  const { isValid, validation, attributes, source } =
    await bodyPhotoService.validateBodyPhoto(uploaded.url);

  if (!isValid) {
    const issues =
      validation.issues.length > 0
        ? validation.issues
        : [
            !validation.isFullBody &&
              'La foto debe mostrar el cuerpo completo (de la cabeza a los pies)',
            !validation.clearBackground && 'Usa un fondo claro y despejado',
            !validation.goodLighting && 'Mejora la iluminación de la foto',
          ].filter(Boolean);

    throw new AppError(
      `La foto no cumple los requisitos: ${issues.join('; ')}`,
      422
    );
  }

  const supabase = getDbClient(accessToken);
  const { data, error } = await supabase
    .from('app_user')
    .update({
      body_photo_url: uploaded.url,
      body_photo_public_id: uploaded.publicId,
      body_attributes: attributes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to save body photo');

  return {
    ...mapProfileToApi(data),
    validation,
    pipeline: { vision: source },
  };
};

module.exports = {
  getProfile,
  upsertProfile,
  ensureProfile,
  setBodyPhoto,
  mapProfileToApi,
};
