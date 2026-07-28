-- Иерархические категории и подкатегории каталога.
-- Категория верхнего уровня имеет parent_category_id = NULL.

CREATE TABLE categories (
  id UUID
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  parent_category_id UUID,

  name VARCHAR(255)
    NOT NULL,

  description TEXT,

  image_url TEXT,

  sort_order INTEGER
    NOT NULL
    DEFAULT 0,

  is_visible BOOLEAN
    NOT NULL
    DEFAULT TRUE,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT categories_parent_fk
    FOREIGN KEY (parent_category_id)
    REFERENCES categories(id)
    ON DELETE SET NULL,

  CONSTRAINT categories_parent_name_uq
    UNIQUE (parent_category_id, name),

  CONSTRAINT categories_not_own_parent_check
    CHECK (
      parent_category_id IS NULL
      OR parent_category_id <> id
    ),

  CONSTRAINT categories_sort_order_check
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE categories IS
  'Иерархические категории и подкатегории каталога.';