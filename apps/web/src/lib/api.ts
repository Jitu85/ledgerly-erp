export const apiUrl =
  typeof window !== "undefined"
    ? "/api/v1"
    : (process.env.NEXT_PUBLIC_API_URL ??
      process.env.API_BACKEND_URL ??
      "http://localhost:4000/api/v1");

export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = /(?:^|;\s*)erp_csrf_token=([^;]+)/.exec(document.cookie);
  const token = match?.[1];
  return token ? decodeURIComponent(token) : null;
}

export function buildHeaders(
  existingHeaders?: HeadersInit,
  method?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (existingHeaders) {
    if (existingHeaders instanceof Headers) {
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(existingHeaders)) {
      for (const [key, value] of existingHeaders) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, existingHeaders);
    }
  }
  const mutatingMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);
  if (method && mutatingMethods.has(method.toUpperCase())) {
    const csrf = getCsrfToken();
    if (csrf && !headers["x-csrf-token"]) {
      headers["x-csrf-token"] = csrf;
    }
  }
  return headers;
}

export async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${apiUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(undefined, "POST"),
    body: JSON.stringify(body),
  });
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers = buildHeaders(options.headers, method);
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status.toString()}`;
    try {
      const data = (await response.json()) as { message?: string; code?: string };
      message = data.message ?? message;
    } catch {
      if (response.status === 504 || response.status === 502) {
        message = "Server is waking up. Please try again in a moment.";
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

export async function postApi<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchApi<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteApi<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

export function safeReturnPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}
