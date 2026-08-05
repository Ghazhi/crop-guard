ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS program_id    uuid REFERENCES programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cooperative_id uuid REFERENCES cooperatives(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ts_program     ON training_sessions(program_id)     WHERE program_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ts_cooperative ON training_sessions(cooperative_id) WHERE cooperative_id IS NOT NULL;
