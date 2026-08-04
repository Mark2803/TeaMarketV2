\set ON_ERROR_STOP on

\echo '========================================'
\echo 'Запуск миграций базы данных Tea Market'
\echo '========================================'

BEGIN;

\ir migrations/001_extensions/migration.sql
\ir migrations/010_catalog/migration.sql
\ir migrations/020_customers/migration.sql
\ir migrations/030_carts/migration.sql
\ir migrations/040_orders/migration.sql
\ir migrations/050_delivery/migration.sql
\ir migrations/060_payments/migration.sql
\ir migrations/070_indexes/migration.sql
\ir migrations/080_triggers/migration.sql
\ir migrations/090_seed/migration.sql
\ir migrations/100_catalog_foundation/migration.sql
\ir migrations/110_product_relations/migration.sql
\ir migrations/120_auth/migration.sql
\ir migrations/130_articles/migration.sql

COMMIT;

\echo '========================================'
\echo 'Миграции успешно завершены'
\echo '========================================'