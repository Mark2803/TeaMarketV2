-- Операции оплаты по заказам.

CREATE TABLE order_payments (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  order_id UUID
    NOT NULL,

  payment_method_id UUID
    NOT NULL,

  operation_number VARCHAR(255),

  amount NUMERIC(12,2)
    NOT NULL,

  status VARCHAR(32)
    NOT NULL
    DEFAULT 'pending',

  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT order_payments_order_fk
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE RESTRICT,

  CONSTRAINT order_payments_method_fk
    FOREIGN KEY (payment_method_id)
    REFERENCES payment_methods(id)
    ON DELETE RESTRICT,

  CONSTRAINT order_payments_amount_check
    CHECK (amount > 0),

  CONSTRAINT order_payments_status_check
    CHECK (
      status IN (
        'pending',
        'succeeded',
        'failed',
        'cancelled',
        'refunded'
      )
    )
);

COMMENT ON TABLE order_payments IS
  'Операции оплаты и возврата по заказам.';