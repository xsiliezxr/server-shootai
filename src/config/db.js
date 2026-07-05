const { checkSupabaseConnection } = require('./supabase');
const { checkCatalogSupabaseConnection } = require('./supabaseCatalog');

const connectDB = async () => {
  try {
    await checkSupabaseConnection();
    console.log('Supabase connected successfully');
  } catch (error) {
    console.error(`Supabase connection warning: ${error.message}`);
  }

  try {
    await checkCatalogSupabaseConnection();
    console.log('Catalog Supabase connected successfully');
  } catch (error) {
    console.error(`Catalog Supabase connection warning: ${error.message}`);
  }
};

module.exports = connectDB;
