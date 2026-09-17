const TOKEN_KEY = 'instalog_auth_token';
const USERNAME_KEY = 'instalog_auth_username';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getUsername = () => localStorage.getItem(USERNAME_KEY);
export const setUsername = (username: string) => localStorage.setItem(USERNAME_KEY, username);
export const clearUsername = () => localStorage.removeItem(USERNAME_KEY);

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && path !== '/auth/login') {
    clearToken();
    window.dispatchEvent(new Event('instalog:unauthorized'));
    throw new ApiError(401, '인증이 만료되었습니다.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error || '요청에 실패했습니다.');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  lookupInstagramProfile: (url: string) =>
    request<{ handle: string; nickname: string; followers: string }>(
      `/instagram-profile?url=${encodeURIComponent(url)}`
    ),

  getProjects: () => request<import('./types').Project[]>('/projects'),
  createProject: (p: import('./types').Project) =>
    request<import('./types').Project>('/projects', { method: 'POST', body: JSON.stringify(p) }),
  updateProject: (p: import('./types').Project) =>
    request<import('./types').Project>(`/projects/${p.id}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),

  getLogs: () => request<import('./types').DmLog[]>('/logs'),
  createLog: (l: import('./types').DmLog) =>
    request<import('./types').DmLog>('/logs', { method: 'POST', body: JSON.stringify(l) }),
  updateLog: (l: import('./types').DmLog) =>
    request<import('./types').DmLog>(`/logs/${l.id}`, { method: 'PUT', body: JSON.stringify(l) }),
  deleteLog: (id: string) => request<void>(`/logs/${id}`, { method: 'DELETE' }),

  getWidgetSettings: () => request<import('./types').WidgetSettings | null>('/widget-settings'),
  updateWidgetSettings: (s: import('./types').WidgetSettings) =>
    request<import('./types').WidgetSettings>('/widget-settings', { method: 'PUT', body: JSON.stringify(s) }),
};
