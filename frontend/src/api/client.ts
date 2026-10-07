import { useAuthStore } from "../store/auth.store";
import { ApiError } from "../utils/api-error";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const API_ORIGIN = API_BASE_URL.startsWith("http") ? API_BASE_URL.replace(/\/api\/v1\/?$/, "") : "";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
  signal?: AbortSignal;
};

type ErrorBody = {
  message?: string;
  error?: { message?: string; details?: unknown };
  details?: unknown;
};

let refreshRequest: Promise<string | null> | null = null;

async function readBody(response: Response): Promise<ErrorBody> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as ErrorBody;
  } catch {
    return { message: text };
  }
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_ORIGIN}/api/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { accessToken?: string };
        if (!data.accessToken) return null;
        useAuthStore.getState().setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retry = true, signal } = options;
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const url = path.startsWith("/api/v1") ? `${API_BASE_URL.replace(/\/$/, "")}${path.slice(7)}` : `${API_ORIGIN}${path}`;
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (response.status === 401 && auth && retry) {
    const accessToken = await refreshAccessToken();
    if (accessToken) {
      return apiRequest<T>(path, { method, body, auth, retry: false, signal });
    }
    useAuthStore.getState().clearSession();
  }

  const payload = await readBody(response);

  if (!response.ok) {
    throw new ApiError(payload.error?.message || payload.message || "Something went wrong", response.status, payload.error?.details ?? payload.details);
  }

  return payload as T;
}
