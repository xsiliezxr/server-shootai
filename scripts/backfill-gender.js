require('dotenv').config();

const { getCatalogSupabase } = require('../src/config/supabaseCatalog');
const { inferGenderFromText } = require('../src/utils/styleTaxonomy');

const BATCH_SIZE = 50;

const backfillGender = async () => {
  const supabase = getCatalogSupabase();

  const { data: garments, error } = await supabase
    .from('garment')
    .select('id, name, type, categories, aesthetic_tags, product_url, gender');

  if (error) {
    throw new Error(`Failed to load garments: ${error.message}`);
  }

  const counts = { man: 0, woman: 0, unisex: 0, kids: 0 };
  let updated = 0;

  for (let i = 0; i < garments.length; i += BATCH_SIZE) {
    const batch = garments.slice(i, i + BATCH_SIZE);

    for (const garment of batch) {
      const tags = [
        ...(garment.categories || []),
        ...(garment.aesthetic_tags || []),
        garment.product_url || '',
      ];
      const gender = inferGenderFromText(garment.name, garment.type, tags);
      counts[gender] = (counts[gender] || 0) + 1;

      if (garment.gender === gender) continue;

      const { error: updateError } = await supabase
        .from('garment')
        .update({ gender })
        .eq('id', garment.id);

      if (updateError) {
        console.warn(`Failed to update ${garment.id}: ${updateError.message}`);
        continue;
      }

      updated += 1;
    }
  }

  console.log(`Processed ${garments.length} garments`);
  console.log('Gender distribution:', counts);
  console.log(`Updated rows: ${updated}`);
};

backfillGender().catch((err) => {
  console.error(err);
  process.exit(1);
});
