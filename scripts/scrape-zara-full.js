require('dotenv').config();
const axios = require('axios');
const catalogService = require('../src/services/catalog.service');

const EMPRESA_ID =
  process.env.DEMO_EMPRESA_ID || '520d6f4f-7dec-4821-9b17-2f54e35772fd';
const BASE = process.env.API_BASE || 'http://localhost:3000/api';
const LIMIT = Number(process.env.SCRAPE_LIMIT) || 200;
const CATEGORY_DELAY_MS = Number(process.env.SCRAPE_DELAY_MS) || 1500;
const REQUEST_TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS) || 900000;

// Zara Mexico (English) full catalog: MAN / WOMAN / KIDS main categories.
// URL format: https://www.zara.com/mx/en/<section>-<category>-lXXXX.html
const ZARA_CATEGORIES = [
  // ---------- MAN ----------
  { section: 'man', label: 'man-tshirts', url: 'https://www.zara.com/mx/en/man-tshirts-l855.html' },
  { section: 'man', label: 'man-hoodies', url: 'https://www.zara.com/mx/en/man-hoodies-l842.html' },
  { section: 'man', label: 'man-sweatshirts', url: 'https://www.zara.com/mx/en/man-sweatshirts-l821.html' },
  { section: 'man', label: 'man-shirts', url: 'https://www.zara.com/mx/en/man-shirts-l719.html' },
  { section: 'man', label: 'man-polos', url: 'https://www.zara.com/mx/en/man-polos-l733.html' },
  { section: 'man', label: 'man-knitwear', url: 'https://www.zara.com/mx/en/man-knitwear-l730.html' },
  { section: 'man', label: 'man-trousers', url: 'https://www.zara.com/mx/en/man-trousers-l32.html' },
  { section: 'man', label: 'man-jeans', url: 'https://www.zara.com/mx/en/man-jeans-l659.html' },
  { section: 'man', label: 'man-shorts', url: 'https://www.zara.com/mx/en/man-shorts-l736.html' },
  { section: 'man', label: 'man-jackets', url: 'https://www.zara.com/mx/en/man-jackets-l682.html' },
  { section: 'man', label: 'man-blazers', url: 'https://www.zara.com/mx/en/man-blazers-l650.html' },
  { section: 'man', label: 'man-coats', url: 'https://www.zara.com/mx/en/man-coats-l716.html' },
  { section: 'man', label: 'man-overshirts', url: 'https://www.zara.com/mx/en/man-overshirts-l3174.html' },
  { section: 'man', label: 'man-suits', url: 'https://www.zara.com/mx/en/man-suits-l808.html' },
  { section: 'man', label: 'man-shoes', url: 'https://www.zara.com/mx/en/man-shoes-l627.html' },
  { section: 'man', label: 'man-bags', url: 'https://www.zara.com/mx/en/man-bags-l1516.html' },
  { section: 'man', label: 'man-accessories', url: 'https://www.zara.com/mx/en/man-accessories-l537.html' },

  // ---------- WOMAN ----------
  { section: 'woman', label: 'woman-tshirts', url: 'https://www.zara.com/mx/en/woman-tshirts-l1362.html' },
  { section: 'woman', label: 'woman-tops', url: 'https://www.zara.com/mx/en/woman-tops-l1322.html' },
  { section: 'woman', label: 'woman-shirts', url: 'https://www.zara.com/mx/en/woman-shirts-l1217.html' },
  { section: 'woman', label: 'woman-dresses', url: 'https://www.zara.com/mx/en/woman-dresses-l1066.html' },
  { section: 'woman', label: 'woman-knitwear', url: 'https://www.zara.com/mx/en/woman-knitwear-l1152.html' },
  { section: 'woman', label: 'woman-sweatshirts', url: 'https://www.zara.com/mx/en/woman-sweatshirts-l1320.html' },
  { section: 'woman', label: 'woman-trousers', url: 'https://www.zara.com/mx/en/woman-trousers-l1073.html' },
  { section: 'woman', label: 'woman-jeans', url: 'https://www.zara.com/mx/en/woman-jeans-l1119.html' },
  { section: 'woman', label: 'woman-skirts', url: 'https://www.zara.com/mx/en/woman-skirts-l1299.html' },
  { section: 'woman', label: 'woman-shorts', url: 'https://www.zara.com/mx/en/woman-shorts-l1355.html' },
  { section: 'woman', label: 'woman-blazers', url: 'https://www.zara.com/mx/en/woman-blazers-l1055.html' },
  { section: 'woman', label: 'woman-jackets', url: 'https://www.zara.com/mx/en/woman-jackets-l1114.html' },
  { section: 'woman', label: 'woman-coats', url: 'https://www.zara.com/mx/en/woman-coats-l1204.html' },
  { section: 'woman', label: 'woman-shoes', url: 'https://www.zara.com/mx/en/woman-shoes-l1251.html' },
  { section: 'woman', label: 'woman-bags', url: 'https://www.zara.com/mx/en/woman-bags-l1024.html' },
  { section: 'woman', label: 'woman-accessories', url: 'https://www.zara.com/mx/en/woman-accessories-l1003.html' },

  // ---------- KIDS ----------
  { section: 'kids', label: 'kids-boy', url: 'https://www.zara.com/mx/en/kids-boy-l173.html' },
  { section: 'kids', label: 'kids-girl', url: 'https://www.zara.com/mx/en/kids-girl-l323.html' },
  { section: 'kids', label: 'kids-boy-outerwear', url: 'https://www.zara.com/mx/en/kids-boy-outerwear-padded-l235.html' },
];

