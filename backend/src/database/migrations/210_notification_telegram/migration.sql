ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "telegram_chat_id" VARCHAR(64);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "telegram_connected_at" TIMESTAMPTZ(6);
CREATE UNIQUE INDEX IF NOT EXISTS "customers_telegram_chat_id_uq" ON "customers"("telegram_chat_id");
