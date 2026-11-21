-- Флаг индексации статей (как у товаров): false → noindex и исключение из sitemap.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS is_indexed boolean NOT NULL DEFAULT true;
