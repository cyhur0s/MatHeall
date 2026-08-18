const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const defaultBackend = new URL("backend/", `${window.location.origin}${import.meta.env.BASE_URL}`).href;
const defaultAiApi = new URL("api/", `${window.location.origin}${import.meta.env.BASE_URL}`).href;

export const API_BASE = trimTrailingSlash(import.meta.env.VITE_API_BASE || defaultBackend);
export const AI_API_BASE = trimTrailingSlash(import.meta.env.VITE_AI_API_BASE || defaultAiApi);

export const apiUrl = (path = "") => `${API_BASE}/${String(path).replace(/^\/+/, "")}`;
export const aiUrl = (path = "") => `${AI_API_BASE}/${String(path).replace(/^\/+/, "")}`;

export async function aiFetch(path, options = {}) {
  const token = localStorage.getItem("auth_token") || "";
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(aiUrl(path), { ...options, headers });
  if (response.status === 401 && token) {
    clearAuthSession();
    if (!window.location.pathname.endsWith("/login")) {
      window.location.assign(new URL("login", `${window.location.origin}${import.meta.env.BASE_URL}`).href);
    }
  }
  return response;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("auth_token") || "";
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(apiUrl(path), { ...options, headers });
  if (response.status === 401 && token) {
    clearAuthSession();
    if (!window.location.pathname.endsWith("/login")) {
      window.location.assign(new URL("login", `${window.location.origin}${import.meta.env.BASE_URL}`).href);
    }
  }
  return response;
}

export function clearAuthSession() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
}
