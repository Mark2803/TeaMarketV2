# Зависимости и команды

## Импорты исходного кода

| Файл | Импорты |
|---|---|
| `backend/prisma/prisma.ts` | `../generated/prisma/client.js`, `@prisma/adapter-pg`, `dotenv/config`, `pg` |
| `backend/prisma.config.ts` | `dotenv/config`, `prisma/config` |
| `backend/src/app.ts` | `./middleware/error-handler.js`, `./middleware/not-found.js`, `./routes/index.js`, `compression`, `cors`, `express`, `helmet`, `pino-http` |
| `backend/src/config/env.ts` | `dotenv/config`, `zod` |
| `backend/src/database/prisma.ts` | `../config/env.js`, `../generated/prisma/client.js`, `@prisma/adapter-pg`, `pg` |
| `backend/src/generated/prisma/browser.ts` | `./enums.js`, `./internal/prismaNamespaceBrowser.js` |
| `backend/src/generated/prisma/client.ts` | `./enums.js`, `./internal/class.js`, `./internal/prismaNamespace.js`, `@prisma/client/runtime/client`, `node:path`, `node:process`, `node:url` |
| `backend/src/generated/prisma/commonInputTypes.ts` | `./enums.js`, `./internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/internal/class.ts` | `./prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/internal/prismaNamespace.ts` | `../models.js`, `./class.js`, `./generated/prisma/client`, `@prisma/adapter-pg`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/internal/prismaNamespaceBrowser.ts` | `../models.js`, `./prismaNamespace.js`, `@prisma/client/runtime/index-browser` |
| `backend/src/generated/prisma/models/cart_items.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/carts.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/categories.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/collection_products.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/collections.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/customer_addresses.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/customers.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/delivery_methods.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/favorites.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/order_deliveries.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/order_items.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/order_payments.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/order_status_history.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/orders.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/payment_methods.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/product_categories.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/product_images.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/product_relations.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/product_variants.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models/products.ts` | `../enums.js`, `../internal/prismaNamespace.js`, `@prisma/client/runtime/client` |
| `backend/src/generated/prisma/models.ts` | `./commonInputTypes.js`, `./models/cart_items.js`, `./models/carts.js`, `./models/categories.js`, `./models/collection_products.js`, `./models/collections.js`, `./models/customer_addresses.js`, `./models/customers.js`, `./models/delivery_methods.js`, `./models/favorites.js`, `./models/order_deliveries.js`, `./models/order_items.js`, `./models/order_payments.js`, `./models/order_status_history.js`, `./models/orders.js`, `./models/payment_methods.js`, `./models/product_categories.js`, `./models/product_images.js`, `./models/product_relations.js`, `./models/product_variants.js`, `./models/products.js` |
| `backend/src/middleware/error-handler.ts` | `express` |
| `backend/src/middleware/not-found.ts` | `express` |
| `backend/src/modules/cart/cart.controller.ts` | `./cart.schemas.js`, `./cart.service.js`, `express` |
| `backend/src/modules/cart/cart.routes.ts` | `./cart.controller.js`, `express` |
| `backend/src/modules/cart/cart.schemas.ts` | `zod` |
| `backend/src/modules/cart/cart.service.ts` | `../../database/prisma.js`, `../../generated/prisma/client.js`, `./cart.schemas.js` |
| `backend/src/modules/categories/categories.controller.ts` | `../products/products.query.js`, `./categories.service.js`, `express` |
| `backend/src/modules/categories/categories.routes.ts` | `./categories.controller.js`, `express` |
| `backend/src/modules/categories/categories.service.ts` | `../../database/prisma.js`, `../products/products.query.js`, `../products/products.service.js` |
| `backend/src/modules/collections/collections.controller.ts` | `../products/products.query.js`, `./collections.service.js`, `express` |
| `backend/src/modules/collections/collections.routes.ts` | `./collections.controller.js`, `express` |
| `backend/src/modules/collections/collections.service.ts` | `../../database/prisma.js`, `../products/products.query.js`, `../products/products.service.js` |
| `backend/src/modules/products/products.controller.ts` | `./products.query.js`, `./products.service.js`, `express` |
| `backend/src/modules/products/products.query.ts` | `zod` |
| `backend/src/modules/products/products.routes.ts` | `./products.controller.js`, `express` |
| `backend/src/modules/products/products.service.ts` | `../../database/prisma.js`, `../../generated/prisma/client.js`, `./products.query.js` |
| `backend/src/modules/search/search.controller.ts` | `./search.service.js`, `express` |
| `backend/src/modules/search/search.routes.ts` | `./search.controller.js`, `express` |
| `backend/src/modules/search/search.service.ts` | `../../database/prisma.js` |
| `backend/src/routes/health.ts` | `../database/prisma.js`, `express` |
| `backend/src/routes/index.ts` | `../modules/cart/cart.routes.js`, `../modules/categories/categories.routes.js`, `../modules/collections/collections.routes.js`, `../modules/products/products.routes.js`, `../modules/search/search.routes.js`, `./health.js`, `express` |
| `backend/src/server.ts` | `./app.js`, `./config/env.js`, `./database/prisma.js` |
| `docs-site/tools/build-docs.js` | `./generators/database`, `./generators/dependencies`, `./generators/migrations`, `./generators/structure`, `./generators/utils`, `fs`, `path` |

## backend

Файл: `backend/package.json`

### Скрипты

- `npm run dev` — `tsx watch src/server.ts`
- `npm run build` — `tsc`
- `npm run start` — `node dist/server.js`
- `npm run typecheck` — `tsc --noEmit`

### Пакеты

| Пакет | Версия |
|---|---|
| @prisma/adapter-pg | ^7.9.0 |
| @prisma/client | ^7.9.0 |
| compression | ^1.8.1 |
| cors | ^2.8.6 |
| dotenv | ^17.4.2 |
| express | ^5.2.1 |
| helmet | ^8.3.0 |
| pg | ^8.22.0 |
| pino | ^10.3.1 |
| pino-http | ^11.0.0 |
| zod | ^4.4.3 |
| @types/compression | ^1.8.1 |
| @types/cors | ^2.8.19 |
| @types/express | ^5.0.6 |
| @types/node | ^26.1.1 |
| @types/pg | ^8.20.0 |
| eslint | ^10.8.0 |
| prettier | ^3.9.6 |
| prisma | ^7.9.0 |
| tsx | ^4.23.1 |
| typescript | ^7.0.2 |

## docs-site

Файл: `docs-site/package.json`

### Скрипты

- `npm run test` — `echo "Error: no test specified" && exit 1`
- `npm run docs` — `node tools/build-docs.js`

### Пакеты

| Пакет | Версия |
|---|---|
| @mermaid-js/mermaid-cli | ^11.16.0 |
| dependency-cruiser | ^18.1.0 |

## tea-market-v2

Файл: `package.json`

### Скрипты

- `npm run test` — `echo "Error: no test specified" && exit 1`

### Пакеты

| Пакет | Версия |
|---|---|
| dependency-cruiser | ^18.1.0 |
