-- Selected sender drop-off station for Yandex Delivery; no courier pickup.
CREATE TABLE IF NOT EXISTS yandex_delivery_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  primary_dropoff_id text NOT NULL,
  primary_dropoff_name text NOT NULL,
  primary_dropoff_address text NOT NULL,
  primary_dropoff_city text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
