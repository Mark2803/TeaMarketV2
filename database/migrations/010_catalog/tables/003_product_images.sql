-- Изображения товара.
-- Главное изображение определяется минимальным значением sort_order.
-- Сами файлы хранятся в Yandex Object Storage.

CREATE TABLE product_images (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  product_id UUID
    NOT NULL,

  image_url TEXT
    NOT NULL,

  alt_text VARCHAR(500),

  sort_order INTEGER
    NOT NULL
    DEFAULT 0,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT product_images_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT product_images_product_url_uq
    UNIQUE (product_id, image_url),

  CONSTRAINT product_images_sort_order_check
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE product_images IS
  'Данные изображений товаров, хранящихся в Yandex Object Storage.';
