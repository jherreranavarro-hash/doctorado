export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Token CSRF en memoria (nunca localStorage/sessionStorage): apps/web y
// apps/api están en dominios distintos en producción, así que una cookie de
// doble-submit no funciona. El servidor entrega este token en el body de
// login/refresh/me — ver CsrfService en apps/api.
let csrfToken: string | undefined;

export function setCsrfToken(token: string | undefined): void {
  csrfToken = token;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const AUTH_BOOTSTRAP_PATHS = new Set(["/auth/refresh", "/auth/login"]);

function buildHeaders(options: RequestInit): Headers {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!SAFE_METHODS.has(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  return headers;
}

function rawFetch(path: string, options: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method: (options.method ?? "GET").toUpperCase(),
    headers: buildHeaders(options),
    credentials: "include",
  });
}

// Deduplicada: si varias solicitudes reciben 401 al mismo tiempo, todas
// esperan el mismo intento de refresh (dos refresh simultáneos con el mismo
// refresh token harían que el backend detecte reuso y revoque la sesión).
let refreshPromise: Promise<boolean> | null = null;

function ensureFreshSession(): Promise<boolean> {
  refreshPromise ??= rawFetch("/auth/refresh", { method: "POST" })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = (await res.json()) as { csrfToken: string };
      setCsrfToken(body.csrfToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function fetchWithSessionRefresh(path: string, options: RequestInit): Promise<Response> {
  const response = await rawFetch(path, options);
  if (response.status !== 401 || AUTH_BOOTSTRAP_PATHS.has(path)) {
    return response;
  }
  const refreshed = await ensureFreshSession();
  if (!refreshed) return response;
  return rawFetch(path, options);
}

/**
 * Cliente HTTP hacia apps/api. Llama directo desde el navegador (no vía
 * proxy de Next) para que las cookies httpOnly de sesión viajen
 * automáticamente; agrega el header CSRF en cualquier método que mute
 * estado.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchWithSessionRefresh(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : undefined;

  if (!response.ok) {
    const message = (body as { message?: string } | undefined)?.message ?? response.statusText;
    throw new ApiError(response.status, message);
  }

  return body as T;
}

/** Igual que apiFetch (mismas cookies/CSRF/refresh), pero para descargas
 * binarias (ej. plantillas/entregas de tareas en doctoral-assignments). */
export async function apiFetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const response = await fetchWithSessionRefresh(path, options);

  if (!response.ok) {
    let message = response.statusText;
    if (response.headers.get("content-type")?.includes("application/json")) {
      const body = (await response.json()) as { message?: string };
      message = body.message ?? message;
    }
    throw new ApiError(response.status, message);
  }

  return response.blob();
}
