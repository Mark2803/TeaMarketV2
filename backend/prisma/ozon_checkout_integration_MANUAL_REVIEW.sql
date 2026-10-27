-- REVIEW BEFORE APPLYING. This migration is NOT executed automatically.
-- The orders table already exists in the current backend schema.
CREATE TABLE IF NOT EXISTS ozon_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  external_order_id varchar(100) NOT NULL,
  ozon_order_id varchar(100),
  checkout_url text,
  payment_state varchar(32) NOT NULL DEFAULT 'pending',
  delivery_state varchar(32),
  test_mode boolean,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ozon_checkout_sessions_order_id_uq UNIQUE (order_id),
  CONSTRAINT ozon_checkout_sessions_ext_id_uq UNIQUE (external_order_id),
  CONSTRAINT ozon_checkout_sessions_ozon_id_uq UNIQUE (ozon_order_id),
  CONSTRAINT ozon_checkout_sessions_payment_state_chk CHECK (payment_state IN ('pending','authorized','paid','canceled','refunded','disputed'))
);
CREATE INDEX IF NOT EXISTS ozon_checkout_sessions_payment_state_idx ON ozon_checkout_sessions(payment_state);
