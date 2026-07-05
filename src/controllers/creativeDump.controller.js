const creativeDumpService = require('../services/creativeDump.service');
const AppError = require('../utils/appError');

const ingestCreativeDump = async (req, res) => {
  const { projectId, freeText } = req.body;

  if (!projectId) {
    throw new AppError('projectId is required', 400);
  }

  const result = await creativeDumpService.processCreativeDump({
    projectId,
    files: req.files?.images || [],
    documentFiles: req.files?.documents || [],
    freeText,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
};

module.exports = { ingestCreativeDump };
