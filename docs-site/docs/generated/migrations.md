# Миграции

Порядок и состав миграций базы данных.

- Модулей: **12**
- SQL-файлов: **40**

## 001_extensions

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/001_extensions/001_pgcrypto.sql` | pgcrypto |
| `database/migrations/001_extensions/migration.sql` | управляющий файл или пока пусто |

## 010_catalog

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/010_catalog/migration.sql` | управляющий файл или пока пусто |
| `database/migrations/010_catalog/tables/001_products.sql` | products |
| `database/migrations/010_catalog/tables/002_product_variants.sql` | product_variants |
| `database/migrations/010_catalog/tables/003_product_images.sql` | product_images |
| `database/migrations/010_catalog/tables/004_categories.sql` | categories |
| `database/migrations/010_catalog/tables/005_product_categories.sql` | product_categories |
| `database/migrations/010_catalog/tables/006_collections.sql` | collections |
| `database/migrations/010_catalog/tables/007_collection_products.sql` | collection_products |

## 020_customers

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/020_customers/migration.sql` | управляющий файл или пока пусто |
| `database/migrations/020_customers/tables/001_customers.sql` | customers |
| `database/migrations/020_customers/tables/002_customer_addresses.sql` | customer_addresses |
| `database/migrations/020_customers/tables/003_favorites.sql` | favorites |

## 030_carts

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/030_carts/migration.sql` | управляющий файл или пока пусто |
| `database/migrations/030_carts/tables/001_carts.sql` | carts |
| `database/migrations/030_carts/tables/002_cart_items.sql` | cart_items |

## 040_orders

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/040_orders/migration.sql` | управляющий файл или пока пусто |
| `database/migrations/040_orders/tables/001_orders.sql` | orders |
| `database/migrations/040_orders/tables/002_order_items.sql` | order_items |
| `database/migrations/040_orders/tables/003_order_status_history.sql` | order_status_history |

## 050_delivery

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/050_delivery/migration.sql` | управляющий файл или пока пусто |
| `database/migrations/050_delivery/tables/001_delivery_methods.sql` | delivery_methods |
| `database/migrations/050_delivery/tables/002_order_deliveries.sql` | order_deliveries |

## 060_payments

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/060_payments/migration.sql` | управляющий файл или пока пусто |
| `database/migrations/060_payments/tables/001_payment_methods.sql` | payment_methods |
| `database/migrations/060_payments/tables/002_order_payments.sql` | order_payments |

## 070_indexes

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/070_indexes/indexes/001_catalog_indexes.sql` | product_variants_product_id_idx, product_images_product_id_sort_order_idx, categories_parent_category_id_idx, categories_visible_sort_order_idx, product_categories_category_id_idx, product_categories_one_primary_uq, product_categories_category_sort_order_idx, collections_sort_order_idx, collection_products_product_id_idx, collection_products_collection_sort_order_idx, products_active_idx, products_tea_type_idx, products_country_idx, products_region_idx, products_manufacturer_idx |
| `database/migrations/070_indexes/indexes/002_customer_indexes.sql` | customers_email_uq, customer_addresses_customer_id_idx, customer_addresses_default_uq |
| `database/migrations/070_indexes/indexes/003_cart_indexes.sql` | carts_customer_id_idx, carts_customer_active_uq, cart_items_cart_id_idx, cart_items_product_variant_id_idx |
| `database/migrations/070_indexes/indexes/004_order_indexes.sql` | orders_customer_id_idx, orders_status_idx, orders_ordered_at_idx, order_items_order_id_idx, order_items_product_id_idx, order_status_history_order_id_idx, order_status_history_new_status_idx, order_status_history_changed_at_idx |
| `database/migrations/070_indexes/indexes/005_delivery_payment_indexes.sql` | order_deliveries_delivery_method_id_idx, order_payments_order_id_idx, order_payments_payment_method_id_idx, order_payments_operation_number_uq |
| `database/migrations/070_indexes/migration.sql` | управляющий файл или пока пусто |

## 080_triggers

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/080_triggers/002_updated_at_triggers.sql` | trg_products_updated_at, trg_product_variants_updated_at, trg_categories_updated_at, trg_collections_updated_at, trg_customers_updated_at, trg_customer_addresses_updated_at, trg_carts_updated_at, trg_cart_items_updated_at, trg_orders_updated_at, trg_delivery_methods_updated_at, trg_order_deliveries_updated_at, trg_payment_methods_updated_at, trg_order_payments_updated_at |
| `database/migrations/080_triggers/003_drop_triggers.sql` | управляющий файл или пока пусто |
| `database/migrations/080_triggers/functions/001_set_updated_at.sql` | управляющий файл или пока пусто |
| `database/migrations/080_triggers/migration.sql` | управляющий файл или пока пусто |

## 090_seed

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/090_seed/migration.sql` | управляющий файл или пока пусто |

## 100_catalog_foundation

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/100_catalog_foundation/migration.sql` | product_variants_catalog_idx, categories_catalog_idx, collections_catalog_idx, collections_dates_idx |

## 110_product_relations

| SQL-файл | Создаваемые объекты |
|---|---|
| `database/migrations/110_product_relations/migration.sql` | product_relations, product_relations_product_idx, product_relations_related_product_idx |
