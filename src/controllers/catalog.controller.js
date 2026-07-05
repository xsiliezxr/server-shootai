const catalogService = require('../services/catalog.service');

const addGarments = async (req, res) => {
  const input = Array.isArray(req.body) ? req.body : req.body.garments || req.body;
  const empresaId = req.body.empresaId || req.query.empresaId;

  const created = await catalogService.addGarments(input, empresaId);

  res.status(201).json({
    success: true,
    data: {
      inserted: created.length,
      garments: created,
    },
  });
};

const listGarments = async (req, res) => {
  const { type, tag, limit, empresaId } = req.query;

  const garments = await catalogService.listGarments({ type, tag, limit, empresaId });

  res.status(200).json({
    success: true,
    data: garments,
  });
};

const colorMatch = async (req, res) => {
  const { empresaId, baseColor, limit, type } = req.body;

  const result = await catalogService.matchGarmentsByColor({
    empresaId,
    baseColor,
    limit,
    type,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = { addGarments, listGarments, colorMatch };
