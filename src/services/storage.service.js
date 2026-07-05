const { cloudinary, isConfigured, configureCloudinary } = require('../config/cloudinary');
const { getSupabase, getSupabaseConfig } = require('../config/supabase');
const AppError = require('../utils/appError');

configureCloudinary();

const ensureConfigured = () => {
  if (!isConfigured()) {
    throw new AppError(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET',
      503
    );
  }
};

const sanitizeName = (name = 'image') =>
  String(name)
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 80) || 'image';

const uploadBuffer = (buffer, folder, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename ? sanitizeName(filename) : undefined,
        resource_type: 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(new AppError(`Cloudinary upload failed: ${error.message}`, 502));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          provider: 'cloudinary',
        });
      }
    );

    stream.end(buffer);
  });

const uploadToSupabaseStorage = async (file, folder = 'shootai') => {
  const supabase = getSupabase();
  const { url: supabaseUrl } = getSupabaseConfig();
  const safeFolder = String(folder).replace(/^\/+|\/+$/g, '');
  const objectPath = `${safeFolder}/${Date.now()}-${sanitizeName(file.originalname)}.jpg`;

  const { error } = await supabase.storage
    .from('shootai-assets')
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new AppError(`Supabase storage upload failed: ${error.message}`, 502);
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/shootai-assets/${objectPath}`;

  return {
    url: publicUrl,
    publicId: objectPath,
    provider: 'supabase',
  };
};

const toDataUrlFallback = (file, folder) => {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError(
      'Image upload failed and data URLs are disabled in production. Configure Cloudinary create permission or Supabase storage.',
      502
    );
  }

  const mime = file.mimetype || 'image/jpeg';
  const base64 = file.buffer.toString('base64');
  const baseName = sanitizeName(file.originalname || 'local');

  console.warn(
    'Cloudinary/Supabase upload unavailable; using data URL fallback for local dev only'
  );

  return {
    url: `data:${mime};base64,${base64}`,
    publicId: `${folder}/${baseName}`.replace(/\//g, ':'),
    provider: 'data-url',
  };
};

const uploadImage = async (file, folder = 'shootai') => {
  if (!file || !file.buffer) {
    throw new AppError('No image file provided', 400);
  }

  if (isConfigured()) {
    try {
      return await uploadBuffer(file.buffer, folder, file.originalname);
    } catch (err) {
      console.warn('Cloudinary upload failed, trying Supabase storage:', err.message);
    }
  }

  try {
    return await uploadToSupabaseStorage(file, folder);
  } catch (storageErr) {
    if (process.env.NODE_ENV === 'development') {
      return toDataUrlFallback(file, folder);
    }
    throw storageErr;
  }
};

const uploadImages = async (files, folder = 'shootai/creative-dump') => {
  if (!files || files.length === 0) {
    throw new AppError('At least one image is required', 400);
  }

  return Promise.all(files.map((file) => uploadImage(file, folder)));
};

module.exports = { uploadImage, uploadImages, isConfigured, uploadToSupabaseStorage };
