import { auth } from "./firebase";
import { API_CONFIG } from "./constants";

// Wrapper à volta de fetch que junta automaticamente o token de autenticação
// Firebase (Authorization: Bearer <token>) a todos os pedidos ao backend.
export async function apiFetch(path, options = {}) {
  const { headers, body, ...rest } = options;
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

  const finalHeaders = {
    ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const url = /^https?:\/\//.test(path) ? path : `${API_CONFIG.BASE_URL}${path}`;

  return fetch(url, { ...rest, body, headers: finalHeaders });
}
