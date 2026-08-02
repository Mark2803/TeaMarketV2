\echo 'Модуль 110_product_relations: Связанные и похожие товары'

-- ============================================================
-- Ручные связи между товарами
-- ============================================================
--
-- Связи назначаются модератором магазина.
--
-- relation_type:
--   related — связанные товары;
--   similar — похожие товары.
--
-- Связь направленная:
-- если товар B добавлен к товару A, обратная связь автоматически
-- не создаётся.
-- ============================================================

CREATE TABLE product_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID NOT NULL,
  related_product_id UUID NOT NULL,

  relation_type VARCHAR(32) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_relations_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT product_relations_related_product_fk
    FOREIGN KEY (related_product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT product_relations_type_check
    CHECK (
      relation_type IN (
        'related',
        'similar'
      )
    ),

  CONSTRAINT product_relations_not_self_check
    CHECK (
      product_id <> related_product_id
    ),

  CONSTRAINT product_relations_unique
    UNIQUE (
      product_id,
      related_product_id,
      relation_type
    )
);

CREATE INDEX product_relations_product_idx
  ON product_relations (
    product_id,
    relation_type,
    sort_order
  );

CREATE INDEX product_relations_related_product_idx
  ON product_relations (
    related_product_id
  );