-- Gender column for catalog filtering (man | woman | unisex | kids)
ALTER TABLE garment
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'unisex';

CREATE INDEX IF NOT EXISTS idx_garment_gender ON garment (gender);
