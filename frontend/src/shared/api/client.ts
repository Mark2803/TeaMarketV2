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
      if (
        value === undefined
        || value === null
      ) {
        continue;
      }

      url.searchParams.set(
        key,
        String(value)
      );
    }
  }

  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    query,
    headers,
    ...requestOptions
  } = options;

  const response =
    await fetch(
      buildUrl(
        path,
        query
      ),
      {
        ...requestOptions,

        headers: {
          "Content-Type":
            "application/json",

          ...headers
        }
      }
    );

  if (!response.ok) {
    const errorBody =
      await response
        .json()
        .catch(
          () => null
        );

    const message =
      errorBody?.error?.message
      ?? `Ошибка API: ${response.status}`;

    throw new Error(
      message
    );
  }

  return response.json() as Promise<T>;
}