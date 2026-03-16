-- Nicknames: each user gives their partner a cute nickname
-- nickname_a = nickname that user_a gave to user_b
-- nickname_b = nickname that user_b gave to user_a
ALTER TABLE nuestra_couples
  ADD COLUMN nickname_a TEXT,
  ADD COLUMN nickname_b TEXT;
