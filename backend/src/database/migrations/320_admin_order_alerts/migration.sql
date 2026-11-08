CREATE TABLE IF NOT EXISTS admin_order_alert_settings (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 email_enabled boolean NOT NULL DEFAULT false,
 email_recipient text NOT NULL DEFAULT '',
 telegram_enabled boolean NOT NULL DEFAULT false,
 telegram_chat_id text NOT NULL DEFAULT '',
 max_enabled boolean NOT NULL DEFAULT false,
 max_chat_id text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO admin_order_alert_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS admin_order_alert_deliveries (
 order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK (channel IN ('email','telegram','max')),
 status text NOT NULL CHECK (status IN ('sending','sent','failed')),
 error_message text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (order_id,channel)
);
