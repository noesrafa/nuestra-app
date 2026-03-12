-- Allow entries without a couple (solo mode)
ALTER TABLE nuestra_entries ALTER COLUMN couple_id DROP NOT NULL;

-- Update RLS policies for solo users
DROP POLICY IF EXISTS "Couple members can read their entries" ON nuestra_entries;
CREATE POLICY "Users can read their entries"
  ON nuestra_entries FOR SELECT
  USING (couple_id = my_couple_id() OR (couple_id IS NULL AND created_by = auth.uid()));

DROP POLICY IF EXISTS "Couple members can create entries" ON nuestra_entries;
CREATE POLICY "Users can create entries"
  ON nuestra_entries FOR INSERT
  WITH CHECK (
    (couple_id IS NULL AND created_by = auth.uid())
    OR couple_id = my_couple_id()
  );

DROP POLICY IF EXISTS "Couple members can update their entries" ON nuestra_entries;
CREATE POLICY "Users can update their entries"
  ON nuestra_entries FOR UPDATE
  USING (couple_id = my_couple_id() OR (couple_id IS NULL AND created_by = auth.uid()));

DROP POLICY IF EXISTS "Couple members can delete their entries" ON nuestra_entries;
CREATE POLICY "Users can delete their entries"
  ON nuestra_entries FOR DELETE
  USING (couple_id = my_couple_id() OR (couple_id IS NULL AND created_by = auth.uid()));

-- Join couple by invite code + migrate solo entries
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

  -- Migrate solo entries from both users to this couple
  UPDATE nuestra_entries SET couple_id = couple_record.id
  WHERE couple_id IS NULL AND created_by IN (couple_record.user_a, auth.uid());

  RETURN couple_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE nuestra_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE nuestra_couples;
