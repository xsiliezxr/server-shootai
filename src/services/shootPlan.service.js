const AppError = require('../utils/appError');

const SHOOT_MODEL_URL = process.env.SHOOT_MODEL_URL || '';

const MOCK_POSES = [
  {
    id: 'pose-three-quarter',
    name: 'Three-quarter angle',
    description: 'Weight on back leg, shoulders slightly turned to camera',
  },
  {
    id: 'pose-relaxed-standing',
    name: 'Relaxed standing',
    description: 'Arms crossed or hands in pockets, natural posture',
  },
  {
    id: 'pose-editorial-lean',
    name: 'Editorial lean',
    description: 'Slight lean against wall or prop, casual confidence',
  },
];

const MOCK_ANGLES = [
  { id: 'angle-eye-level', degrees: 0, label: 'Eye level — natural portrait' },
  { id: 'angle-slight-low', degrees: -10, label: 'Slight low angle — adds presence' },
  { id: 'angle-three-quarter', degrees: 35, label: 'Three-quarter body framing' },
];

const generateMockShootPlan = ({
  projectId,
  proportions = {},
  recommendedGarments = [],
  modelImageUrl = '',
}) => {
  const garmentHint =
    recommendedGarments.length > 0
      ? `Outfit includes ${recommendedGarments.slice(0, 3).map((g) => g.type).join(', ')} pieces`
      : 'No curated garments yet';

  return {
    projectId,
    source: SHOOT_MODEL_URL ? 'shoot-model-placeholder' : 'mock',
    modelEndpoint: SHOOT_MODEL_URL || null,
    note: SHOOT_MODEL_URL
      ? 'Connect SHOOT_MODEL_URL for real pose/angle inference'
      : 'Mock shoot plan — connect SHOOT_MODEL_URL for production',
    camera: 'Full-frame mirrorless',
    lens: '85mm f/1.4',
    lighting: 'Soft natural window light with fill reflector',
    proportions: proportions || {},
    modelImage: modelImageUrl ? { url: modelImageUrl } : null,
    poses: MOCK_POSES,
    angles: MOCK_ANGLES,
    recommendation: {
      pose: MOCK_POSES[0].name,
      angle: MOCK_ANGLES[0].label,
      camera: 'Full-frame mirrorless',
      lens: '85mm f/1.4',
      rationale: `${garmentHint}. Three-quarter framing softens proportions and highlights outfit details.`,
    },
    pipeline: {
      shootModel: SHOOT_MODEL_URL ? 'placeholder' : 'mock',
      recommendationEngine: 'static-shoot-plan-v1',
    },
  };
};

const parseProportions = (proportionsRaw) => {
  if (!proportionsRaw) return {};

  if (typeof proportionsRaw === 'object') return proportionsRaw;

  try {
    return JSON.parse(proportionsRaw);
  } catch {
    throw new AppError('proportions must be a valid JSON object', 400);
  }
};

module.exports = { generateMockShootPlan, parseProportions };
