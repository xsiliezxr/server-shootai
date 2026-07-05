const { checkSupabaseConnection } = require('./supabase');
const { checkCatalogSupabaseConnection } = require('./supabaseCatalog');

const connectDB = async () => {
  await checkSupabaseConnection();
  await checkCatalogSupabaseConnection();
  console.log('Supabase connected successfully');
  console.log('Catalog Supabase connected successfully');
};

module.exports = connectDB;
