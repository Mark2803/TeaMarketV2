const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    "Не задана переменная VITE_API_BASE_URL"
  );
}

type ApiRequestOptions =
  RequestInit & {
    query?: Record<
      string,
      string
      | number
      | boolean
      | null
      | undefined
    >;
  };

function buildUrl(
  path: string,
  query?: ApiRequestOptions["query"]
): string {
  const url =
    new URL(
      `${API_BASE_URL.replace(/\/$/, "")}${path}`,
      window.location.origin
    );

  if (query) {
    for (
      const [key, value]
      of Object.entries(query)
    ) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

const csrfExempt = new Set([
  "/moderator/login",
  "/moderator/password-reset/request",
  "/moderator/password-reset/confirm"
]);

async function getCsrfToken(): Promise<string> {
  const response = await fetch(buildUrl("/moderator/csrf"), {
    credentials: "include",
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Не удалось подтвердить административную сессию");
  const body = await response.json() as { token: string };
  return body.token;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { query, headers, ...requestOptions } = options;
  const method = (requestOptions.method || "GET").toUpperCase();
  const requestHeaders = new Headers(headers);
  if (!(requestOptions.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (
    path.startsWith("/moderator/") &&
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    !csrfExempt.has(path)
  ) {
    requestHeaders.set("X-CSRF-Token", await getCsrfToken());
  }

  const response = await fetch(buildUrl(path, query), {
    ...requestOptions,
    credentials: requestOptions.credentials ?? "include",
    headers: requestHeaders
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error?.message ?? `Ошибка API: ${response.status}`;
    throw new Error(message);
  }
  // Successful DELETE endpoints may return 204 No Content.
  // Do not attempt to parse an empty response body as JSON.
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }
  const body = await response.text();
  if (!body.trim()) {
    return undefined as T;
  }
  return JSON.parse(body) as T;
}
