const axios = require('axios');
const {
  CANONICAL_STYLES,
  canonicalizeStyles,
  inferGenderFromBrief,
  normalizeGender,
} = require('../utils/styleTaxonomy');

const MOCK_TAG_POOL = [
  'minimalist', 'editorial', 'streetwear', 'luxury', 'bohemian', 'monochrome',
  'vintage', 'avant-garde', 'natural-light', 'high-contrast', 'soft-pastel',
  'urban', 'baggy', 'cyberpunk', 'y2k',
];

const MOCK_CATEGORY_POOL = [
  'streetwear', 'minimalist', 'luxury', 'sportswear',
  'casual', 'formal', 'vintage', 'avant-garde', 'smart-casual', 'elegant',
];

const STOPWORDS = new Set([
  'busco', 'quiero', 'necesito', 'para', 'tipo', 'como', 'unos', 'unas',
  'este', 'esta', 'estos', 'estas', 'algo', 'muy', 'mas', 'pero', 'con',
  'los', 'las', 'del', 'que', 'una', 'uno', 'por', 'the', 'and', 'for',
  'with', 'this', 'that', 'some', 'want', 'need', 'look', 'style', 'estilo',
  'ropa', 'prenda', 'prendas', 'outfit',
]);

const getLlmConfig = () => {
  const codexKey = process.env.CODEX_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = codexKey || openaiKey;

  let apiUrl = process.env.CODEX_API_URL?.trim() || process.env.LLM_API_URL?.trim() || '';

  if (!apiUrl) {
    apiUrl = 'https://api.openai.com/v1/chat/completions';
  } else if (!apiUrl.includes('/chat/completions') && !apiUrl.includes('/responses')) {
    apiUrl = `${apiUrl.replace(/\/$/, '')}/chat/completions`;
  }

  const model =
    process.env.CODEX_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-4o-mini';

  const source = codexKey ? 'codex' : openaiKey ? 'openai' : null;

  return { apiKey, apiUrl, model, source };
};

const extractKeywords = (text = '') =>
  text
    .toLowerCase()
    .split(/[\s,.;:!?]+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

const buildMockResult = (freeText = '', imageCount = 0, documentText = '') => {
  const combined = `${freeText} ${documentText}`.trim();
  const keywords = extractKeywords(combined);
  const tags = new Set();
  const categories = new Set();

  keywords.slice(0, 4).forEach((word) => tags.add(word));

  if (combined.toLowerCase().includes('lux')) {
    tags.add('luxury');
    categories.add('luxury');
  }
  if (combined.toLowerCase().includes('street')) {
    tags.add('streetwear');
    categories.add('streetwear');
  }
  if (combined.toLowerCase().includes('minimal')) {
    tags.add('minimalist');
    categories.add('minimalist');
  }
  if (combined.toLowerCase().includes('baggy')) {
    tags.add('baggy');
    categories.add('baggy');
  }
  if (combined.toLowerCase().includes('sport') || combined.toLowerCase().includes('deport')) {
    tags.add('sportswear');
    categories.add('sportswear');
  }
  if (combined.toLowerCase().includes('casual')) {
    categories.add('casual');
  }
  if (combined.toLowerCase().includes('formal')) {
    categories.add('formal');
  }

  MOCK_TAG_POOL.slice(0, 3 + Math.min(imageCount, 3)).forEach((tag) => tags.add(tag));
  MOCK_CATEGORY_POOL.slice(0, 2 + Math.min(imageCount, 2)).forEach((cat) =>
    categories.add(cat)
  );

  const gender = inferGenderFromBrief(combined);

  return {
    categories: canonicalizeStyles(Array.from(categories)).slice(0, 6),
    aestheticTags: Array.from(tags).slice(0, 10),
    gender,
  };
};

const normalizeList = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);

const parseOpenAIJson = (content) => {
  const trimmed = String(content || '').trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('LLM response was not valid JSON');
  }
};

const extractTextFromResponse = (data) => {
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  const output = data?.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (item?.type === 'message' && Array.isArray(item.content)) {
        const textPart = item.content.find((c) => c.type === 'output_text' || c.type === 'text');
        if (textPart?.text) return textPart.text;
      }
    }
  }

  return null;
};

