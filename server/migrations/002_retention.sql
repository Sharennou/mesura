ALTER TABLE profiles ADD COLUMN last_active TEXT;
UPDATE profiles SET last_active = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
