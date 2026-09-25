ALTER TABLE "promotions"
  ADD COLUMN IF NOT EXISTS "audience_type" VARCHAR(32) NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS "customer_ids" JSONB,
  ADD COLUMN IF NOT EXISTS "activation_type" VARCHAR(32) NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS "promo_code_id" UUID,
  ADD COLUMN IF NOT EXISTS "is_stackable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "usage_limit" INTEGER,
  ADD COLUMN IF NOT EXISTS "per_customer_limit" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "loyalty_settings"
  ADD COLUMN IF NOT EXISTS "bonus_lifetime_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "min_spend_points" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "allow_with_promotions" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "allow_with_promo_codes" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "referral_partners" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "contact" TEXT,
  "code" VARCHAR(100) NOT NULL UNIQUE,
  "invitee_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "min_order_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "referral_partners_is_active_idx" ON "referral_partners"("is_active");

CREATE TABLE IF NOT EXISTS "referral_partner_orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "partner_id" UUID NOT NULL,
  "order_id" UUID NOT NULL UNIQUE,
  "order_total" DECIMAL(12,2) NOT NULL,
  "commission" DECIMAL(12,2) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'accrued',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "referral_partner_orders_partner_id_created_at_idx"
  ON "referral_partner_orders"("partner_id","created_at");
