require('dotenv').config();
const axios = require('axios');

const EMPRESA_ID = '520d6f4f-7dec-4821-9b17-2f54e35772fd';
const BASE = process.env.API_BASE || 'http://localhost:3000/api';
const LIMIT = Number(process.env.SCRAPE_LIMIT) || 40;

const ZARA_CATEGORIES = [
  { label: 'tshirts', url: 'https://www.zara.com/mx/en/man-tshirts-l855.html' },
  { label: 'hoodies', url: 'https://www.zara.com/mx/en/man-hoodies-l842.html' },
  { label: 'trousers', url: 'https://www.zara.com/mx/en/man-trousers-l32.html' },
  { label: 'jeans', url: 'https://www.zara.com/mx/en/man-jeans-l659.html' },
  { label: 'shoes', url: 'https://www.zara.com/mx/en/man-shoes-l627.html' },
  { label: 'jackets', url: 'https://www.zara.com/mx/en/man-jackets-l682.html' },
  { label: 'shirts', url: 'https://www.zara.com/mx/en/man-shirts-l719.html' },
  { label: 'knitwear', url: 'https://www.zara.com/mx/en/man-knitwear-l730.html' },
  { label: 'shorts', url: 'https://www.zara.com/mx/en/man-shorts-l736.html' },
  { label: 'blazers', url: 'https://www.zara.com/mx/en/man-blazers-l650.html' },
];

const scrapeCategory = async ({ label, url }) => {
  console.log(`\n--- Scraping Zara ${label} ---`);
  console.log(url);

  const { data } = await axios.post(
    `${BASE}/catalog/scrape`,
    {
      empresaId: EMPRESA_ID,
      brand: 'Zara',
      url,
      limit: LIMIT,
    },
    { timeout: 600000 }
  );

  console.log(
    `OK: inserted ${data.data.inserted}/${data.data.scraped} | skipped=${data.data.skippedWithoutImage || 0} | source=${data.data.source}`
  );

  return data.data;
};

(async () => {
  const results = [];

  for (const cat of ZARA_CATEGORIES) {
    try {
      const result = await scrapeCategory(cat);
      results.push({ ...cat, ...result, ok: true });
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.error(`FAIL ${cat.label}: ${msg}`);
      results.push({ ...cat, ok: false, error: msg });
    }
  }

  console.log('\n=== RESUMEN ===');
  let total = 0;
  results.forEach((r) => {
    if (r.ok) {
      total += r.inserted || 0;
      console.log(`${r.label}: +${r.inserted} prendas (${r.source})`);
    } else {
      console.log(`${r.label}: ERROR - ${r.error}`);
    }
  });
  console.log(`\nTotal insertadas: ${total}`);
})();
