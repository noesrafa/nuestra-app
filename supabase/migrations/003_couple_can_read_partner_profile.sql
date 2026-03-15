-- Allow users to read their partner's profile
CREATE POLICY "Users can read partner profile"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR id IN (
      SELECT CASE
        WHEN user_a = auth.uid() THEN user_b
        WHEN user_b = auth.uid() THEN user_a
      END
      FROM nuestra_couples
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

-- Drop the old restrictive policy
DROP POLICY "Users can read own profile" ON profiles;

NOTIFY pgrst, 'reload schema';
