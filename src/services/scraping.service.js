const { FirecrawlAppV1: FirecrawlApp } = require('@mendable/firecrawl-js');
const catalogService = require('./catalog.service');
const llmService = require('./llm.service');
const colorService = require('./color.service');
const AppError = require('../utils/appError');
const { inferGenderFromListingUrl } = require('../utils/styleTaxonomy');
const {
  assertValidUuid,
  normalizeTags,
  isPlaceholderImage,
  isValidProductImage,
  isValidProductUrl,
  isListingUrl,
} = require('../utils/supabaseHelpers');

const MOCK_PRODUCTS = [
  {
    name: 'Oversized Graphic Hoodie',
    price: 890,
    currency: 'USD',
    imageUrl: 'https://example.com/hoodie.jpg',
    productUrl: 'https://example.com/product/hoodie',
  },
  {
    name: 'Baggy Cargo Pants',
    price: 148,
    currency: 'USD',
    imageUrl: 'https://example.com/cargo.jpg',
    productUrl: 'https://example.com/product/cargo',
  },
  {
    name: 'Minimal Wool Coat',
    price: 2450,
    currency: 'USD',
    imageUrl: 'https://example.com/coat.jpg',
    productUrl: 'https://example.com/product/coat',
  },
];

const PRODUCT_SCHEMA = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string' },
          imageUrl: { type: 'string' },
          productUrl: { type: 'string' },
        },
      },
    },
  },
};

const TYPE_KEYWORDS = [
  { type: 'outerwear', words: ['jacket', 'coat', 'puffer', 'blazer', 'parka', 'trench', 'overcoat'] },
  { type: 'top', words: ['shirt', 'tee', 't-shirt', 'hoodie', 'sweater', 'sweatshirt', 'top', 'polo', 'knit', 'jumper', 'cardigan'] },
  { type: 'bottom', words: ['pants', 'trousers', 'jeans', 'shorts', 'cargo', 'joggers', 'chino', 'skirt', 'leggings'] },
  { type: 'dress', words: ['dress', 'gown', 'jumpsuit'] },
  { type: 'footwear', words: ['shoes', 'sneakers', 'boots', 'loafers', 'sandals', 'trainers', 'heels'] },
  { type: 'accessory', words: ['bag', 'belt', 'hat', 'cap', 'scarf', 'sunglasses', 'wallet', 'gloves', 'beanie'] },
];

const CATEGORY_KEYWORDS = [
  { category: 'baggy', words: ['baggy', 'oversized', 'relaxed', 'wide', 'loose', 'fluid'] },
  { category: 'streetwear', words: ['graphic', 'hoodie', 'cargo', 'sneaker', 'skate', 'utility'] },
  { category: 'minimalist', words: ['minimal', 'clean', 'basic', 'plain', 'essential'] },
  { category: 'formal', words: ['blazer', 'tailored', 'suit', 'formal', 'dress shirt'] },
  { category: 'sportswear', words: ['technical', 'sport', 'active', 'running', 'jogger', 'water repellent'] },
  { category: 'vintage', words: ['vintage', 'retro', 'washed', 'faded', 'checkered'] },
  { category: 'luxury', words: ['wool', 'cashmere', 'silk', 'leather', 'suede', 'premium'] },
];

const heuristicClassify = (name = '') => {
  const lower = name.toLowerCase();

  let type = 'top';
  for (const rule of TYPE_KEYWORDS) {
    if (rule.words.some((w) => lower.includes(w))) {
      type = rule.type;
      break;
    }
  }

  const categories = new Set();
  const tags = new Set();

  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.words.some((w) => lower.includes(w))) {
      categories.add(rule.category);
    }
  }

  lower
    .split(/[\s,./-]+/)
    .filter((w) => w.length > 2)
    .slice(0, 5)
    .forEach((w) => tags.add(w));

  if (categories.size === 0) categories.add('casual');

  return {
    type,
    categories: Array.from(categories),
    aestheticTags: Array.from(tags),
  };
};

const isPlaceholderImageLocal = isPlaceholderImage;

