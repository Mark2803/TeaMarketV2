-- Покупатели магазина.
-- Профиль создаётся для пользователя Telegram Mini App.

CREATE TABLE customers (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  phone VARCHAR(32)
    NOT NULL,

  name VARCHAR(255),

  email VARCHAR(320),

  username VARCHAR(255),

  birth_date DATE,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT customers_phone_uq
    UNIQUE (phone),

  CONSTRAINT customers_birth_date_check
    CHECK (
      birth_date IS NULL
      OR birth_date <= CURRENT_DATE
    )
);

COMMENT ON TABLE customers IS
  'Профили покупателей Telegram Mini App.';