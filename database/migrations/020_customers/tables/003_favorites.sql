-- Избранные товары покупателей.

CREATE TABLE favorites (
  customer_id UUID
    NOT NULL,

  product_id UUID
    NOT NULL,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT favorites_pk
    PRIMARY KEY (
      customer_id,
      product_id
    ),

  CONSTRAINT favorites_customer_fk
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE,

  CONSTRAINT favorites_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE favorites IS
  'Избранные товары покупателей.';