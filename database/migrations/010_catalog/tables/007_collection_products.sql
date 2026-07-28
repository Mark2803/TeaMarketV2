-- Связь товаров с подборками.
-- Реализует отношение многие-ко-многим.

CREATE TABLE collection_products (
  collection_id UUID
    NOT NULL,

  product_id UUID
    NOT NULL,

  sort_order INTEGER
    NOT NULL
    DEFAULT 0,

  CONSTRAINT collection_products_pk
    PRIMARY KEY (collection_id, product_id),

  CONSTRAINT collection_products_collection_fk
    FOREIGN KEY (collection_id)
    REFERENCES collections(id)
    ON DELETE CASCADE,

  CONSTRAINT collection_products_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT collection_products_sort_order_check
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE collection_products IS
  'Связь товаров с подборками каталога.';