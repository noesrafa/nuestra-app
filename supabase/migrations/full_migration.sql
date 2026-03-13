-- ============================================
-- FULL MIGRATION - Nuestra App
-- Ejecutar en el nuevo Supabase (db.soyrafa.dev)
-- ============================================

-- 1. Profiles: extiende auth.users (compartido entre apps)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-crear profile al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Couples: vincula dos usuarios como pareja
CREATE TABLE nuestra_couples (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_b uuid REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code text UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE nuestra_couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read their couple"
  ON nuestra_couples FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Authenticated users can create a couple"
  ON nuestra_couples FOR INSERT
  WITH CHECK (auth.uid() = user_a);

CREATE POLICY "Couple members can update their couple"
  ON nuestra_couples FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Helper: obtener el couple_id del usuario actual
CREATE OR REPLACE FUNCTION my_couple_id()
RETURNS uuid AS $$
  SELECT id FROM nuestra_couples
  WHERE user_a = auth.uid() OR user_b = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Entries: diario de salidas con foto y fecha
CREATE TABLE nuestra_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id uuid REFERENCES nuestra_couples(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  notes text,
  photo_url text,
  mood text CHECK (mood IN ('amazing', 'good', 'okay', 'tough')),
  created_by uuid REFERENCES profiles(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE nuestra_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their entries"
  ON nuestra_entries FOR SELECT
  USING (couple_id = my_couple_id() OR (couple_id IS NULL AND created_by = auth.uid()));

CREATE POLICY "Users can create entries"
  ON nuestra_entries FOR INSERT
  WITH CHECK (
    (couple_id IS NULL AND created_by = auth.uid())
    OR couple_id = my_couple_id()
  );

CREATE POLICY "Users can update their entries"
  ON nuestra_entries FOR UPDATE
  USING (couple_id = my_couple_id() OR (couple_id IS NULL AND created_by = auth.uid()));

CREATE POLICY "Users can delete their entries"
  ON nuestra_entries FOR DELETE
  USING (couple_id = my_couple_id() OR (couple_id IS NULL AND created_by = auth.uid()));

CREATE INDEX idx_entries_couple_date ON nuestra_entries(couple_id, date DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON nuestra_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Storage bucket para fotos (público para poder mostrar las fotos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('nuestra-photos', 'nuestra-photos', true);

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nuestra-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nuestra-photos');

CREATE POLICY "Authenticated users can update photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'nuestra-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'nuestra-photos' AND auth.role() = 'authenticated');

-- 5. Join couple function + realtime
CREATE OR REPLACE FUNCTION join_couple(code text)
RETURNS uuid AS $$
DECLARE
  couple_record record;
BEGIN
  IF my_couple_id() IS NOT NULL THEN
    RAISE EXCEPTION 'Ya perteneces a una pareja';
  END IF;

  SELECT * INTO couple_record FROM nuestra_couples
  WHERE invite_code = code AND user_b IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código inválido o pareja ya completa';
  END IF;

  IF couple_record.user_a = auth.uid() THEN
    RAISE EXCEPTION 'No puedes unirte a tu propia pareja';
  END IF;

  UPDATE nuestra_couples SET user_b = auth.uid()
  WHERE id = couple_record.id;

  UPDATE nuestra_entries SET couple_id = couple_record.id
  WHERE couple_id IS NULL AND created_by IN (couple_record.user_a, auth.uid());

  RETURN couple_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER PUBLICATION supabase_realtime ADD TABLE nuestra_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE nuestra_couples;

-- 6. Permisos para PostgREST (CRÍTICO - sin esto la API no funciona)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
