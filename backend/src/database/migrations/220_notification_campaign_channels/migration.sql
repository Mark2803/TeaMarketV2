ALTER TABLE "notification_campaigns"
ADD COLUMN IF NOT EXISTS "channels" JSONB NOT NULL DEFAULT '["email"]'::jsonb;