// Optional: run only a subset of categories, e.g. SCRAPE_ONLY="kids-boy,woman-shirts"
const ONLY = (process.env.SCRAPE_ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const CATEGORIES = ONLY.length
  ? ZARA_CATEGORIES.filter((c) => ONLY.includes(c.label))
  : ZARA_CATEGORIES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const scrapeCategory = async ({ label, url }) => {
  console.log(`\n--- Scraping Zara ${label} ---`);
  console.log(url);

  const { data } = await axios.post(
    `${BASE}/catalog/scrape`,
    { empresaId: EMPRESA_ID, brand: 'Zara', url, limit: LIMIT },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  const d = data.data;
  console.log(
    `OK: inserted ${d.inserted}/${d.scraped} | skipped=${d.skippedWithoutImage || 0} | source=${d.source} | classifier=${d.classifier}`
  );

  return d;
};

(async () => {
  const startedAt = Date.now();
  let before = null;
  try {
    before = await catalogService.countGarments(EMPRESA_ID);
  } catch (e) {
    console.warn(`No se pudo leer el conteo inicial: ${e.message}`);
  }

  console.log(`\n=== SCRAPE ZARA FULL ===`);
  console.log(`empresaId: ${EMPRESA_ID}`);
  console.log(`categorias: ${CATEGORIES.length} | limit/categoria: ${LIMIT}`);
  if (ONLY.length) console.log(`filtro SCRAPE_ONLY: ${ONLY.join(', ')}`);
  console.log(`conteo inicial en catalogo: ${before ?? 'desconocido'}`);

  const results = [];

  for (const cat of CATEGORIES) {
    try {
      const result = await scrapeCategory(cat);
      results.push({ ...cat, ...result, ok: true });
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.error?.message || error.message;
      console.error(`FAIL ${cat.label}: [${status || 'ERR'}] ${msg}`);
      results.push({ ...cat, ok: false, status, error: msg });
    }
    await sleep(CATEGORY_DELAY_MS);
  }

  // ---------- RESUMEN ----------
  console.log('\n=========================================');
  console.log('============== RESUMEN FINAL =============');
  console.log('=========================================');

  const bySection = {};
  let totalInserted = 0;
  let totalScraped = 0;
  let totalSkipped = 0;
  const failed = [];

  for (const r of results) {
    bySection[r.section] = bySection[r.section] || { inserted: 0, categories: [] };
    if (r.ok) {
      totalInserted += r.inserted || 0;
      totalScraped += r.scraped || 0;
      totalSkipped += r.skippedWithoutImage || 0;
      bySection[r.section].inserted += r.inserted || 0;
      bySection[r.section].categories.push(
        `${r.label}: +${r.inserted} (skipped ${r.skippedWithoutImage || 0})`
      );
    } else {
      failed.push(r);
      bySection[r.section].categories.push(`${r.label}: ERROR [${r.status || 'ERR'}] ${r.error}`);
    }
  }

  for (const [section, info] of Object.entries(bySection)) {
    console.log(`\n[${section.toUpperCase()}] +${info.inserted} prendas`);
    info.categories.forEach((c) => console.log(`  - ${c}`));
  }

  console.log('\n-----------------------------------------');
  console.log(`Prendas insertadas (sumatoria batch): ${totalInserted}`);
  console.log(`Prendas scrapeadas (validas): ${totalScraped}`);
  console.log(`Saltadas sin imagen real: ${totalSkipped}`);
  console.log(`Categorias con error: ${failed.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  x ${f.label} [${f.status || 'ERR'}]: ${f.error}`));
  }

  let after = null;
  try {
    after = await catalogService.countGarments(EMPRESA_ID);
  } catch (e) {
    console.warn(`No se pudo leer el conteo final: ${e.message}`);
  }

  console.log('\n-----------------------------------------');
  console.log(`Conteo catalogo ANTES: ${before ?? 'desconocido'}`);
  console.log(`Conteo catalogo DESPUES: ${after ?? 'desconocido'}`);
  if (before != null && after != null) {
    console.log(`Delta real en catalogo: +${after - before}`);
  }
  console.log(`Duracion total: ${Math.round((Date.now() - startedAt) / 1000)}s`);

  process.exit(0);
})();
