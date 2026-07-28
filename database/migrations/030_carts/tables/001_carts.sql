-- Корзины покупателей и гостей.

CREATE TABLE carts (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  customer_id UUID,

  guest_token UUID,

  status VARCHAR(32)
    NOT NULL
    DEFAULT 'active',

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT carts_customer_fk
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE RESTRICT,

  CONSTRAINT carts_guest_token_unique
    UNIQUE (guest_token),

  CONSTRAINT carts_status_check
    CHECK (
      status IN (
        'active',
        'converted',
        'abandoned',
        'expired'
      )
    ),

  CONSTRAINT carts_owner_check
    CHECK (
      (
        customer_id IS NOT NULL
        AND guest_token IS NULL
      )
      OR
      (
        customer_id IS NULL
        AND guest_token IS NOT NULL
      )
    )
);

COMMENT ON TABLE carts IS
  'Корзины авторизованных покупателей и гостей.';
