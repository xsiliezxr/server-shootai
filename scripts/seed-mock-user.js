require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getSupabase } = require('../src/config/supabase');
const { MOCK_USER_ID } = require('../src/config/mockUser');
const storageService = require('../src/services/storage.service');
const bodyPhotoService = require('../src/services/bodyPhoto.service');
const { handleSupabaseError } = require('../src/utils/supabaseHelpers');

const IMAGE_PATH = path.join(__dirname, '..', 'test', 'imagen-yo.jpg');

const seedMockUser = async () => {
  if (!fs.existsSync(IMAGE_PATH)) {
    throw new Error(`Image not found: ${IMAGE_PATH}`);
  }

  const buffer = fs.readFileSync(IMAGE_PATH);
  const file = {
    buffer,
    originalname: 'imagen-yo.jpg',
    mimetype: 'image/jpeg',
  };

  console.log('Uploading body photo for mock user…');
  const uploaded = await storageService.uploadImage(file, 'shootai/body-photos');

  console.log('Analyzing body photo attributes…');
  const { validation, attributes } = await bodyPhotoService.validateBodyPhoto(
    uploaded.url
  );

  if (!validation?.isFullBody) {
    console.warn(
      'Body photo validation did not pass strict checks; seeding anyway for MVP demo.'
    );
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('app_user')
    .upsert(
      {
        id: MOCK_USER_ID,
        email: 'juan.perez@demo.shootai',
        display_name: 'Juan Perez',
        gender: 'man',
        body_photo_url: uploaded.url,
        body_photo_public_id: uploaded.publicId,
        body_attributes: attributes || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to seed mock user');

  console.log('Mock user seeded successfully:');
  console.log({
    id: data.id,
    displayName: data.display_name,
    gender: data.gender,
    bodyPhotoUrl: data.body_photo_url,
    attributes: data.body_attributes,
  });
};

seedMockUser().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
