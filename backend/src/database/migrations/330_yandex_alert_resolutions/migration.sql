CREATE TABLE IF NOT EXISTS yandex_alert_resolutions (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('test_order', 'manual_delivery')),
  resolved_at timestamptz NOT NULL DEFAULT now()
);
