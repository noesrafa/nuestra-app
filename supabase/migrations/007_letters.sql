-- Love letters between partners (directional: only recipient sees it)
CREATE TABLE nuestra_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES nuestra_couples(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  from_user UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- One letter per person per day
  UNIQUE(couple_id, date, from_user)
);

ALTER TABLE nuestra_letters ENABLE ROW LEVEL SECURITY;

-- Only couple members can see letters addressed to them (not their own)
CREATE POLICY "letters_select" ON nuestra_letters
  FOR SELECT USING (couple_id = my_couple_id());

CREATE POLICY "letters_insert" ON nuestra_letters
  FOR INSERT WITH CHECK (
    couple_id = my_couple_id()
    AND from_user = auth.uid()
  );

CREATE POLICY "letters_update" ON nuestra_letters
  FOR UPDATE USING (couple_id = my_couple_id());

CREATE POLICY "letters_delete" ON nuestra_letters
  FOR DELETE USING (
    couple_id = my_couple_id()
    AND from_user = auth.uid()
  );
