CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(255) NOT NULL,
  title varchar(255) NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  cover_url text,
  cover_alt varchar(500),
  reading_time_minutes integer NOT NULL DEFAULT 5,
  status varchar(32) NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  seo_title varchar(255),
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT articles_slug_uq UNIQUE (slug),
  CONSTRAINT articles_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT articles_reading_time_check
    CHECK (reading_time_minutes > 0)
);

CREATE INDEX IF NOT EXISTS articles_status_published_idx
  ON articles (status, published_at DESC);

CREATE INDEX IF NOT EXISTS articles_featured_sort_idx
  ON articles (is_featured, sort_order, published_at DESC);

DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;

CREATE TRIGGER trg_articles_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
