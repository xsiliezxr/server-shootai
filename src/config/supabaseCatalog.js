const { createClient } = require('@supabase/supabase-js');

let catalogSupabase = null;

const getCatalogSupabase = () => {
  if (catalogSupabase) return catalogSupabase;

  const url = process.env.SUPABASE_CATALOG_URL;
  const key =
    process.env.SUPABASE_CATALOG_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_CATALOG_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_CATALOG_URL and SUPABASE_CATALOG_SERVICE_ROLE_KEY (or SUPABASE_CATALOG_ANON_KEY) must be set'
    );
  }

  catalogSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return catalogSupabase;
};

const checkCatalogSupabaseConnection = async () => {
  const client = getCatalogSupabase();
  const { error } = await client.from('garment').select('id').limit(1);

  if (error) {
    throw new Error(`Catalog Supabase connection failed: ${error.message}`);
  }

  return true;
};

module.exports = { getCatalogSupabase, checkCatalogSupabaseConnection };
