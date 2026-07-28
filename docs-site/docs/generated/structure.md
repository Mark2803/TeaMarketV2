# Структура проекта

Автоматически построенное дерево проекта. Служебные каталоги и зависимости исключены.

- Каталогов: **55**
- Файлов: **89**

```text
Код/
├── backend/
│   ├── prisma/
│   │   ├── prisma.ts
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── database/
│   │   │   └── prisma.ts
│   │   ├── middleware/
│   │   │   ├── error-handler.ts
│   │   │   └── not-found.ts
│   │   ├── modules/
│   │   │   ├── categories/
│   │   │   │   ├── categories.controller.ts
│   │   │   │   ├── categories.routes.ts
│   │   │   │   └── categories.service.ts
│   │   │   ├── collections/
│   │   │   │   ├── collections.controller.ts
│   │   │   │   ├── collections.routes.ts
│   │   │   │   └── collections.service.ts
│   │   │   ├── products/
│   │   │   │   ├── products.controller.ts
│   │   │   │   ├── products.query.ts
│   │   │   │   ├── products.routes.ts
│   │   │   │   └── products.service.ts
│   │   │   └── search/
│   │   │       ├── search.controller.ts
│   │   │       ├── search.routes.ts
│   │   │       └── search.service.ts
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── .env
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   ├── prisma.config.ts
│   └── tsconfig.json
├── database/
│   ├── migrations/
│   │   ├── 001_extensions/
│   │   │   ├── 001_pgcrypto.sql
│   │   │   └── migration.sql
│   │   ├── 010_catalog/
│   │   │   ├── functions/
│   │   │   ├── tables/
│   │   │   │   ├── 001_products.sql
│   │   │   │   ├── 002_product_variants.sql
│   │   │   │   ├── 003_product_images.sql
│   │   │   │   ├── 004_categories.sql
│   │   │   │   ├── 005_product_categories.sql
│   │   │   │   ├── 006_collections.sql
│   │   │   │   └── 007_collection_products.sql
│   │   │   ├── views/
│   │   │   └── migration.sql
│   │   ├── 020_customers/
│   │   │   ├── functions/
│   │   │   ├── tables/
│   │   │   │   ├── 001_customers.sql
│   │   │   │   ├── 002_customer_addresses.sql
│   │   │   │   └── 003_favorites.sql
│   │   │   ├── views/
│   │   │   └── migration.sql
│   │   ├── 030_carts/
│   │   │   ├── functions/
│   │   │   ├── tables/
│   │   │   │   ├── 001_carts.sql
│   │   │   │   └── 002_cart_items.sql
│   │   │   ├── views/
│   │   │   └── migration.sql
│   │   ├── 040_orders/
│   │   │   ├── functions/
│   │   │   ├── tables/
│   │   │   │   ├── 001_orders.sql
│   │   │   │   ├── 002_order_items.sql
│   │   │   │   └── 003_order_status_history.sql
│   │   │   ├── views/
│   │   │   └── migration.sql
│   │   ├── 050_delivery/
│   │   │   ├── functions/
│   │   │   ├── tables/
│   │   │   │   ├── 001_delivery_methods.sql
│   │   │   │   └── 002_order_deliveries.sql
│   │   │   ├── views/
│   │   │   └── migration.sql
│   │   ├── 060_payments/
│   │   │   ├── functions/
│   │   │   ├── tables/
│   │   │   │   ├── 001_payment_methods.sql
│   │   │   │   └── 002_order_payments.sql
│   │   │   ├── views/
│   │   │   └── migration.sql
│   │   ├── 070_indexes/
│   │   │   ├── indexes/
│   │   │   │   ├── 001_catalog_indexes.sql
│   │   │   │   ├── 002_customer_indexes.sql
│   │   │   │   ├── 003_cart_indexes.sql
│   │   │   │   ├── 004_order_indexes.sql
│   │   │   │   └── 005_delivery_payment_indexes.sql
│   │   │   └── migration.sql
│   │   ├── 080_triggers/
│   │   │   ├── functions/
│   │   │   │   └── 001_set_updated_at.sql
│   │   │   ├── 002_updated_at_triggers.sql
│   │   │   ├── 003_drop_triggers.sql
│   │   │   └── migration.sql
│   │   ├── 090_seed/
│   │   │   └── migration.sql
│   │   └── 100_catalog_foundation/
│   │       └── migration.sql
│   ├── scripts/
│   ├── catalog-schema-review.md
│   ├── migrate.sql
│   └── schema-review-current.txt
├── docs-site/
│   ├── docs/
│   │   ├── generated.md
│   │   └── index.md
│   ├── tools/
│   │   ├── generators/
│   │   │   ├── database.js
│   │   │   ├── dependencies.js
│   │   │   ├── migrations.js
│   │   │   ├── structure.js
│   │   │   └── utils.js
│   │   └── build-docs.js
│   ├── mkdocs.yml
│   ├── package-lock.json
│   └── package.json
├── mermaid/
├── Обновление автодокументирования.txt
├── backend.zip
├── docker-compose.yml
├── mermaid-test.md
├── package-lock.json
├── package.json
└── tea-market-environment-report.txt
```

## Корневой каталог

`.`
