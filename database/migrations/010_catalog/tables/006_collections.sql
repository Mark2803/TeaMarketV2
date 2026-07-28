-- Подборки товаров.
-- Например: Новинки, Хиты, Подарочные наборы.

CREATE TABLE collections (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  name VARCHAR(255)
    NOT NULL,

  description TEXT,

  image_url TEXT,

  sort_order INTEGER
    NOT NULL
    DEFAULT 0,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT collections_sort_order_check
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE collections IS
  'Подборки товаров каталога.';