ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS linked_product_id uuid,
  ADD COLUMN IF NOT EXISTS cta_text varchar(255);

DO $$ BEGIN
  ALTER TABLE articles
    ADD CONSTRAINT articles_linked_product_fk
    FOREIGN KEY (linked_product_id) REFERENCES products(id)
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS articles_linked_product_idx ON articles(linked_product_id);

CREATE TABLE IF NOT EXISTS article_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  channel varchar(50) NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  status varchar(32) NOT NULL DEFAULT 'pending',
  external_id varchar(255),
  external_url text,
  published_at timestamptz,
  last_synced_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT article_publications_article_channel_uq UNIQUE(article_id, channel)
);

CREATE INDEX IF NOT EXISTS article_publications_channel_enabled_idx
  ON article_publications(channel, enabled);
