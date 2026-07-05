const catalogService = require('../services/catalog.service');
const AppError = require('../utils/appError');

const recommend = async (req, res) => {
  const { projectId, limit } = req.body;

  if (!projectId) {
    throw new AppError('projectId is required', 400);
  }

  const result = await catalogService.recommendForProject({ projectId, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = { recommend };
