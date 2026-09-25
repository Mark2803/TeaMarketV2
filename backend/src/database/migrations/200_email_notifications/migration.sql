-- Аддитивная схема Email-уведомлений. Существующие таблицы и данные не удаляются.
CREATE TABLE IF NOT EXISTS notification_channel_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),channel VARCHAR(32) NOT NULL UNIQUE,is_enabled BOOLEAN NOT NULL DEFAULT true,sender_name VARCHAR(255),sender_from VARCHAR(320),updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notification_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),event_key VARCHAR(100) NOT NULL UNIQUE,name VARCHAR(255) NOT NULL,subject VARCHAR(500) NOT NULL,body TEXT NOT NULL,is_active BOOLEAN NOT NULL DEFAULT true,created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notification_campaigns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name VARCHAR(255) NOT NULL,audience_type VARCHAR(32) NOT NULL DEFAULT 'all',customer_ids JSONB,subject VARCHAR(500) NOT NULL,body TEXT NOT NULL,status VARCHAR(32) NOT NULL DEFAULT 'draft',sent_at TIMESTAMPTZ(6),created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS notification_campaigns_status_created_at_idx ON notification_campaigns(status,created_at);
CREATE TABLE IF NOT EXISTS notification_deliveries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),customer_id UUID,campaign_id UUID,event_key VARCHAR(100),recipient VARCHAR(500) NOT NULL,subject VARCHAR(500) NOT NULL,body TEXT NOT NULL,status VARCHAR(32) NOT NULL DEFAULT 'pending',error_message TEXT,created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),sent_at TIMESTAMPTZ(6));
CREATE INDEX IF NOT EXISTS notification_deliveries_created_at_idx ON notification_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS notification_deliveries_customer_id_created_at_idx ON notification_deliveries(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notification_deliveries_status_idx ON notification_deliveries(status);
CREATE TABLE IF NOT EXISTS notification_preferences (customer_id UUID PRIMARY KEY,email_marketing BOOLEAN NOT NULL DEFAULT false,updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now());
INSERT INTO notification_channel_settings(channel,is_enabled,sender_name,sender_from) VALUES ('email',true,'Чайный Мастер','info@tea-master-team.ru') ON CONFLICT(channel) DO NOTHING;
INSERT INTO notification_templates(event_key,name,subject,body,is_active) VALUES
('registration_confirmation','Подтверждение входа','Код входа — Чайный Мастер','Код для входа: {{code}}. Код действует {{expires_minutes}} минут.',true),
('order_created','Заказ оформлен','Заказ {{order_number}} оформлен','Ваш заказ {{order_number}} принят. Сумма: {{total}} ₽.',true),
('order_status_changed','Статус заказа изменён','Статус заказа {{order_number}} изменён','Новый статус заказа {{order_number}}: {{status}}.',true),
('order_shipped','Заказ отправлен','Заказ {{order_number}} отправлен','Заказ {{order_number}} передан в доставку. Трек-номер: {{tracking_number}}.',true),
('order_delivered','Заказ доставлен','Заказ {{order_number}} доставлен','Заказ {{order_number}} доставлен. Спасибо за покупку!',true)
ON CONFLICT(event_key) DO NOTHING;
