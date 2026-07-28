-- Доступные способы оплаты.

CREATE TABLE payment_methods (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  name VARCHAR(255)
    NOT NULL,

  is_active BOOLEAN
    NOT NULL
    DEFAULT TRUE,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT payment_methods_name_unique
    UNIQUE (name)
);

COMMENT ON TABLE payment_methods IS
  'Справочник доступных способов оплаты.';