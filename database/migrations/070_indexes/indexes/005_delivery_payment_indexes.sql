-- Индексы доставки и оплаты.

CREATE INDEX order_deliveries_delivery_method_id_idx
  ON order_deliveries (delivery_method_id);

CREATE INDEX order_payments_order_id_idx
  ON order_payments (order_id);

CREATE INDEX order_payments_payment_method_id_idx
  ON order_payments (payment_method_id);

CREATE UNIQUE INDEX order_payments_operation_number_uq
  ON order_payments (operation_number)
  WHERE operation_number IS NOT NULL;
