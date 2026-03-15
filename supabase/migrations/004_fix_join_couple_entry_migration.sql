-- ============================================
-- Fix: migrar entries ANTES de borrar solo couple
-- Ejecutar en db.soyrafa.dev SQL Editor
-- ============================================

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

  -- Migrar TODAS las entries del usuario a la couple destino
  -- (tanto las de su solo couple como las huérfanas)
  UPDATE nuestra_entries SET couple_id = target_couple.id
  WHERE created_by = auth.uid()
    AND (couple_id = my_solo_couple_id OR couple_id IS NULL);

  -- Migrar entries huérfanas del user_a de la couple destino
  UPDATE nuestra_entries SET couple_id = target_couple.id
  WHERE created_by = target_couple.user_a AND couple_id IS NULL;

  -- AHORA sí borrar la couple solo (ya no tiene entries)
  IF my_solo_couple_id IS NOT NULL THEN
    DELETE FROM nuestra_couples WHERE id = my_solo_couple_id;
  END IF;

  -- Vincular
  UPDATE nuestra_couples SET user_b = auth.uid()
  WHERE id = target_couple.id;

  RETURN target_couple.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

NOTIFY pgrst, 'reload schema';
