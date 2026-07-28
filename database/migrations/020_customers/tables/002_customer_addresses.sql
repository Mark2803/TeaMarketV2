-- Сохранённые адреса доставки покупателей.
-- У одного покупателя может быть несколько адресов.

CREATE TABLE customer_addresses (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  customer_id UUID
    NOT NULL,

  address_name VARCHAR(100)
    NOT NULL,

  recipient_name VARCHAR(255)
    NOT NULL,

  phone VARCHAR(32)
    NOT NULL,

  region VARCHAR(150),

  city VARCHAR(150)
    NOT NULL,

  street VARCHAR(255)
    NOT NULL,

  house VARCHAR(50)
    NOT NULL,

  apartment VARCHAR(50),

  postal_code VARCHAR(20),

  comment TEXT,

  is_default BOOLEAN
    NOT NULL
    DEFAULT FALSE,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT customer_addresses_customer_fk
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE customer_addresses IS
  'Сохранённые адреса доставки покупателей.';