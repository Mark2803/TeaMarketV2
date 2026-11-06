CREATE TABLE IF NOT EXISTS storefront_messengers (
  channel VARCHAR(20) PRIMARY KEY CHECK (channel IN ('telegram', 'whatsapp', 'max')),
  contact VARCHAR(255) NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO storefront_messengers (channel, contact, is_enabled) VALUES
  ('telegram', 'https://t.me/TeaMasterTeam', TRUE),
  ('whatsapp', 'https://wa.me/79218855660', TRUE),
  ('max', '', TRUE)
ON CONFLICT (channel) DO NOTHING;