const extractProductsFromMarkdown = (markdown = '', baseUrl = '') => {
  const products = [];
  const lines = markdown.split('\n');
  let current = null;

  const toAbsolute = (link) => {
    try {
      return link.startsWith('http') ? link : new URL(link, baseUrl).href;
    } catch {
      return link;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    const linkMatch = trimmed.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const priceMatch = trimmed.match(/\$?\s*[\d,]+(?:\.\d{2})?/);

    if (linkMatch && !imgMatch) {
      if (current?.name) products.push(current);
      current = {
        name: linkMatch[1].replace(/\*/g, '').trim(),
        productUrl: toAbsolute(linkMatch[2]),
        imageUrl: '',
        price: null,
        currency: 'USD',
      };
    }

    if (imgMatch && current && !current.imageUrl) {
      const src = toAbsolute(imgMatch[2]);
      if (!isPlaceholderImageLocal(src)) current.imageUrl = src;
    }

    if (priceMatch && current && current.price === null) {
      const numeric = priceMatch[0].replace(/[^0-9.]/g, '');
      current.price = Number(numeric) || null;
    }
  }

  if (current?.name) products.push(current);

  return products.filter((p) => p.name && p.productUrl);
};

const isRealProduct = (product = {}) => {
  const productUrl = String(product.productUrl || '').trim();
  if (!isValidProductUrl(productUrl) || isListingUrl(productUrl)) {
    return false;
  }

  const price = Number(product.price);
  if (!Number.isFinite(price) || price <= 0) {
    return false;
  }

  return true;
};

const dedupeProducts = (products = []) => {
  const seen = new Set();
  return products.filter((product) => {
    const key = String(product.productUrl || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const filterRealProducts = (products = []) =>
  dedupeProducts(products.filter(isRealProduct));

const normalizeImageUrl = (url = '') =>
  String(url).replace(/&amp;/g, '&').trim();

const extractImageFromScrapeResult = (result = {}) => {
  const meta = result.metadata || {};
  const og = normalizeImageUrl(meta['og:image'] || meta.ogImage || '');

  if (isValidProductImage(og)) {
    return og;
  }

  const md = result.markdown || '';
  const mdMatch = md.match(
    /!\[[^\]]*\]\((https:\/\/[^)]+\.(?:jpg|jpeg|webp|png)[^)]*)\)/i
  );

  if (mdMatch?.[1] && isValidProductImage(mdMatch[1])) {
    return normalizeImageUrl(mdMatch[1]);
  }

  return '';
};

const resolveProductImage = async (app, productUrl) => {
  if (!productUrl) return '';

  try {
    const result = await app.scrapeUrl(productUrl, {
      formats: ['markdown'],
      waitFor: 4000,
      actions: [{ type: 'wait', milliseconds: 2500 }],
    });

    return extractImageFromScrapeResult(result);
  } catch {
    return '';
  }
};

const enrichProductsWithImages = async (app, products, concurrency = 5) => {
  const queue = [...products];
  const enriched = [];

  const worker = async () => {
    while (queue.length > 0) {
      const product = queue.shift();
      if (!product) break;

      let imageUrl = normalizeImageUrl(product.imageUrl || '');

      if (!isValidProductImage(imageUrl) && product.productUrl) {
        imageUrl = await resolveProductImage(app, product.productUrl);
      }

      if (!isValidProductImage(imageUrl)) continue;

      const colorData = await colorService.extractColorData(imageUrl);

      enriched.push({
        ...product,
        imageUrl,
        color: colorData.color,
        colorHex: colorData.colorHex,
        colorHsl: colorData.colorHsl,
        colorPalette: colorData.colorPalette,
      });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, products.length || 1) }, worker)
  );

  return enriched;
};

