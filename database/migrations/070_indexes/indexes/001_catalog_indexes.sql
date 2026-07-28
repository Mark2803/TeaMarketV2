-- Индексы каталога.

CREATE INDEX product_variants_product_id_idx
  ON product_variants (product_id);

CREATE INDEX product_images_product_id_sort_order_idx
  ON product_images (product_id, sort_order);

CREATE INDEX categories_parent_category_id_idx
  ON categories (parent_category_id);

CREATE INDEX categories_visible_sort_order_idx
  ON categories (is_visible, sort_order);

CREATE INDEX product_categories_category_id_idx
  ON product_categories (category_id);

CREATE UNIQUE INDEX product_categories_one_primary_uq
  ON product_categories (product_id)
  WHERE is_primary = TRUE;

CREATE INDEX product_categories_category_sort_order_idx
  ON product_categories (category_id, sort_order);

CREATE INDEX collections_sort_order_idx
  ON collections (sort_order);

CREATE INDEX collection_products_product_id_idx
  ON collection_products (product_id);

CREATE INDEX collection_products_collection_sort_order_idx
  ON collection_products (collection_id, sort_order);

CREATE INDEX products_active_idx
  ON products (is_active);

CREATE INDEX products_tea_type_idx
  ON products (tea_type);

CREATE INDEX products_country_idx
  ON products (country);

CREATE INDEX products_region_idx
  ON products (region);

CREATE INDEX products_manufacturer_idx
  ON products (manufacturer);