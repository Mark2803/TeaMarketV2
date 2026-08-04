CREATE TABLE IF NOT EXISTS home_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL,
  eyebrow varchar(120),
  title varchar(255) NOT NULL,
  subtitle text,
  image_url text,
  image_alt varchar(500),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_banners_collection_fk
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  CONSTRAINT home_banners_dates_check
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS home_banners_active_sort_idx
  ON home_banners (is_active, sort_order);
CREATE INDEX IF NOT EXISTS home_banners_collection_idx
  ON home_banners (collection_id);
CREATE INDEX IF NOT EXISTS home_banners_dates_idx
  ON home_banners (starts_at, ends_at);
