-- app_user profile table
CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text DEFAULT '',
  gender text DEFAULT 'unisex' CHECK (gender IN ('man', 'woman', 'unisex', 'kids')),
  body_photo_url text DEFAULT '',
  body_photo_public_id text DEFAULT '',
  body_attributes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- favorite outfits
CREATE TABLE IF NOT EXISTS favorite_outfit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES project(id) ON DELETE SET NULL,
  title text DEFAULT '',
  category text DEFAULT '',
  event text DEFAULT '',
  occasion text DEFAULT '',
  match_percentage int DEFAULT 0,
  garments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- associate projects with users
ALTER TABLE project ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_app_user_email ON app_user(email);
CREATE INDEX IF NOT EXISTS idx_favorite_outfit_user_id ON favorite_outfit(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_outfit_category ON favorite_outfit(category);
CREATE INDEX IF NOT EXISTS idx_favorite_outfit_event ON favorite_outfit(event);
CREATE INDEX IF NOT EXISTS idx_favorite_outfit_occasion ON favorite_outfit(occasion);
CREATE INDEX IF NOT EXISTS idx_project_user_id ON project(user_id);

-- RLS
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_outfit ENABLE ROW LEVEL SECURITY;

-- app_user policies
CREATE POLICY app_user_select_own ON app_user FOR SELECT USING (auth.uid() = id);
CREATE POLICY app_user_insert_own ON app_user FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY app_user_update_own ON app_user FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- favorite_outfit policies
CREATE POLICY favorite_outfit_select_own ON favorite_outfit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY favorite_outfit_insert_own ON favorite_outfit FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY favorite_outfit_update_own ON favorite_outfit FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY favorite_outfit_delete_own ON favorite_outfit FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger for app_user
CREATE OR REPLACE FUNCTION update_app_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_user_updated_at ON app_user;
CREATE TRIGGER trg_app_user_updated_at
  BEFORE UPDATE ON app_user
  FOR EACH ROW EXECUTE FUNCTION update_app_user_updated_at();
