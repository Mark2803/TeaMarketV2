-- Shipping box definitions. Dimensions are INTERNAL (usable) centimetres.
CREATE TABLE IF NOT EXISTS shipping_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL UNIQUE,
  inner_length_cm numeric(8,2) NOT NULL CHECK (inner_length_cm > 0),
  inner_width_cm numeric(8,2) NOT NULL CHECK (inner_width_cm > 0),
  inner_height_cm numeric(8,2) NOT NULL CHECK (inner_height_cm > 0),
  tare_weight_g numeric(10,3) CHECK (tare_weight_g > 0),
  max_content_weight_g numeric(10,3) CHECK (max_content_weight_g > 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipping_packages_active_sort_idx ON shipping_packages (is_active, sort_order);
-- No guessed weight/capacity values: fill after weighing actual boxes.
INSERT INTO shipping_packages (code, inner_length_cm, inner_width_cm, inner_height_cm, sort_order)
VALUES ('S', 15, 10, 8, 10), ('M', 25, 18, 12, 20), ('L', 35, 25, 18, 30)
ON CONFLICT (code) DO NOTHING;
