-- Продаваемые варианты товара.
-- Каждый вариант имеет собственные артикул, вес, цену и остаток.

CREATE TABLE product_variants (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  product_id UUID
    NOT NULL,

  sku VARCHAR(100)
    NOT NULL,

  weight_g NUMERIC(10, 3)
    NOT NULL,

  price NUMERIC(12, 2)
    NOT NULL,

  stock_quantity INTEGER
    NOT NULL
    DEFAULT 0,

  sort_order INTEGER
    NOT NULL
    DEFAULT 0,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT product_variants_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT product_variants_sku_uq
    UNIQUE (sku),

  CONSTRAINT product_variants_product_weight_uq
    UNIQUE (product_id, weight_g),

  CONSTRAINT product_variants_weight_check
    CHECK (weight_g > 0),

  CONSTRAINT product_variants_price_check
    CHECK (price >= 0),

  CONSTRAINT product_variants_stock_check
    CHECK (stock_quantity >= 0),

  CONSTRAINT product_variants_sort_order_check
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE product_variants IS
  'Продаваемые варианты товара с конкретными весом, ценой, артикулом и остатком.';