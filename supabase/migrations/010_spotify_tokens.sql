-- Per-user Spotify tokens for song dedications
CREATE TABLE nuestra_spotify_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_spotify_tokens_updated_at
  BEFORE UPDATE ON nuestra_spotify_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE nuestra_spotify_tokens ENABLE ROW LEVEL SECURITY;

-- User can only access their own tokens
CREATE POLICY "Users can view own spotify tokens"
  ON nuestra_spotify_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spotify tokens"
  ON nuestra_spotify_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spotify tokens"
  ON nuestra_spotify_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spotify tokens"
  ON nuestra_spotify_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE nuestra_spotify_tokens;
