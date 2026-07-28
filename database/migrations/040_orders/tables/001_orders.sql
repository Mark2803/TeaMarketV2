-- Заказы покупателей.
-- Контактные данные и суммы фиксируются
-- в состоянии на момент оформления заказа.

CREATE TABLE orders (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  order_number VARCHAR(50)
    NOT NULL,

  customer_id UUID,

  customer_name VARCHAR(255)
    NOT NULL,

  phone VARCHAR(32)
    NOT NULL,

  email VARCHAR(320),

  status VARCHAR(32)
    NOT NULL
    DEFAULT 'new',

  payment_status VARCHAR(32)
    NOT NULL
    DEFAULT 'unpaid',

  items_total NUMERIC(12,2)
    NOT NULL
    DEFAULT 0,

  delivery_cost NUMERIC(12,2)
    NOT NULL
    DEFAULT 0,

  total_amount NUMERIC(12,2)
    NOT NULL
    DEFAULT 0,

  comment TEXT,

  ordered_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT orders_order_number_unique
    UNIQUE (order_number),

  CONSTRAINT orders_customer_fk
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE SET NULL,

  CONSTRAINT orders_status_check
    CHECK (
      status IN (
        'new',
        'confirmed',
        'processing',
        'shipped',
        'completed',
        'cancelled'
      )
    ),

  CONSTRAINT orders_payment_status_check
    CHECK (
      payment_status IN (
        'unpaid',
        'pending',
        'paid',
        'partially_refunded',
        'refunded',
        'failed'
      )
    ),

  CONSTRAINT orders_items_total_check
    CHECK (items_total >= 0),

  CONSTRAINT orders_delivery_cost_check
    CHECK (delivery_cost >= 0),

  CONSTRAINT orders_total_amount_check
    CHECK (total_amount >= 0),

  CONSTRAINT orders_total_calculation_check
    CHECK (
      total_amount = items_total + delivery_cost
    )
);

COMMENT ON TABLE orders IS
  'Заказы и зафиксированные данные на момент оформления.';