-- Позиции оформленных заказов.

CREATE TABLE order_items (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  order_id UUID
    NOT NULL,

  product_id UUID,

  product_name VARCHAR(255)
    NOT NULL,

  sku VARCHAR(100)
    NOT NULL,

  weight_g NUMERIC(10,3)
    NOT NULL,

  unit_price NUMERIC(12,2)
    NOT NULL,

  quantity INTEGER
    NOT NULL
    DEFAULT 1,

  line_total NUMERIC(12,2)
    NOT NULL,

  CONSTRAINT order_items_order_fk
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE RESTRICT,

  CONSTRAINT order_items_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE SET NULL,

  CONSTRAINT order_items_weight_check
    CHECK (weight_g > 0),

  CONSTRAINT order_items_unit_price_check
    CHECK (unit_price >= 0),

  CONSTRAINT order_items_quantity_check
    CHECK (quantity > 0),

  CONSTRAINT order_items_line_total_check
    CHECK (line_total >= 0),

  CONSTRAINT order_items_total_calculation_check
    CHECK (line_total = unit_price * quantity)
);

COMMENT ON TABLE order_items IS
  'Неизменяемый снимок позиций оформленного заказа.';