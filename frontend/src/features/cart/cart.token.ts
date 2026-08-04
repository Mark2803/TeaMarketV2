const GUEST_TOKEN_KEY =
  "tea-market-guest-token";

function createGuestToken(): string {
  return crypto.randomUUID();
}

export function getGuestCartToken(): string {
  const existingToken =
    localStorage.getItem(
      GUEST_TOKEN_KEY
    );

  if (existingToken) {
    return existingToken;
  }

  const token =
    createGuestToken();

  localStorage.setItem(
    GUEST_TOKEN_KEY,
    token
  );

  return token;
}

/**
 * Создаёт новый анонимный идентификатор корзины.
 * Используется после успешного слияния и после выхода.
 */
export function rotateGuestCartToken(): string {
  const token =
    createGuestToken();

  localStorage.setItem(
    GUEST_TOKEN_KEY,
    token
  );

  return token;
}
