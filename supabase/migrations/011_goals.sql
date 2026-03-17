-- Goals feature: shared couple goals/bucket list
CREATE TABLE nuestra_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES nuestra_couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient querying by couple, filtering by completion, ordering by position
CREATE INDEX idx_nuestra_goals_couple_completed_position
  ON nuestra_goals (couple_id, completed, position);

ALTER TABLE nuestra_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can view their goals"
  ON nuestra_goals FOR SELECT
  USING (couple_id = my_couple_id());

CREATE POLICY "Couple members can insert goals"
  ON nuestra_goals FOR INSERT
  WITH CHECK (couple_id = my_couple_id());

CREATE POLICY "Couple members can update their goals"
  ON nuestra_goals FOR UPDATE
  USING (couple_id = my_couple_id());

CREATE POLICY "Couple members can delete their goals"
  ON nuestra_goals FOR DELETE
  USING (couple_id = my_couple_id());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE nuestra_goals;
