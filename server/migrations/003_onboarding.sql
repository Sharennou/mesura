ALTER TABLE profiles ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_completed IN (0,1));
UPDATE profiles SET onboarding_completed = 1
WHERE height IS NOT NULL OR EXISTS (SELECT 1 FROM entries WHERE entries.user_id = profiles.user_id);
