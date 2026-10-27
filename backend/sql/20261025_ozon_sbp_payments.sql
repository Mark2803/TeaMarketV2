-- Run once after backup; unique order_id makes creation fail-closed under concurrency.
CREATE TABLE IF NOT EXISTS ozon_sbp_payments (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  ext_id varchar(100) NOT NULL UNIQUE,
  payment_id varchar(255) UNIQUE,
  sbp_payload text,
  amount_kopecks bigint NOT NULL CHECK (amount_kopecks > 0),
  state varchar(32) NOT NULL DEFAULT 'creating',
  status varchar(32) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Persist guest ownership without storing the bearer token in plaintext.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sbp_guest_token_hash varchar(64);
CREATE INDEX IF NOT EXISTS orders_sbp_guest_token_hash_idx ON orders (sbp_guest_token_hash) WHERE sbp_guest_token_hash IS NOT NULL;
