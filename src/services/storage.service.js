const { cloudinary, isConfigured, configureCloudinary } = require('../config/cloudinary');
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

const uploadBuffer = (buffer, folder, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(new AppError(`Cloudinary upload failed: ${error.message}`, 502));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });

const toDataUrlFallback = (file, folder) => {
  const mime = file.mimetype || 'image/jpeg';
  const base64 = file.buffer.toString('base64');
  const baseName = (file.originalname || 'local').replace(/\.[^/.]+$/, '');

  console.warn(
    'Cloudinary upload unavailable (missing create permission or other error); using data URL fallback for local dev'
  );

  return {
    url: `data:${mime};base64,${base64}`,
    publicId: `${folder}/${baseName}`.replace(/\//g, ':'),
  };
};

const uploadImage = async (file, folder = 'shootai') => {
  ensureConfigured();

  if (!file || !file.buffer) {
    throw new AppError('No image file provided', 400);
  }

  try {
    return await uploadBuffer(file.buffer, folder, file.originalname);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      return toDataUrlFallback(file, folder);
    }
    throw err;
  }
};

const uploadImages = async (files, folder = 'shootai/creative-dump') => {
  ensureConfigured();

  if (!files || files.length === 0) {
    throw new AppError('At least one image is required', 400);
  }

  return Promise.all(files.map((file) => uploadImage(file, folder)));
};

module.exports = { uploadImage, uploadImages, isConfigured };
