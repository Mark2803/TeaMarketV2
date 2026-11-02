CREATE TABLE IF NOT EXISTS yandex_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  operator_request_id varchar(80) NOT NULL UNIQUE,
  yandex_request_id varchar(150) UNIQUE,
  status varchar(32) NOT NULL DEFAULT 'creating',
  error_code varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yandex_shipments_status_check CHECK (status IN ('creating','submitted','uncertain','rejected'))
);
CREATE INDEX IF NOT EXISTS yandex_shipments_status_idx ON yandex_shipments(status);
