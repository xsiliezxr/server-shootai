const llmService = require('./llm.service');

const MOCK_VALIDATION = {
  isFullBody: true,
  clearBackground: true,
  goodLighting: true,
  issues: [],
};

const MOCK_ATTRIBUTES = {
  bodyType: 'average',
  proportions: {
    height: 'average',
    shoulderWidth: 'average',
    torsoLength: 'balanced',
    legRatio: 'balanced',
  },
  skinTone: 'medium',
  recommendedColors: ['navy', 'white', 'beige', 'olive'],
  recommendedFits: ['regular', 'slim'],
};

const parseJsonResponse = (content) => {
  const trimmed = String(content || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid JSON from vision LLM');
  }
};

const analyzeBodyPhoto = async (imageUrl) => {
  const { apiKey } = llmService.getLlmConfig();

  if (!apiKey) {
    return {
      validation: MOCK_VALIDATION,
      attributes: MOCK_ATTRIBUTES,
      source: 'mock',
    };
  }

  const { parsed } = await llmService.chatCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are a fashion image analyst. Analyze full-body photos for outfit recommendations. Respond with valid JSON only.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this full-body photo. Return JSON:
{
  "validation": {
    "isFullBody": boolean (head to feet visible),
    "clearBackground": boolean (plain/uncluttered background),
    "goodLighting": boolean (well lit, not too dark/overexposed),
    "issues": string[] (empty if valid; e.g. "not full body", "busy background", "poor lighting")
  },
  "attributes": {
    "bodyType": string (slim|average|athletic|curvy|plus),
    "proportions": { "height": string, "shoulderWidth": string, "torsoLength": string, "legRatio": string },
    "skinTone": string (fair|light|medium|olive|tan|deep),
    "recommendedColors": string[] (3-6 colors that suit this person),
    "recommendedFits": string[] (e.g. slim, regular, relaxed, oversized)
  }
}`,
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'low' },
          },
        ],
      },
    ],
    temperature: 0.1,
  });

  const validation = {
    isFullBody: Boolean(parsed?.validation?.isFullBody),
    clearBackground: Boolean(parsed?.validation?.clearBackground),
    goodLighting: Boolean(parsed?.validation?.goodLighting),
    issues: Array.isArray(parsed?.validation?.issues)
      ? parsed.validation.issues.map(String)
      : [],
  };

  const attributes = {
    bodyType: parsed?.attributes?.bodyType || 'average',
    proportions: parsed?.attributes?.proportions || MOCK_ATTRIBUTES.proportions,
    skinTone: parsed?.attributes?.skinTone || 'medium',
    recommendedColors: Array.isArray(parsed?.attributes?.recommendedColors)
      ? parsed.attributes.recommendedColors.map(String)
      : MOCK_ATTRIBUTES.recommendedColors,
    recommendedFits: Array.isArray(parsed?.attributes?.recommendedFits)
      ? parsed.attributes.recommendedFits.map(String)
      : MOCK_ATTRIBUTES.recommendedFits,
  };

  return { validation, attributes, source: 'llm' };
};

const validateBodyPhoto = async (imageUrl) => {
  const { validation, attributes, source } = await analyzeBodyPhoto(imageUrl);

  const isValid =
    validation.isFullBody &&
    validation.clearBackground &&
    validation.goodLighting &&
    validation.issues.length === 0;

  return { isValid, validation, attributes, source };
};

module.exports = {
  analyzeBodyPhoto,
  validateBodyPhoto,
};
