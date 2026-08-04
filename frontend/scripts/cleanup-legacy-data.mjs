import {
  rm
} from "node:fs/promises";

import {
  resolve
} from "node:path";

const obsoletePaths = [
  "src/assets/hero.png",
  "src/features/articles",
  "src/features/category/category.data.ts",
  "src/features/product/product.data.ts",
  "src/features/product/product.test-data.ts",
  "src/features/search/search.data.ts",
  "src/features/delivery/delivery.storage.ts",
  "src/pages/ArticlePage.tsx",
  "src/pages/ArticlesPage.tsx",
  "src/shared/styles/articles.css",
  "src/shared/styles/home-hero-carousel.css"
];

for (const obsoletePath of obsoletePaths) {
  await rm(
    resolve(obsoletePath),
    {
      recursive: true,
      force: true
    }
  );

  console.log(
    `Удалено: ${obsoletePath}`
  );
}

console.log(
  "Локальные бизнес-данные frontend удалены."
);
