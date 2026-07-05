const requirementsService = require('../services/requirements.service');
const projectService = require('../services/project.service');
const storageService = require('../services/storage.service');
const {
  generateMockShootPlan,
  parseProportions,
} = require('../services/shootPlan.service');
const AppError = require('../utils/appError');

const submitRequirements = async (req, res) => {
  const { clienteId, name, freeText } = req.body;
  const empresaId = req.body.empresaId || process.env.DEMO_EMPRESA_ID;

  const imageFiles = req.files?.images || [];
  const documentFiles = req.files?.documents || [];

  const result = await requirementsService.saveRequirements({
    empresaId,
    clienteId,
    name,
    freeText,
    imageFiles,
    documentFiles,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
};

const processRequirements = async (req, res) => {
  const { projectId } = req.params;
  const { limit, baseColor } = req.body;

  const result = await requirementsService.processRequirements({
    projectId,
    limit: limit ? Number(limit) : 8,
    baseColor,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

const generateShootPlan = async (req, res) => {
  const { projectId } = req.params;
  const { proportions: proportionsRaw } = req.body;

  const project = await projectService.findProjectById(projectId);
  const proportionsOverride = parseProportions(proportionsRaw);

  let modelImageUrl = project.visionAnalysis?.modelImage?.url || '';

  if (req.file) {
    const uploaded = await storageService.uploadImage(
      req.file,
      'shootai/shoot-plan'
    );
    modelImageUrl = uploaded.url;
  }

  const shootPlan = generateMockShootPlan({
    projectId,
    proportions: proportionsOverride,
    recommendedGarments: project.recommendedGarments || [],
    modelImageUrl,
  });

  await requirementsService.persistShootPlan(projectId, shootPlan);

  res.status(200).json({
    success: true,
    data: shootPlan,
  });
};

module.exports = {
  submitRequirements,
  processRequirements,
  generateShootPlan,
};
