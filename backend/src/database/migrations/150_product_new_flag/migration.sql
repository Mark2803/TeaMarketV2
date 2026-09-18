ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_new_active_created_idx
  ON products (is_new, is_active, created_at DESC);

-- Для уже существующей тестовой БД: отмечаем 24 самых новых активных товара,
-- чтобы раздел можно было проверить сразу после миграции.
WITH newest AS (
  SELECT id
  FROM products
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 24
)
UPDATE products p
SET is_new = true
FROM newest n
WHERE p.id = n.id
  AND p.is_new = false;