const scrapeWithFirecrawl = async (url) => {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    return { products: MOCK_PRODUCTS, source: 'mock' };
  }

  const app = new FirecrawlApp({
    apiKey,
    ...(process.env.FIRECRAWL_API_URL
      ? { apiUrl: process.env.FIRECRAWL_API_URL }
      : {}),
  });

  const result = await app.scrapeUrl(url, {
    formats: ['json', 'markdown', 'html'],
    onlyMainContent: false,
    waitFor: 4000,
    actions: [
      { type: 'wait', milliseconds: 2000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1500 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1500 },
    ],
    jsonOptions: {
      prompt:
        'Extract the list of clothing/fashion products on this page. For each product return name, price (number only), currency, imageUrl (the real product photo URL, not a transparent placeholder), and productUrl (absolute URL).',
      schema: PRODUCT_SCHEMA,
    },
  });

  const json = result?.json || result?.data?.json;
  let products = json?.products || [];

  if (!products.length && result?.markdown) {
    products = extractProductsFromMarkdown(result.markdown, url);
  }

  products = products
    .filter((p) => p && p.name)
    .map((p) => ({
      name: String(p.name).trim(),
      price: typeof p.price === 'number' ? p.price : Number(p.price) || null,
      currency: p.currency || 'USD',
      imageUrl: isPlaceholderImageLocal(p.imageUrl) ? '' : normalizeImageUrl(p.imageUrl),
      productUrl: p.productUrl || url,
    }));

  products = filterRealProducts(products);
  const rawCount = products.length;
  products = await enrichProductsWithImages(app, products);

  return {
    products,
    source: 'firecrawl',
    skippedWithoutImage: rawCount - products.length,
  };
};

const classifyProduct = async ({ name, brand }) => {
  const heuristic = heuristicClassify(name);

  if (process.env.OPENAI_API_KEY) {
    try {
      const ai = await llmService.classifyGarmentWithOpenAI({
        name,
        brand,
        description: '',
      });

      if (ai.source === 'openai') {
        return {
          type: ai.type || heuristic.type,
          categories: normalizeTags([...ai.categories, ...heuristic.categories]),
          aestheticTags: normalizeTags([
            ...ai.aestheticTags,
            ...heuristic.aestheticTags,
          ]),
          classifier: 'openai',
        };
      }
    } catch {
      // fall through to heuristic
    }
  }

  return { ...heuristic, classifier: 'heuristic' };
};

const scrapeCatalog = async ({ empresaId, brand, url, limit = 20 }) => {
  if (!empresaId) {
    throw new AppError('empresaId is required', 400);
  }

  if (!url) {
    throw new AppError('url is required', 400);
  }

  assertValidUuid(empresaId, 'empresaId');

  const listingGender = inferGenderFromListingUrl(url) || 'unisex';

  const { products: scraped, source, skippedWithoutImage = 0 } =
    await scrapeWithFirecrawl(url);

  let products = scraped;

  if ((!products || products.length === 0) && source === 'mock') {
    products = MOCK_PRODUCTS;
  }

  products = (products || []).slice(0, Number(limit) || 20);

  if (products.length === 0) {
    throw new AppError(
      'No products with valid images extracted from URL. Try a category/listing page URL.',
      422
    );
  }

  let classifier = 'heuristic';
  const garments = [];

  for (const product of products) {
    const classification = await classifyProduct({
      name: product.name,
      brand: brand || '',
    });
    classifier = classification.classifier;

    garments.push({
      empresaId,
      name: product.name,
      brand: brand || '',
      type: classification.type || 'top',
      gender: listingGender,
      categories: classification.categories,
      aestheticTags: classification.aestheticTags,
      imageUrl: product.imageUrl || '',
      productUrl: product.productUrl || url,
      price: product.price,
      currency: product.currency || 'USD',
      color: product.color || '',
      colorHex: product.colorHex || '',
      colorHsl: product.colorHsl || null,
      colorPalette: product.colorPalette || [],
      source: source === 'mock' ? 'manual' : 'firecrawl',
    });
  }

  const inserted = await catalogService.addGarments(garments, empresaId);

  return {
    empresaId,
    brand: brand || '',
    url,
    scraped: products.length,
    inserted: inserted.length,
    skippedWithoutImage,
    source,
    classifier,
    garments: inserted,
  };
};

module.exports = {
  scrapeCatalog,
  scrapeWithFirecrawl,
  extractProductsFromMarkdown,
  heuristicClassify,
  isRealProduct,
  filterRealProducts,
};
