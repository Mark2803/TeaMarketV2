-- Доступные способы доставки.

CREATE TABLE delivery_methods (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  name VARCHAR(255)
    NOT NULL,

  base_cost NUMERIC(12,2)
    NOT NULL
    DEFAULT 0,

  delivery_term VARCHAR(255),

  is_active BOOLEAN
    NOT NULL
    DEFAULT TRUE,

  sort_order INTEGER
    NOT NULL
    DEFAULT 0,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT delivery_methods_name_unique
    UNIQUE (name),

  CONSTRAINT delivery_methods_base_cost_check
    CHECK (base_cost >= 0),

  CONSTRAINT delivery_methods_sort_order_check
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE delivery_methods IS
  'Доступные способы доставки заказов.';