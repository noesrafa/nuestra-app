-- Add hearts counter to entries
ALTER TABLE nuestra_entries ADD COLUMN hearts integer NOT NULL DEFAULT 0;
