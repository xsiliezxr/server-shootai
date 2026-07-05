const { createClient } = require('@supabase/supabase-js');

let supabase = null;

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set'
    );
  }

  return { url, key, usesServiceRole: Boolean(serviceRoleKey) };
};

const getSupabase = () => {
  if (supabase) return supabase;

  const { url, key } = getSupabaseConfig();

  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return supabase;
};

const getUserSupabase = (accessToken) => {
  const { url, key, usesServiceRole } = getSupabaseConfig();

  if (!accessToken || usesServiceRole) {
    return getSupabase();
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const getDbClient = (accessToken) => getUserSupabase(accessToken);

const checkSupabaseConnection = async () => {
  const client = getSupabase();
  const { error } = await client.from('empresa').select('id').limit(1);

  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }

  return true;
};

module.exports = {
  getSupabase,
  getUserSupabase,
  getDbClient,
  checkSupabaseConnection,
};
