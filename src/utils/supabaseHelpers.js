const AppError = require('./appError');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUuid = (id) => UUID_REGEX.test(String(id || ''));

const assertValidUuid = (id, label = 'id') => {
  if (!isValidUuid(id)) {
    throw new AppError(`Invalid ${label}`, 400);
  }
};

const normalizeTags = (tags = []) =>
  (Array.isArray(tags) ? tags : [])
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean);

const isPlaceholderImage = (url = '') =>
  !url ||
  url.includes('transparent-background') ||
  url.includes('placeholder') ||
  url.includes('logo_rss') ||
  /\.(html|svg)(?:\?|$)/i.test(url);

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|webp)(?:\?|$)/i;
const KNOWN_IMAGE_HOSTS = ['static.zara.net', 'res.cloudinary.com', 'picsum.photos'];

const isValidProductImage = (url = '') => {
  const normalized = String(url).trim();
  if (!normalized.startsWith('http') || isPlaceholderImage(normalized)) {
    return false;
  }

  if (IMAGE_EXT_REGEX.test(normalized)) {
    return true;
  }

  try {
    const { hostname } = new URL(normalized);
    return KNOWN_IMAGE_HOSTS.some((host) => hostname.includes(host));
  } catch {
    return false;
  }
};

const isValidProductUrl = (url = '') => /-p\d+\.html(?:\?|$)/i.test(String(url).trim());

const isListingUrl = (url = '') => /-l\d+\.html(?:\?|$)/i.test(String(url).trim());

const slugify = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const mapGarmentToApi = (g) => ({
  _id: g.id,
  id: g.id,
  empresaId: g.empresa_id,
  name: g.name,
  brand: g.brand || '',
  type: g.type,
  color: g.color || '',
  colorHex: g.color_hex || '',
  colorHsl: g.color_hsl || null,
  colorPalette: g.color_palette || [],
  silhouette: g.silhouette || '',
  categories: g.categories || [],
  aestheticTags: g.aesthetic_tags || [],
  imageUrl: g.image_url || '',
  productUrl: g.product_url || '',
  price: g.price,
  currency: g.currency || 'USD',
  source: g.source || 'manual',
  active: g.active !== false,
  gender: g.gender || 'unisex',
  createdAt: g.created_at,
});

const mapRecommendationToApi = (r) => ({
  garmentId: r.garment_id,
  name: r.name,
  brand: r.brand || '',
  type: r.type,
  color: r.color || '',
  silhouette: r.silhouette || '',
  imageUrl: r.image_url || '',
  productUrl: r.product_url || '',
  score: r.score || 0,
  matchedTags: r.matched_categories || [],
  matchedCategories: r.matched_categories || [],
  selected: r.selected || false,
});

const mapWhatsappEventToApi = (e) => ({
  _id: e.id,
  direction: e.direction,
  from: e.from,
  type: e.type,
  payload: e.payload || {},
  receivedAt: e.received_at,
});

const mapProjectToApi = (project, relations = {}) => {
  const images = (relations.images || []).map((img) => ({
    url: img.url,
    publicId: img.public_id,
    caption: img.caption || '',
  }));

  const documents = (relations.documents || []).map((doc) => ({
    filename: doc.filename,
    extractedText: doc.extracted_text || '',
  }));

  const recommendedGarments = (relations.recommendations || []).map(
    mapRecommendationToApi
  );

  const whatsappEvents = (relations.whatsappEvents || []).map(
    mapWhatsappEventToApi
  );

  const vision = project.vision_analysis || {};

  return {
    _id: project.id,
    id: project.id,
    empresaId: project.empresa_id,
    clienteId: project.cliente_id,
    userId: project.user_id || null,
    name: project.name,
    status: project.status,
    creativeDump: {
      images,
      documents,
      freeText: project.free_text || '',
      aestheticTags: project.aesthetic_tags || [],
      extractedCategories: project.extracted_categories || [],
    },
    recommendedGarments,
    visionAnalysis: {
      modelImage: vision.modelImage || { url: '', publicId: '' },
      proportions: vision.proportions || {},
      recommendation: vision.recommendation || {},
    },
    whatsappEvents,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
};

const mapEmpresaToApi = (e) => ({
  _id: e.id,
  id: e.id,
  name: e.name,
  slug: e.slug,
  website: e.website || '',
  createdAt: e.created_at,
});

const mapClienteToApi = (c) => ({
  _id: c.id,
  id: c.id,
  empresaId: c.empresa_id,
  name: c.name,
  phone: c.phone || '',
  email: c.email || '',
  createdAt: c.created_at,
});

const handleSupabaseError = (error, fallbackMessage = 'Database error') => {
  if (!error) return;

  if (error.code === 'PGRST116') {
    throw new AppError('Resource not found', 404);
  }

  throw new AppError(error.message || fallbackMessage, 500);
};

module.exports = {
  isValidUuid,
  assertValidUuid,
  normalizeTags,
  isPlaceholderImage,
  isValidProductImage,
  isValidProductUrl,
  isListingUrl,
  slugify,
  mapGarmentToApi,
  mapRecommendationToApi,
  mapProjectToApi,
  mapEmpresaToApi,
  mapClienteToApi,
  handleSupabaseError,
};
