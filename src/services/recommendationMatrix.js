const RECOMMENDATION_RULES = [
  {
    id: 'tall-broad-shoulders',
    match: (p) => p.height === 'tall' && p.shoulderWidth === 'broad',
    recommendation: {
      camera: 'Full-frame DSLR',
      lens: '85mm f/1.4',
      pose: 'Three-quarter angle, weight on back leg',
      rationale: 'Tall frame with broad shoulders benefits from compression and slight angle to soften shoulder line.',
    },
  },
  {
    id: 'tall-narrow-shoulders',
    match: (p) => p.height === 'tall' && p.shoulderWidth === 'narrow',
    recommendation: {
      camera: 'Mirrorless APS-C',
      lens: '50mm f/1.8',
      pose: 'Front-facing power stance',
      rationale: '50mm adds presence to narrow shoulders while maintaining natural proportions on tall subjects.',
    },
  },
  {
    id: 'average-balanced',
    match: (p) => p.height === 'average' && p.torsoLength === 'balanced',
    recommendation: {
      camera: 'Mirrorless Full-frame',
      lens: '35mm f/1.4',
      pose: 'Relaxed editorial walk',
      rationale: 'Balanced proportions work well with environmental framing and natural movement.',
    },
  },
  {
    id: 'petite-long-legs',
    match: (p) => p.height === 'petite' && p.legRatio === 'long',
    recommendation: {
      camera: 'Mirrorless APS-C',
      lens: '24mm f/2.8',
      pose: 'Low-angle stride shot',
      rationale: 'Wide lens from slightly low angle emphasizes leg line on petite subjects with long leg ratio.',
    },
  },
  {
    id: 'petite-default',
    match: (p) => p.height === 'petite',
    recommendation: {
      camera: 'Mirrorless APS-C',
      lens: '50mm f/1.8',
      pose: 'Seated or mid-step editorial',
      rationale: '50mm avoids distortion while keeping subject proportionally balanced.',
    },
  },
  {
    id: 'flowing-garment',
    match: (p, garments = []) =>
      garments.some((g) => g.silhouette === 'flowing' || g.type === 'dress'),
    recommendation: {
      camera: 'Full-frame Mirrorless',
      lens: '70-200mm f/2.8',
      pose: 'Dynamic spin or fabric-in-motion capture',
      rationale: 'Telephoto compression highlights flowing garments and isolates movement.',
    },
  },
  {
    id: 'tailored-garment',
    match: (p, garments = []) =>
      garments.some((g) => g.silhouette === 'tailored' || g.type === 'outerwear'),
    recommendation: {
      camera: 'Medium Format Digital',
      lens: '80mm f/2',
      pose: 'Strong shoulder-forward editorial pose',
      rationale: 'Medium format detail rendering enhances structured tailoring and shoulder architecture.',
    },
  },
];

const DEFAULT_RECOMMENDATION = {
  camera: 'Mirrorless Full-frame',
  lens: '50mm f/1.8',
  pose: 'Classic editorial standing pose',
  rationale: 'Default balanced setup when no specific proportion/garment rule matches.',
};

const getRecommendation = (proportions = {}, garments = []) => {
  const normalized = {
    height: proportions.height || 'average',
    shoulderWidth: proportions.shoulderWidth || 'average',
    torsoLength: proportions.torsoLength || 'balanced',
    legRatio: proportions.legRatio || 'balanced',
  };

  const matchedRule = RECOMMENDATION_RULES.find((rule) =>
    rule.match(normalized, garments)
  );

  return {
    ...(matchedRule?.recommendation || DEFAULT_RECOMMENDATION),
    matchedRuleId: matchedRule?.id || 'default',
    proportions: normalized,
  };
};

module.exports = { getRecommendation, RECOMMENDATION_RULES };
