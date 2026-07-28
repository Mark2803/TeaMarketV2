-- Доставка конкретного заказа.

CREATE TABLE order_deliveries (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  order_id UUID
    NOT NULL,

  delivery_method_id UUID
    NOT NULL,

  cost NUMERIC(12,2)
    NOT NULL
    DEFAULT 0,

  recipient_name VARCHAR(255)
    NOT NULL,

  phone VARCHAR(32)
    NOT NULL,

  full_address TEXT
    NOT NULL,

  comment TEXT,

  tracking_number VARCHAR(255),

  delivery_service VARCHAR(255),

  status VARCHAR(32)
    NOT NULL
    DEFAULT 'pending',

  handed_over_at TIMESTAMPTZ,

  received_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT order_deliveries_order_unique
    UNIQUE (order_id),

  CONSTRAINT order_deliveries_order_fk
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE RESTRICT,

  CONSTRAINT order_deliveries_method_fk
    FOREIGN KEY (delivery_method_id)
    REFERENCES delivery_methods(id)
    ON DELETE RESTRICT,

  CONSTRAINT order_deliveries_cost_check
    CHECK (cost >= 0),

  CONSTRAINT order_deliveries_status_check
    CHECK (
      status IN (
        'pending',
        'preparing',
        'handed_over',
        'in_transit',
        'delivered',
        'returned',
        'cancelled'
      )
    )
);

COMMENT ON TABLE order_deliveries IS
  'Снимок параметров доставки конкретного заказа.';