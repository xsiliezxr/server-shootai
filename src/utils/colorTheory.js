const normalizeHue = (h) => ((h % 360) + 360) % 360;

const hueDistance = (a, b) => {
  const diff = Math.abs(normalizeHue(a) - normalizeHue(b));
  return Math.min(diff, 360 - diff);
};

const complementary = (h) => normalizeHue(h + 180);

const analogous = (h, spread = 30) => [
  normalizeHue(h - spread),
  normalizeHue(h + spread),
];

const triadic = (h) => [
  normalizeHue(h + 120),
  normalizeHue(h + 240),
];

const parseBaseColor = (input) => {
  if (!input) return null;

  if (typeof input === 'string') {
    const hex = input.trim();
    if (/^#[0-9a-f]{6}$/i.test(hex)) {
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
      return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }
    return null;
  }

  if (Array.isArray(input) && input.length >= 3) {
    return input.slice(0, 3).map(Number);
  }

  if (input.h !== undefined) {
    return [Number(input.h), Number(input.s ?? 0), Number(input.l ?? 0)];
  }

  return null;
};

const colorHarmonyScore = (hslA, hslB, tolerance = 25) => {
  if (!hslA || !hslB || hslA.length < 3 || hslB.length < 3) {
    return { score: 0, harmony: 'none' };
  }

  const [hA, sA, lA] = hslA;
  const [hB, sB, lB] = hslB;

  const compDist = hueDistance(hB, complementary(hA));
  const analogDist = Math.min(...analogous(hA).map((h) => hueDistance(hB, h)));
  const triadicDist = Math.min(...triadic(hA).map((h) => hueDistance(hB, h)));
  const monoDist = hueDistance(hA, hB);
  const lightnessDiff = Math.abs(lA - lB);

  if (sA < 10 && sB < 10 && lightnessDiff <= 15) {
    return { score: 0.95, harmony: 'monochrome' };
  }

  if (compDist <= tolerance) {
    return { score: 0.9 - compDist / 360, harmony: 'complementary' };
  }

  if (analogDist <= tolerance) {
    return { score: 0.85 - analogDist / 360, harmony: 'analogous' };
  }

  if (triadicDist <= tolerance) {
    return { score: 0.8 - triadicDist / 360, harmony: 'triadic' };
  }

  if (monoDist <= tolerance / 2 && lightnessDiff <= 20) {
    return { score: 0.75 - monoDist / 360, harmony: 'monochrome' };
  }

  const rawScore = 1 - monoDist / 180;
  return { score: Math.max(0, rawScore * 0.4), harmony: 'none' };
};

module.exports = {
  complementary,
  analogous,
  triadic,
  hueDistance,
  parseBaseColor,
  colorHarmonyScore,
};
