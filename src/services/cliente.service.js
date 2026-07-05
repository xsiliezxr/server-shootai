const { getSupabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const {
  assertValidUuid,
  mapClienteToApi,
  handleSupabaseError,
} = require('../utils/supabaseHelpers');
const empresaService = require('./empresa.service');

const createCliente = async ({ empresaId, name, phone, email }) => {
  if (!empresaId) {
    throw new AppError('empresaId is required', 400);
  }

  if (!name || !name.trim()) {
    throw new AppError('Cliente name is required', 400);
  }

  assertValidUuid(empresaId, 'empresaId');
  await empresaService.getEmpresaById(empresaId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('cliente')
    .insert({
      empresa_id: empresaId,
      name: name.trim(),
      phone: phone || '',
      email: email || '',
    })
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to create cliente');

  return mapClienteToApi(data);
};

const getClientes = async (empresaId) => {
  const supabase = getSupabase();
  let query = supabase.from('cliente').select('*').order('created_at', {
    ascending: false,
  });

  if (empresaId) {
    assertValidUuid(empresaId, 'empresaId');
    query = query.eq('empresa_id', empresaId);
  }

  const { data, error } = await query;
  handleSupabaseError(error);

  return (data || []).map(mapClienteToApi);
};

const getClienteById = async (id) => {
  assertValidUuid(id, 'clienteId');

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('cliente')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Cliente not found', 404);
  }

  return mapClienteToApi(data);
};

const updateCliente = async (id, updates) => {
  await getClienteById(id);

  const patch = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.email !== undefined) patch.email = updates.email;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('cliente')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  handleSupabaseError(error);

  return mapClienteToApi(data);
};

const deleteCliente = async (id) => {
  await getClienteById(id);

  const supabase = getSupabase();
  const { error } = await supabase.from('cliente').delete().eq('id', id);

  handleSupabaseError(error);

  return { id };
};

module.exports = {
  createCliente,
  getClientes,
  getClienteById,
  updateCliente,
  deleteCliente,
};
