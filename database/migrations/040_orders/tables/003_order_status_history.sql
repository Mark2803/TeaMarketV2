-- История изменения статусов заказов.

CREATE TABLE order_status_history (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  order_id UUID
    NOT NULL,

  new_status VARCHAR(32)
    NOT NULL,

  changed_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT order_status_history_order_fk
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE RESTRICT,

  CONSTRAINT order_status_history_status_check
    CHECK (
      new_status IN (
        'new',
        'confirmed',
        'processing',
        'shipped',
        'completed',
        'cancelled'
      )
    )
);

COMMENT ON TABLE order_status_history IS
  'Последовательность изменения статусов заказа.';