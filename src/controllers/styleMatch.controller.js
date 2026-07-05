const styleMatchService = require('../services/styleMatch.service');
const AppError = require('../utils/appError');

const DEFAULT_DEMO_EMPRESA_ID = '520d6f4f-7dec-4821-9b17-2f54e35772fd';

const styleMatch = async (req, res) => {
  const { clienteId, name, freeText, limit } = req.body;
  const empresaId =
    req.body.empresaId || process.env.DEMO_EMPRESA_ID || DEFAULT_DEMO_EMPRESA_ID;

  if (!empresaId) {
    throw new AppError('empresaId is required (set DEMO_EMPRESA_ID)', 400);
  }

  const imageFiles = req.files?.images || [];
  const documentFiles = req.files?.documents || [];

  const result = await styleMatchService.processStyleMatch({
    empresaId,
    clienteId,
    name,
    freeText,
    imageFiles,
    documentFiles,
    limit: limit ? Number(limit) : 8,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
};

module.exports = { styleMatch };
