-- Catálogo de prendas (proyecto Supabase separado: shootai-catalog)
CREATE TABLE IF NOT EXISTS garment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  type TEXT NOT NULL,
  color TEXT DEFAULT '',
  color_hex TEXT DEFAULT '',
  color_hsl REAL[] DEFAULT NULL,
  color_palette TEXT[] DEFAULT '{}',
  silhouette TEXT DEFAULT '',
  categories TEXT[] DEFAULT '{}',
  aesthetic_tags TEXT[] DEFAULT '{}',
  image_url TEXT NOT NULL,
  product_url TEXT DEFAULT '',
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  source TEXT DEFAULT 'manual',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garment_empresa_id ON garment (empresa_id);
CREATE INDEX IF NOT EXISTS idx_garment_active ON garment (active);
CREATE INDEX IF NOT EXISTS idx_garment_type ON garment (type);
CREATE INDEX IF NOT EXISTS idx_garment_aesthetic_tags ON garment USING GIN (aesthetic_tags);
CREATE INDEX IF NOT EXISTS idx_garment_categories ON garment USING GIN (categories);

ALTER TABLE garment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access" ON garment
  FOR ALL
  USING (true)
  WITH CHECK (true);
