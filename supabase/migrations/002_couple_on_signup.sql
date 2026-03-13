-- ============================================
-- Crear couple automáticamente al signup
-- Ejecutar en db.soyrafa.dev SQL Editor
-- ============================================

-- 1. Actualizar handle_new_user para crear couple al signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO nuestra_couples (user_a)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 2. Actualizar join_couple para borrar la couple solo del que se une
CREATE OR REPLACE FUNCTION join_couple(code text)
RETURNS uuid AS $$
DECLARE
  target_couple record;
  my_solo_couple_id uuid;
BEGIN
  -- Buscar la couple destino
  SELECT * INTO target_couple FROM nuestra_couples
  WHERE invite_code = code AND user_b IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código inválido o pareja ya completa';
  END IF;

  IF target_couple.user_a = auth.uid() THEN
    RAISE EXCEPTION 'No puedes unirte a tu propia pareja';
  END IF;

  -- Verificar si ya está en una couple completa
  IF EXISTS (
    SELECT 1 FROM nuestra_couples
    WHERE (user_a = auth.uid() OR user_b = auth.uid()) AND user_b IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Ya perteneces a una pareja';
  END IF;

  -- Borrar la couple solo (sin pareja) del usuario que se une
  DELETE FROM nuestra_couples
  WHERE user_a = auth.uid() AND user_b IS NULL AND id != target_couple.id;

  -- Vincular
  UPDATE nuestra_couples SET user_b = auth.uid()
  WHERE id = target_couple.id;

  -- Migrar entries huérfanas de ambos usuarios
  UPDATE nuestra_entries SET couple_id = target_couple.id
  WHERE couple_id IS NULL AND created_by IN (target_couple.user_a, auth.uid());

  RETURN target_couple.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 3. Crear couples para usuarios existentes que no tengan una
INSERT INTO nuestra_couples (user_a)
SELECT p.id FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM nuestra_couples c
  WHERE c.user_a = p.id OR c.user_b = p.id
);

-- 4. Actualizar unlink_couple para recrear couples individuales
CREATE OR REPLACE FUNCTION unlink_couple()
RETURNS void AS $$
DECLARE
  my_couple record;
  other_user uuid;
BEGIN
  SELECT * INTO my_couple FROM nuestra_couples
  WHERE (user_a = auth.uid() OR user_b = auth.uid()) AND user_b IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes pareja vinculada';
  END IF;

  -- Determinar el otro usuario
  IF my_couple.user_a = auth.uid() THEN
    other_user := my_couple.user_b;
  ELSE
    other_user := my_couple.user_a;
  END IF;

  -- Desvincular: quitar user_b, dejar user_a como el que era user_a original
  UPDATE nuestra_couples SET user_b = NULL WHERE id = my_couple.id;

  -- Crear nueva couple para el otro usuario
  INSERT INTO nuestra_couples (user_a) VALUES (other_user);

  -- Reasignar entries: cada quien se queda con su couple
  -- El user_a original mantiene la couple existente
  -- El otro usuario necesita mover sus entries a su nueva couple
  UPDATE nuestra_entries SET couple_id = (
    SELECT id FROM nuestra_couples WHERE user_a = other_user AND user_b IS NULL
  )
  WHERE couple_id = my_couple.id AND created_by = other_user;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

NOTIFY pgrst, 'reload schema';
