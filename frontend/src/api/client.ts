import { useAuthStore } from "../store/auth.store";
import { ApiError } from "../utils/api-error";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
};

type ErrorBody = {
  message?: string;
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
    refreshRequest = fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
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
  const { method = "GET", body, auth = true, retry = true } = options;
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth && retry) {
    const accessToken = await refreshAccessToken();
    if (accessToken) {
      return apiRequest<T>(path, { method, body, auth, retry: false });
    }
    useAuthStore.getState().clearSession();
  }

  const payload = await readBody(response);

  if (!response.ok) {
    throw new ApiError(payload.message || "Something went wrong", response.status);
  }

  return payload as T;
}
