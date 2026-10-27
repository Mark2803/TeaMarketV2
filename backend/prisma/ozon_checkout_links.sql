-- Apply only after a database backup and a reviewed staging deployment.
CREATE TABLE IF NOT EXISTS ozon_checkout_links (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  guest_token_hash text,
  provider_id text UNIQUE,
  checkout_url text,
  state text NOT NULL DEFAULT 'creating',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ozon_checkout_links_state_check CHECK (state IN ('creating','created')),
  CONSTRAINT ozon_checkout_links_status_check CHECK (status IN ('pending','paid','test_paid','canceled','refunded'))
);
