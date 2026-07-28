-- Удаление триггеров, если они уже существуют.

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON product_variants;
DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS trg_collections_updated_at ON collections;
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS trg_customer_addresses_updated_at ON customer_addresses;
DROP TRIGGER IF EXISTS trg_carts_updated_at ON carts;
DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON cart_items;
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS trg_delivery_methods_updated_at ON delivery_methods;
DROP TRIGGER IF EXISTS trg_order_deliveries_updated_at ON order_deliveries;
DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON payment_methods;
DROP TRIGGER IF EXISTS trg_order_payments_updated_at ON order_payments;
