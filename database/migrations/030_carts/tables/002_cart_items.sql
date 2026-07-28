-- Товары, добавленные в корзину.

CREATE TABLE cart_items (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  cart_id UUID
    NOT NULL,

  product_variant_id UUID
    NOT NULL,

  quantity INTEGER
    NOT NULL
    DEFAULT 1,

  price_at_addition NUMERIC(12,2)
    NOT NULL,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT cart_items_cart_fk
    FOREIGN KEY (cart_id)
    REFERENCES carts(id)
    ON DELETE CASCADE,

  CONSTRAINT cart_items_variant_fk
    FOREIGN KEY (product_variant_id)
    REFERENCES product_variants(id)
    ON DELETE RESTRICT,

  CONSTRAINT cart_items_cart_variant_unique
    UNIQUE (
      cart_id,
      product_variant_id
    ),

  CONSTRAINT cart_items_quantity_check
    CHECK (quantity > 0),

  CONSTRAINT cart_items_price_check
    CHECK (price_at_addition >= 0)
);

COMMENT ON TABLE cart_items IS
  'Товары и их количество в корзине.';