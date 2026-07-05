const visionOrchestratorService = require('../services/visionOrchestrator.service');
const AppError = require('../utils/appError');

const uploadModel = async (req, res) => {
  const { projectId, proportions } = req.body;

  if (!projectId) {
    throw new AppError('projectId is required', 400);
  }

  if (!req.file) {
    throw new AppError('Model image is required', 400);
  }

  const result = await visionOrchestratorService.processModelUpload({
    projectId,
    file: req.file,
    proportionsRaw: proportions,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = { uploadModel };
