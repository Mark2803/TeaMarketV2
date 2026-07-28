-- Автоматически обновляет поле updated_at
-- перед изменением записи.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS
  'Автоматически устанавливает updated_at при обновлении записи.';