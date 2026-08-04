const AUTH_TOKEN_KEY =
  "tea-market-auth-token";

const AUTH_EXPIRES_AT_KEY =
  "tea-market-auth-expires-at";

const LEGACY_AUTH_KEYS = [
  "tea-market-auth-session",
  "tea-market-auth-profiles"
];

function clearLegacyAuthData(): void {
  for (const key of LEGACY_AUTH_KEYS) {
    localStorage.removeItem(key);
  }
}

export function readAuthToken(): string | null {
  clearLegacyAuthData();

  const token =
    localStorage.getItem(
      AUTH_TOKEN_KEY
    );

  const expiresAtValue =
    localStorage.getItem(
      AUTH_EXPIRES_AT_KEY
    );

  if (!token) {
    return null;
  }

  if (expiresAtValue) {
    const expiresAt =
      new Date(expiresAtValue);

    if (
      Number.isNaN(expiresAt.getTime())
      || expiresAt <= new Date()
    ) {
      clearAuthToken();
      return null;
    }
  }

  return token;
}

export function saveAuthToken(
  token: string,
  expiresAt: string
): void {
  clearLegacyAuthData();

  localStorage.setItem(
    AUTH_TOKEN_KEY,
    token
  );

  localStorage.setItem(
    AUTH_EXPIRES_AT_KEY,
    expiresAt
  );
}

export function clearAuthToken(): void {
  localStorage.removeItem(
    AUTH_TOKEN_KEY
  );

  localStorage.removeItem(
    AUTH_EXPIRES_AT_KEY
  );

  clearLegacyAuthData();
}

export function getAuthHeaders(): Record<string, string> {
  const token = readAuthToken();

  return token
    ? {
        Authorization:
          `Bearer ${token}`
      }
    : {};
}
