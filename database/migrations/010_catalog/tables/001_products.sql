-- Основная карточка товара.
-- Цена, вес, артикул и остаток хранятся в product_variants.

CREATE TABLE products (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  name VARCHAR(255)
    NOT NULL,

  short_description TEXT,

  is_active BOOLEAN
    NOT NULL
    DEFAULT TRUE,

  tea_type VARCHAR(100),

  country VARCHAR(100),

  region VARCHAR(150),

  manufacturer VARCHAR(255),

  fermentation_level VARCHAR(100),

  product_form VARCHAR(100),

  about_tea TEXT,

  taste TEXT,

  aroma TEXT,

  effect TEXT,

  beneficial_properties TEXT,

  water_temperature_c SMALLINT,

  tea_amount_g NUMERIC(8, 3),

  brewing_time_seconds INTEGER,

  infusion_count SMALLINT,

  brewing_tips TEXT,

  slug VARCHAR(255)
    NOT NULL,

  seo_title VARCHAR(255),

  seo_description TEXT,

  canonical_url TEXT,

  is_indexed BOOLEAN
    NOT NULL
    DEFAULT TRUE,

  content_updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT products_slug_uq
    UNIQUE (slug),

  CONSTRAINT products_water_temperature_check
    CHECK (
      water_temperature_c IS NULL
      OR water_temperature_c BETWEEN 0 AND 100
    ),

  CONSTRAINT products_tea_amount_check
    CHECK (
      tea_amount_g IS NULL
      OR tea_amount_g > 0
    ),

  CONSTRAINT products_brewing_time_check
    CHECK (
      brewing_time_seconds IS NULL
      OR brewing_time_seconds > 0
    ),

  CONSTRAINT products_infusion_count_check
    CHECK (
      infusion_count IS NULL
      OR infusion_count >= 0
    )
);

COMMENT ON TABLE products IS
  'Основные карточки товаров без цены, веса, артикула и остатка.';