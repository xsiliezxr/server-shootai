const scrapingService = require('../services/scraping.service');
const AppError = require('../utils/appError');

const scrapeCatalog = async (req, res) => {
  const { empresaId, brand, url, limit } = req.body;

  if (!empresaId) {
    throw new AppError('empresaId is required', 400);
  }

  if (!url) {
    throw new AppError('url is required', 400);
  }

  const result = await scrapingService.scrapeCatalog({
    empresaId,
    brand,
    url,
    limit,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
};

module.exports = { scrapeCatalog };
