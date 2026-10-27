Tea Market Analytics E2E test

Requires:
- PostgreSQL running
- backend running at http://localhost:3000
- current analytics implementation installed

Copy backend/scripts/analytics-e2e-test.ts into your project.
From backend folder run:
  npx tsx scripts/analytics-e2e-test.ts

The test:
- creates isolated guest cart
- records page_view/product_view/add_to_cart/checkout_started
- creates one real temporary order through POST /api/orders
- verifies analytics_order_attributions
- verifies source/session/order chain
- verifies stock decrement
- removes the temporary order, cart, analytics session/events
- restores stock

It does not reset or migrate the database.
