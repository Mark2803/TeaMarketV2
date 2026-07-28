\echo 'Модуль 100_catalog_foundation: Доработка каталога для API и админ-панели'

-- ============================================================
-- Варианты товара
-- ============================================================

ALTER TABLE product_variants
  ADD COLUMN old_price NUMERIC(12, 2),
  ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active';

ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_old_price_check
    CHECK (
      old_price IS NULL
      OR old_price > price
    ),
  ADD CONSTRAINT product_variants_status_check
    CHECK (
      status IN (
        'active',
        'hidden',
        'archived'
      )
    );

CREATE INDEX product_variants_catalog_idx
  ON product_variants (
    product_id,
    status,
    is_available,
    sort_order
  );

-- ============================================================
-- Категории
-- ============================================================

ALTER TABLE categories
  ADD COLUMN slug VARCHAR(255),
  ADD COLUMN seo_title VARCHAR(255),
  ADD COLUMN seo_description TEXT,
  ADD COLUMN canonical_url TEXT,
  ADD COLUMN is_indexed BOOLEAN NOT NULL DEFAULT TRUE;

-- Безопасное временное значение для уже существующих строк.
-- В будущей админ-панели slug можно будет изменить вручную.
UPDATE categories
SET slug = 'category-' || REPLACE(id::TEXT, '-', '')
WHERE slug IS NULL;

ALTER TABLE categories
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT categories_slug_uq UNIQUE (slug);

CREATE INDEX categories_catalog_idx
  ON categories (
    is_visible,
    sort_order,
    slug
  );

-- ============================================================
-- Подборки
-- ============================================================

ALTER TABLE collections
  ADD COLUMN slug VARCHAR(255),
  ADD COLUMN collection_type VARCHAR(32) NOT NULL DEFAULT 'manual',
  ADD COLUMN automation_rules JSONB,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN show_on_home BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN starts_at TIMESTAMPTZ,
  ADD COLUMN ends_at TIMESTAMPTZ,
  ADD COLUMN seo_title VARCHAR(255),
  ADD COLUMN seo_description TEXT,
  ADD COLUMN canonical_url TEXT,
  ADD COLUMN is_indexed BOOLEAN NOT NULL DEFAULT TRUE;

-- Безопасное временное значение для уже существующих строк.
UPDATE collections
SET slug = 'collection-' || REPLACE(id::TEXT, '-', '')
WHERE slug IS NULL;

ALTER TABLE collections
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT collections_slug_uq UNIQUE (slug),
  ADD CONSTRAINT collections_type_check
    CHECK (
      collection_type IN (
        'manual',
        'automatic'
      )
    ),
  ADD CONSTRAINT collections_automation_rules_check
    CHECK (
      collection_type = 'manual'
      OR automation_rules IS NOT NULL
    ),
  ADD CONSTRAINT collections_dates_check
    CHECK (
      starts_at IS NULL
      OR ends_at IS NULL
      OR starts_at < ends_at
    );

CREATE INDEX collections_catalog_idx
  ON collections (
    is_active,
    show_on_home,
    sort_order
  );

CREATE INDEX collections_dates_idx
  ON collections (
    starts_at,
    ends_at
  );
