-- ============================================
-- Spaces: pausa, eliminación con doble confirm
-- ============================================

-- 1. Tabla nuestra_spaces
CREATE TABLE nuestra_spaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id uuid REFERENCES nuestra_couples(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'pending_delete', 'deleted')),
  paused_at timestamptz,
  paused_by uuid REFERENCES profiles(id),
  delete_requested_at timestamptz,
  delete_requested_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Helper: my_space_status()
CREATE OR REPLACE FUNCTION my_space_status()
RETURNS text AS $$
  SELECT s.status FROM nuestra_spaces s
  WHERE s.couple_id = my_couple_id()
  ORDER BY s.created_at DESC LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Helper: my_couple_is_complete()
CREATE OR REPLACE FUNCTION my_couple_is_complete()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM nuestra_couples
    WHERE id = my_couple_id() AND user_b IS NOT NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 4. RLS para nuestra_spaces
ALTER TABLE nuestra_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spaces_select" ON nuestra_spaces FOR SELECT
  USING (couple_id = my_couple_id());

CREATE POLICY "spaces_update" ON nuestra_spaces FOR UPDATE
  USING (couple_id = my_couple_id());

-- No INSERT desde cliente — se crea en join_couple / handle_new_user

-- 5. Actualizar RLS de nuestra_entries
-- Borrar policies existentes de INSERT/UPDATE/DELETE que permiten modo solo
DROP POLICY IF EXISTS "entries_insert" ON nuestra_entries;
DROP POLICY IF EXISTS "entries_update" ON nuestra_entries;
DROP POLICY IF EXISTS "entries_delete" ON nuestra_entries;
DROP POLICY IF EXISTS "entries_insert_couple" ON nuestra_entries;
DROP POLICY IF EXISTS "entries_update_couple" ON nuestra_entries;
DROP POLICY IF EXISTS "entries_delete_couple" ON nuestra_entries;
DROP POLICY IF EXISTS "Couple members can insert entries" ON nuestra_entries;
DROP POLICY IF EXISTS "Couple members can update entries" ON nuestra_entries;
DROP POLICY IF EXISTS "Couple members can delete entries" ON nuestra_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON nuestra_entries;
DROP POLICY IF EXISTS "Users can update couple entries" ON nuestra_entries;
DROP POLICY IF EXISTS "Users can delete couple entries" ON nuestra_entries;

-- Nuevas policies: requieren pareja completa + space activo
CREATE POLICY "entries_insert_with_space" ON nuestra_entries FOR INSERT
  WITH CHECK (
    my_couple_is_complete()
    AND my_space_status() = 'active'
    AND couple_id = my_couple_id()
  );

CREATE POLICY "entries_update_with_space" ON nuestra_entries FOR UPDATE
  USING (
    couple_id = my_couple_id()
    AND my_space_status() = 'active'
  );

CREATE POLICY "entries_delete_with_space" ON nuestra_entries FOR DELETE
  USING (
    couple_id = my_couple_id()
    AND my_space_status() = 'active'
  );

-- 6. RPCs

-- pause_space: active → paused
CREATE OR REPLACE FUNCTION pause_space()
RETURNS void AS $$
DECLARE
  space_row record;
BEGIN
  SELECT * INTO space_row FROM nuestra_spaces
  WHERE couple_id = my_couple_id() AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay espacio activo';
  END IF;

  UPDATE nuestra_spaces SET
    status = 'paused',
    paused_at = now(),
    paused_by = auth.uid()
  WHERE id = space_row.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- unpause_space: paused → active (solo quien pausó)
CREATE OR REPLACE FUNCTION unpause_space()
RETURNS void AS $$
DECLARE
  space_row record;
BEGIN
  SELECT * INTO space_row FROM nuestra_spaces
  WHERE couple_id = my_couple_id() AND status = 'paused'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay espacio en pausa';
  END IF;

  IF space_row.paused_by != auth.uid() THEN
    RAISE EXCEPTION 'Solo quien pausó puede reactivar';
  END IF;

  UPDATE nuestra_spaces SET
    status = 'active',
    paused_at = NULL,
    paused_by = NULL
  WHERE id = space_row.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- request_delete_space: paused → pending_delete
CREATE OR REPLACE FUNCTION request_delete_space()
RETURNS void AS $$
DECLARE
  space_row record;
