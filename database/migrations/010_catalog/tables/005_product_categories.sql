-- Связь товаров с категориями.
-- Реализует отношение многие-ко-многим.
-- Поле is_primary определяет основную категорию товара.

CREATE TABLE product_categories (
  product_id UUID
    NOT NULL,

  category_id UUID
    NOT NULL,

  is_primary BOOLEAN
    NOT NULL
    DEFAULT FALSE,

  sort_order INTEGER
    NOT NULL
    DEFAULT 0,

  CONSTRAINT product_categories_pk
    PRIMARY KEY (product_id, category_id),

  CONSTRAINT product_categories_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT product_categories_category_fk
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE CASCADE,

  CONSTRAINT product_categories_sort_order_check
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE product_categories IS
  'Связь товаров с категориями каталога.';