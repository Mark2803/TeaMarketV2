-- Индексы покупателей.

CREATE UNIQUE INDEX customers_email_uq
  ON customers (email)
  WHERE email IS NOT NULL;

CREATE INDEX customer_addresses_customer_id_idx
  ON customer_addresses (customer_id);

CREATE UNIQUE INDEX customer_addresses_default_uq
  ON customer_addresses (customer_id)
  WHERE is_default = TRUE;