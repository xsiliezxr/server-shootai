const { getSupabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const {
  assertValidUuid,
  slugify,
  mapEmpresaToApi,
  handleSupabaseError,
} = require('../utils/supabaseHelpers');

const createEmpresa = async ({ name, website }) => {
  if (!name || !name.trim()) {
    throw new AppError('Empresa name is required', 400);
  }

  const slug = slugify(name);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('empresa')
    .insert({
      name: name.trim(),
      slug,
      website: website || '',
    })
    .select('*')
    .single();

  if (error?.code === '23505') {
    throw new AppError('Empresa with this name already exists', 409);
  }

  handleSupabaseError(error, 'Failed to create empresa');

  return mapEmpresaToApi(data);
};

const getEmpresas = async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('empresa')
    .select('*')
    .order('created_at', { ascending: false });

  handleSupabaseError(error);

  return (data || []).map(mapEmpresaToApi);
};

const getEmpresaById = async (id) => {
  assertValidUuid(id, 'empresaId');

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('empresa')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Empresa not found', 404);
  }

  return mapEmpresaToApi(data);
};

const updateEmpresa = async (id, updates) => {
  await getEmpresaById(id);

  const patch = {};
  if (updates.name !== undefined) {
    patch.name = updates.name;
    patch.slug = slugify(updates.name);
  }
  if (updates.website !== undefined) patch.website = updates.website;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('empresa')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  handleSupabaseError(error);

  return mapEmpresaToApi(data);
};

const deleteEmpresa = async (id) => {
  await getEmpresaById(id);

  const supabase = getSupabase();
  const { error } = await supabase.from('empresa').delete().eq('id', id);

  handleSupabaseError(error);

  return { id };
};

module.exports = {
  createEmpresa,
  getEmpresas,
  getEmpresaById,
  updateEmpresa,
  deleteEmpresa,
};
