-- Remove unused maximum contents weight from shipping box definitions.
ALTER TABLE shipping_packages DROP COLUMN IF EXISTS max_content_weight_g;
