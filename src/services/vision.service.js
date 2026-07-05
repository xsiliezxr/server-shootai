const axios = require('axios');
const { getRecommendation } = require('./recommendationMatrix');

const MOCK_PROPORTIONS = {
  height: 'average',
  shoulderWidth: 'average',
  torsoLength: 'balanced',
  legRatio: 'balanced',
};

const analyzeWithVisionCore = async (imageUrl) => {
  const visionCoreUrl = process.env.VISION_CORE_URL;

  if (visionCoreUrl) {
    const response = await axios.post(
      visionCoreUrl,
      { imageUrl },
      { timeout: 30000 }
    );

    return {
      proportions: response.data.proportions || response.data.bodyMetrics || {},
      source: 'vision-core',
      raw: response.data,
    };
  }

  return {
    proportions: MOCK_PROPORTIONS,
    source: 'mock',
    raw: {
      imageUrl,
      note: 'Mock Vision Core response — connect VISION_CORE_URL for YOLO/MediaPipe team integration',
    },
  };
};

const processModelUpload = async ({ imageUrl, proportionsOverride, garments = [] }) => {
  const coreAnalysis = await analyzeWithVisionCore(imageUrl);

  const proportions = {
    ...coreAnalysis.proportions,
    ...(proportionsOverride || {}),
  };

  const recommendation = getRecommendation(proportions, garments);

  return {
    modelImage: { url: imageUrl },
    proportions,
    recommendation,
    pipeline: {
      visionCore: coreAnalysis.source,
      recommendationEngine: 'static-matrix-v1',
    },
    raw: coreAnalysis.raw,
  };
};

module.exports = { processModelUpload, analyzeWithVisionCore };