const chatCompletion = async ({ messages, temperature = 0.2, jsonMode = true }) => {
  const { apiKey, apiUrl, model, source } = getLlmConfig();

  if (!apiKey) {
    throw new Error('No LLM API key configured (CODEX_API_KEY or OPENAI_API_KEY)');
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (apiUrl.includes('/responses')) {
    const input = messages.map((m) => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }
      return { role: m.role, content: m.content };
    });

    const body = {
      model,
      input,
      temperature,
    };

    if (jsonMode) {
      body.text = { format: { type: 'json_object' } };
    }

    const response = await axios.post(apiUrl, body, { headers, timeout: 60000 });
    const content = extractTextFromResponse(response.data);

    if (!content) {
      throw new Error('Empty response from LLM responses API');
    }

    return { parsed: parseOpenAIJson(content), source: source || 'codex-responses' };
  }

  const body = {
    model,
    temperature,
    messages,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await axios.post(apiUrl, body, { headers, timeout: 60000 });
  const content = extractTextFromResponse(response.data);

  if (!content) {
    throw new Error('Empty response from LLM chat API');
  }

  return { parsed: parseOpenAIJson(content), source: source || 'openai' };
};

const extractWithLlm = async ({
  freeText = '',
  imageUrls = [],
  documentTexts = [],
}) => {
  const documentBlock =
    documentTexts.length > 0
      ? `\n\nDocument content:\n${documentTexts.join('\n---\n')}`
      : '';

  const userContent = [
    {
      type: 'text',
      text: `Analyze this fashion/style brief and extract style categories and aesthetic tags.

Free text brief:
${freeText || '(none)'}${documentBlock}

Return ONLY valid JSON with this exact shape:
{
  "categories": ["casual", "minimalist"],
  "aestheticTags": ["relaxed", "clean lines"],
  "gender": "man"
}

Rules:
- categories: ONLY from this fixed list: ${CANONICAL_STYLES.join(', ')}
- aestheticTags: finer visual/mood descriptors (not garment types like top/bottom/pants)
- gender: infer target audience from brief/images as "man", "woman", "unisex", or "kids"
- Do NOT confuse casual with streetwear unless the brief explicitly asks for streetwear/urban/edgy looks
- lowercase, no duplicates, max 10 items each
- infer from images when provided
- respond in the same language as the brief when tagging mood words`,
    },
  ];

  imageUrls.slice(0, 5).forEach((url) => {
    userContent.push({
      type: 'image_url',
      image_url: { url, detail: 'low' },
    });
  });

  const { parsed, source } = await chatCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are a fashion stylist AI. Extract style categories and aesthetic tags from briefs, images and documents. Always respond with valid JSON only.',
      },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
  });

  return {
    categories: canonicalizeStyles(parsed.categories),
    aestheticTags: normalizeList(parsed.aestheticTags || parsed.tags),
    gender: normalizeGender(parsed.gender || inferGenderFromBrief(freeText)),
    source,
    raw: parsed,
  };
};

const classifyGarmentWithOpenAI = async ({ name, brand, description = '' }) => {
  const mockFallback = () => {
    const mock = buildMockResult(`${name} ${brand} ${description}`);
    return {
      categories: mock.categories.slice(0, 3),
      aestheticTags: mock.aestheticTags.slice(0, 5),
      type: 'top',
      source: 'heuristic',
    };
  };

  const { apiKey } = getLlmConfig();
  if (!apiKey) {
    return mockFallback();
  }

  try {
    const { parsed, source } = await chatCompletion({
      messages: [
        {
          role: 'system',
          content:
            'Classify fashion products into categories and aesthetic tags. Respond with JSON only.',
        },
        {
          role: 'user',
          content: `Product: ${name}
Brand: ${brand || 'unknown'}
Description: ${description || 'none'}

Return JSON: { "categories": [], "aestheticTags": [], "type": "top|bottom|outerwear|dress|footwear|accessory" }`,
        },
      ],
      temperature: 0.1,
    });

    return {
      categories: normalizeList(parsed.categories),
      aestheticTags: normalizeList(parsed.aestheticTags),
      type: parsed.type || 'top',
      source,
    };
  } catch (error) {
    console.warn('LLM garment classification failed, using heuristic:', error.message);
    return mockFallback();
  }
};

const extractAestheticTags = async ({
  freeText = '',
  imageUrls = [],
  documentTexts = [],
}) => {
  const { apiKey } = getLlmConfig();

  if (apiKey) {
    try {
      return await extractWithLlm({ freeText, imageUrls, documentTexts });
    } catch (error) {
      console.warn('LLM extraction failed, falling back to mock:', error.message);
    }
  }

  const mock = buildMockResult(
    freeText,
    imageUrls.length,
    documentTexts.join(' ')
  );

  return {
    categories: mock.categories,
    aestheticTags: mock.aestheticTags,
    gender: mock.gender,
    source: 'mock',
    raw: {
      prompt: freeText,
      imageCount: imageUrls.length,
      documentCount: documentTexts.length,
      note: 'Set CODEX_API_KEY (preferred) or OPENAI_API_KEY for real extraction',
    },
  };
};

module.exports = {
  extractAestheticTags,
  classifyGarmentWithOpenAI,
  extractWithLlm,
  getLlmConfig,
  chatCompletion,
};
