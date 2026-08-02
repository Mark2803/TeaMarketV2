\echo 'Модуль 120_auth: Коды подтверждения и сессии покупателей'

CREATE TABLE auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  phone VARCHAR(32) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,

  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,

  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT auth_codes_attempts_check
    CHECK (
      attempts >= 0
      AND max_attempts > 0
      AND attempts <= max_attempts
    ),

  CONSTRAINT auth_codes_expiration_check
    CHECK (
      expires_at > created_at
    )
);

CREATE INDEX auth_codes_phone_created_idx
  ON auth_codes (
    phone,
    created_at DESC
  );

CREATE INDEX auth_codes_active_idx
  ON auth_codes (
    phone,
    expires_at
  )
  WHERE used_at IS NULL;


CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_id UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL,

  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT auth_sessions_customer_fk
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE,

  CONSTRAINT auth_sessions_token_unique
    UNIQUE (token_hash),

  CONSTRAINT auth_sessions_expiration_check
    CHECK (
      expires_at > created_at
    )
);

CREATE INDEX auth_sessions_customer_idx
  ON auth_sessions (
    customer_id,
    created_at DESC
  );

CREATE INDEX auth_sessions_active_idx
  ON auth_sessions (
    token_hash,
    expires_at
  )
  WHERE revoked_at IS NULL;