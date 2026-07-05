const projectService = require('./project.service');
const storageService = require('./storage.service');
const visionService = require('./vision.service');
const AppError = require('../utils/appError');

const parseProportions = (proportionsRaw) => {
  if (!proportionsRaw) return {};

  if (typeof proportionsRaw === 'object') return proportionsRaw;

  try {
    return JSON.parse(proportionsRaw);
  } catch {
    throw new AppError('proportions must be a valid JSON object', 400);
  }
};

const processModelUpload = async ({ projectId, file, proportionsRaw }) => {
  const project = await projectService.findProjectById(projectId);
  const proportionsOverride = parseProportions(proportionsRaw);

  const uploaded = await storageService.uploadImage(file, 'shootai/vision-models');

  const curatedGarments = project.recommendedGarments || [];

  const visionResult = await visionService.processModelUpload({
    imageUrl: uploaded.url,
    proportionsOverride,
    garments: curatedGarments,
  });

  const visionAnalysis = {
    modelImage: {
      url: uploaded.url,
      publicId: uploaded.publicId,
    },
    proportions: visionResult.proportions,
    recommendation: {
      camera: visionResult.recommendation.camera,
      lens: visionResult.recommendation.lens,
      pose: visionResult.recommendation.pose,
      rationale: visionResult.recommendation.rationale,
    },
  };

  await projectService.updateProject(projectId, {
    visionAnalysis,
    status: 'ready',
  });

  return {
    projectId: project._id,
    visionAnalysis,
    pipeline: visionResult.pipeline,
    matchedRuleId: visionResult.recommendation.matchedRuleId,
    raw: visionResult.raw,
  };
};

module.exports = { processModelUpload };
