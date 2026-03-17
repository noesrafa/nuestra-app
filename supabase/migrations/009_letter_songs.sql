-- Add song dedication support to letters
ALTER TABLE nuestra_letters
  ALTER COLUMN body DROP NOT NULL,
  ADD COLUMN type TEXT NOT NULL DEFAULT 'letter' CHECK (type IN ('letter', 'song')),
  ADD COLUMN spotify_track_id TEXT,
  ADD COLUMN spotify_track_name TEXT,
  ADD COLUMN spotify_artist_name TEXT,
  ADD COLUMN spotify_artwork_url TEXT,
  ADD COLUMN spotify_preview_url TEXT,
  ADD COLUMN spotify_external_url TEXT;

ALTER TABLE nuestra_letters
  ADD CONSTRAINT letter_content_check CHECK (
    (type = 'letter' AND body IS NOT NULL) OR
    (type = 'song' AND spotify_track_id IS NOT NULL)
  );
