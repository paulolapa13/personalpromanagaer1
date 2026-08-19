CREATE TABLE IF NOT EXISTS personal_pro_manager_state (
  user_id TEXT PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS personal_pro_manager_state_updated_at_idx
  ON personal_pro_manager_state (updated_at DESC);
