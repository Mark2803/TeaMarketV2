-- Outer dimensions must be measured; never assume wall thickness.
ALTER TABLE shipping_packages
 ADD COLUMN IF NOT EXISTS outer_length_cm numeric(8,2),
 ADD COLUMN IF NOT EXISTS outer_width_cm numeric(8,2),
 ADD COLUMN IF NOT EXISTS outer_height_cm numeric(8,2);
ALTER TABLE shipping_packages DROP CONSTRAINT IF EXISTS shipping_packages_outer_positive;
ALTER TABLE shipping_packages ADD CONSTRAINT shipping_packages_outer_positive CHECK (
 (outer_length_cm IS NULL AND outer_width_cm IS NULL AND outer_height_cm IS NULL) OR
 (outer_length_cm >= inner_length_cm AND outer_width_cm >= inner_width_cm AND outer_height_cm >= inner_height_cm)
);
