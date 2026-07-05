-- MVP demo: disable RLS on user-scoped tables (single mock user)
ALTER TABLE app_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_outfit DISABLE ROW LEVEL SECURITY;

-- Allow profile rows without Supabase Auth user (mock MVP)
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_id_fkey;
ALTER TABLE favorite_outfit DROP CONSTRAINT IF EXISTS favorite_outfit_user_id_fkey;

INSERT INTO app_user (id, email, display_name, gender)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'juan.perez@demo.shootai',
  'Juan Perez',
  'man'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  gender = EXCLUDED.gender,
  updated_at = now();
