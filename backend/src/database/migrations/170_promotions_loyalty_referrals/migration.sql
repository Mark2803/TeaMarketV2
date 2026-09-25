-- Выполнять ПОСЛЕ `npx prisma db push`.
-- Безопасный backfill старых заказов для будущей аналитики.
UPDATE orders
SET gross_items_total = items_total
WHERE gross_items_total = 0 AND items_total <> 0;
