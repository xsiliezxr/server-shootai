const axios = require('axios');
const getImageColors = require('get-image-colors');
const namer = require('color-namer');

const EMPTY_COLOR = {
  color: '',
  colorHex: '',
  colorHsl: null,
  colorPalette: [],
};

const hexToHsl = (hex) => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [
    Math.round(h * 360),
    Math.round(s * 100),
    Math.round(l * 100),
  ];
};

const nameFromHex = (hex) => {
  try {
    const names = namer(hex);
    return (
      names.ntc?.[0]?.name ||
      names.basic?.[0]?.name ||
      names.html?.[0]?.name ||
      hex
    );
  } catch {
    return hex;
  }
};

const extractColorData = async (imageUrl) => {
  if (!imageUrl) return { ...EMPTY_COLOR };

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'ShootAI/1.0' },
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    const colors = await getImageColors(Buffer.from(response.data), contentType);

    if (!colors || colors.length === 0) {
      return { ...EMPTY_COLOR };
    }

    const palette = colors
      .slice(0, 5)
      .map((c) => c.hex().toLowerCase());

    const dominant = palette[0];
    const colorHsl = hexToHsl(dominant);

    return {
      colorHex: dominant,
      colorPalette: palette,
      colorHsl,
      color: nameFromHex(dominant),
    };
  } catch (error) {
    console.warn('Color extraction failed:', imageUrl, error.message);
    return { ...EMPTY_COLOR };
  }
};

module.exports = { extractColorData, hexToHsl, nameFromHex };
