-- Подключает расширение pgcrypto.
-- Оно используется для генерации UUID через gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS pgcrypto;