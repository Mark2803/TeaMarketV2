-- Apply only after backup and review. Does not enable Ozon live requests.
CREATE TABLE IF NOT EXISTS ozon_payment_links (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  ozon_order_id varchar(255) NOT NULL UNIQUE,
  ext_id varchar(50) NOT NULL UNIQUE,
  state varchar(32) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ozon_payment_links_state_check CHECK (state IN ('pending','authorized','paid','canceled','refunded','disputed'))
);
CREATE INDEX IF NOT EXISTS ozon_payment_links_state_idx ON ozon_payment_links(state);
