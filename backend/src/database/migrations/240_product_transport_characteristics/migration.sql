-- Transport characteristics for each sellable product variant.
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS package_length_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS package_width_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS package_height_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS shipping_weight_g numeric(10,3);

DO $$ BEGIN
  ALTER TABLE product_variants ADD CONSTRAINT product_variants_package_length_positive CHECK (package_length_cm IS NULL OR package_length_cm > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE product_variants ADD CONSTRAINT product_variants_package_width_positive CHECK (package_width_cm IS NULL OR package_width_cm > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE product_variants ADD CONSTRAINT product_variants_package_height_positive CHECK (package_height_cm IS NULL OR package_height_cm > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE product_variants ADD CONSTRAINT product_variants_shipping_weight_positive CHECK (shipping_weight_g IS NULL OR shipping_weight_g > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TEST DATA for all existing variants. Replace with measured package values before production Yandex Delivery tariffs.
UPDATE product_variants
SET
  package_length_cm = CASE WHEN weight_g <= 50 THEN 14 WHEN weight_g <= 100 THEN 16 WHEN weight_g <= 250 THEN 20 ELSE 24 END,
  package_width_cm  = CASE WHEN weight_g <= 50 THEN 9  WHEN weight_g <= 100 THEN 11 WHEN weight_g <= 250 THEN 14 ELSE 18 END,
  package_height_cm = CASE WHEN weight_g <= 50 THEN 3  WHEN weight_g <= 100 THEN 4  WHEN weight_g <= 250 THEN 6  ELSE 8 END,
  shipping_weight_g = weight_g + CASE WHEN weight_g <= 50 THEN 12 WHEN weight_g <= 100 THEN 15 WHEN weight_g <= 250 THEN 25 ELSE 40 END
WHERE package_length_cm IS NULL
   OR package_width_cm IS NULL
   OR package_height_cm IS NULL
   OR shipping_weight_g IS NULL;
