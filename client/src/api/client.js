const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const TOKEN_KEY = 'sd_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const FALLBACK_MESSAGES = {
  401: 'Please log in again.',
  403: "You're not allowed to do that.",
  404: 'Not found.',
  429: 'Too many requests. Please wait a minute and try again.',
  500: 'Something went wrong on our side. Please try again.',
};

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message ?? FALLBACK_MESSAGES[status] ?? 'Something went wrong. Please try again.');
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
  }
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event('sd:unauthorized'));
    throw new ApiError(res.status, data);
  }
  return data;
}
