-- Индексы заказов.

CREATE INDEX orders_customer_id_idx
  ON orders (customer_id);

CREATE INDEX orders_status_idx
  ON orders (status);

CREATE INDEX orders_ordered_at_idx
  ON orders (ordered_at);

CREATE INDEX order_items_order_id_idx
  ON order_items (order_id);

CREATE INDEX order_items_product_id_idx
  ON order_items (product_id);

CREATE INDEX order_status_history_order_id_idx
  ON order_status_history (order_id);

CREATE INDEX order_status_history_new_status_idx
  ON order_status_history (new_status);

CREATE INDEX order_status_history_changed_at_idx
  ON order_status_history (changed_at);
