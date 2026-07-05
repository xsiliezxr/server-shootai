-- Color columns for color theory matching
ALTER TABLE garment
  ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS color_hsl REAL[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS color_palette TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_garment_color_hex ON garment (color_hex);
