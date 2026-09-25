ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "orders_is_archived_ordered_at_idx"
  ON "orders" ("is_archived", "ordered_at");
