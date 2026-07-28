-- Индексы корзины.

CREATE INDEX carts_customer_id_idx
  ON carts (customer_id);

CREATE UNIQUE INDEX carts_customer_active_uq
  ON carts (customer_id)
  WHERE status = 'active';

CREATE INDEX cart_items_cart_id_idx
  ON cart_items (cart_id);

CREATE INDEX cart_items_product_variant_id_idx
  ON cart_items (product_variant_id);