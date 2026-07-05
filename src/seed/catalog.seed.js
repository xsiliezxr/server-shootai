require('dotenv').config();

const connectDB = require('../config/db');
const { getSupabase } = require('../config/supabase');
const { getCatalogSupabase } = require('../config/supabaseCatalog');
const catalogService = require('../services/catalog.service');
const empresaService = require('../services/empresa.service');
const catalogData = require('./catalog.data');

const seedCatalog = async () => {
  try {
    await connectDB();
    const supabase = getSupabase();

    let empresa;

    const { data: existingEmpresas } = await supabase
      .from('empresa')
      .select('*')
      .eq('slug', 'shootai-demo')
      .limit(1);

    if (existingEmpresas?.length) {
      empresa = existingEmpresas[0];
      console.log(`Using existing demo empresa: ${empresa.name} (${empresa.id})`);

      await getCatalogSupabase().from('garment').delete().eq('empresa_id', empresa.id);
    } else {
      empresa = await empresaService.createEmpresa({
        name: 'ShootAI Demo',
        website: 'https://shootai.demo',
      });
      console.log(`Created demo empresa: ${empresa.name} (${empresa._id})`);
    }

    const garments = catalogData.map((g) => ({
      ...g,
      empresaId: empresa.id || empresa._id,
      source: 'manual',
    }));

    const inserted = await catalogService.addGarments(garments, empresa.id || empresa._id);
    console.log(`Seeded ${inserted.length} garments for empresa ${empresa.name}`);
    console.log(`Demo empresaId: ${empresa.id || empresa._id}`);
  } catch (error) {
    console.error('Catalog seed failed:', error.message);
    process.exitCode = 1;
  }
};

seedCatalog();
