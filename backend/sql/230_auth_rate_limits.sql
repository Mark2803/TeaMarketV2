CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key varchar(64) PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_window_started_idx
  ON auth_rate_limits (window_started_at);
-- Optional maintenance: DELETE FROM auth_rate_limits WHERE window_started_at < now() - interval '2 days';
