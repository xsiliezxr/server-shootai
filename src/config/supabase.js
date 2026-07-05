const { createClient } = require('@supabase/supabase-js');

let supabase = null;

const getSupabase = () => {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set'
    );
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return supabase;
};

const checkSupabaseConnection = async () => {
  const client = getSupabase();
  const { error } = await client.from('empresa').select('id').limit(1);

  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }

  return true;
};

module.exports = { getSupabase, checkSupabaseConnection };
