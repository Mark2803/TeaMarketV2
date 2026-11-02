CREATE TABLE IF NOT EXISTS order_packing_plans (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  plan_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
