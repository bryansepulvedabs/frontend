const TOKEN_KEY = 'rent-a-car:token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// fetch con el header Authorization agregado automáticamente si hay sesión.
// Los endpoints protegidos exigen el token; en los públicos (catálogo de autos) es inofensivo.
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });

  // 401 con sesión guardada = token vencido o inválido: se cierra la sesión y se vuelve al login.
  // (/api/auth/login también responde 401 con credenciales incorrectas; ahí no hay que redirigir.)
  if (res.status === 401 && token && !input.startsWith('/api/auth/')) {
    clearToken();
    window.location.assign('/login');
  }
  return res;
}

export async function parseJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.message || body.error || '';
    } catch {
      // sin cuerpo o no es JSON
    }
    throw new Error(detail || `${fallback} (HTTP ${res.status})`);
  }
  // 204 No Content no tiene cuerpo
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}