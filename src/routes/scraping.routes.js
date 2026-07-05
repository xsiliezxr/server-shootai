const { Router } = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { scrapeCatalog } = require('../controllers/scraping.controller');

const router = Router();

router.post('/scrape', asyncHandler(scrapeCatalog));

module.exports = router;
