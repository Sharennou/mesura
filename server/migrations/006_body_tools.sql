-- Nullable metadata preserves every legacy value without assigning a protocol.
ALTER TABLE entries ADD COLUMN tools_json TEXT;
ALTER TABLE profiles ADD COLUMN tool_profile_json TEXT;
ALTER TABLE profiles ADD COLUMN height_date TEXT;
