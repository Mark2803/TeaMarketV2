-- Existing packages without a measured tare weight cannot be used for delivery calculations.
UPDATE shipping_packages SET is_active = false, updated_at = now()
WHERE tare_weight_g IS NULL AND is_active = true;

-- A box may remain inactive without a weight until its actual weight is measured.
-- Activation requires a positive tare weight, including when changed outside the API.
ALTER TABLE shipping_packages
  ADD CONSTRAINT shipping_packages_active_requires_tare_weight
  CHECK (NOT is_active OR (tare_weight_g IS NOT NULL AND tare_weight_g > 0));