BEGIN
  SELECT * INTO space_row FROM nuestra_spaces
  WHERE couple_id = my_couple_id() AND status = 'paused'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El espacio debe estar en pausa para solicitar eliminación';
  END IF;

  UPDATE nuestra_spaces SET
    status = 'pending_delete',
    delete_requested_at = now(),
    delete_requested_by = auth.uid()
  WHERE id = space_row.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- confirm_delete_space: pending_delete → ejecuta borrado
-- Si confirma el otro usuario → inmediato
-- Si es el mismo que pidió → solo si pasaron 24h
CREATE OR REPLACE FUNCTION confirm_delete_space()
RETURNS void AS $$
DECLARE
  space_row record;
  my_couple record;
  other_user uuid;
BEGIN
  SELECT * INTO space_row FROM nuestra_spaces
  WHERE couple_id = my_couple_id() AND status = 'pending_delete'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay eliminación pendiente';
  END IF;

  -- Si es el mismo usuario que pidió, verificar 24h
  IF space_row.delete_requested_by = auth.uid() THEN
    IF space_row.delete_requested_at + interval '24 hours' > now() THEN
      RAISE EXCEPTION 'Debes esperar 24 horas o que tu pareja confirme';
    END IF;
  END IF;

  -- Ejecutar borrado
  SELECT * INTO my_couple FROM nuestra_couples WHERE id = space_row.couple_id;

  -- Determinar el otro usuario
  IF my_couple.user_a = auth.uid() THEN
    other_user := my_couple.user_b;
  ELSE
    other_user := my_couple.user_a;
  END IF;

  -- Borrar entries del couple
  DELETE FROM nuestra_entries WHERE couple_id = my_couple.id;

  -- Borrar space y couple vieja
  DELETE FROM nuestra_spaces WHERE id = space_row.id;
  DELETE FROM nuestra_couples WHERE id = my_couple.id;

  -- Crear couples nuevas para ambos usuarios
  INSERT INTO nuestra_couples (user_a) VALUES (auth.uid());
  IF other_user IS NOT NULL THEN
    INSERT INTO nuestra_couples (user_a) VALUES (other_user);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- cancel_delete_space: pending_delete → paused
CREATE OR REPLACE FUNCTION cancel_delete_space()
RETURNS void AS $$
DECLARE
  space_row record;
BEGIN
  SELECT * INTO space_row FROM nuestra_spaces
  WHERE couple_id = my_couple_id() AND status = 'pending_delete'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay eliminación pendiente';
  END IF;

  UPDATE nuestra_spaces SET
    status = 'paused',
    delete_requested_at = NULL,
    delete_requested_by = NULL
  WHERE id = space_row.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 7. Actualizar join_couple para crear space automáticamente
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

  -- Buscar la couple solo del usuario que se une
  SELECT id INTO my_solo_couple_id FROM nuestra_couples
  WHERE user_a = auth.uid() AND user_b IS NULL AND id != target_couple.id;

  -- Migrar entries del usuario a la couple destino
  UPDATE nuestra_entries SET couple_id = target_couple.id
  WHERE created_by = auth.uid()
    AND (couple_id = my_solo_couple_id OR couple_id IS NULL);

  -- Migrar entries huérfanas del user_a de la couple destino
  UPDATE nuestra_entries SET couple_id = target_couple.id
  WHERE created_by = target_couple.user_a AND couple_id IS NULL;

  -- Borrar la couple solo
  IF my_solo_couple_id IS NOT NULL THEN
    DELETE FROM nuestra_couples WHERE id = my_solo_couple_id;
  END IF;

  -- Vincular
  UPDATE nuestra_couples SET user_b = auth.uid()
  WHERE id = target_couple.id;

  -- Crear space activo para la pareja
  INSERT INTO nuestra_spaces (couple_id, status)
  VALUES (target_couple.id, 'active');

  RETURN target_couple.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 8. Eliminar unlink_couple
DROP FUNCTION IF EXISTS unlink_couple();

-- 9. Backfill: crear spaces para couples completas existentes
INSERT INTO nuestra_spaces (couple_id, status)
SELECT id, 'active' FROM nuestra_couples
WHERE user_b IS NOT NULL
  AND id NOT IN (SELECT couple_id FROM nuestra_spaces);

-- 10. Borrar entries huérfanas (modo solo, sin pareja completa)
DELETE FROM nuestra_entries
WHERE couple_id IS NULL
   OR couple_id IN (SELECT id FROM nuestra_couples WHERE user_b IS NULL);

-- 11. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE nuestra_spaces;

NOTIFY pgrst, 'reload schema';
