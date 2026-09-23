import { Profile, DEFAULT_PROFILES, PROFILE_COLOR_PALETTE, AVATAR_POOL } from './constants';

const TOKEN_KEY = 'instalog_auth_token';
const USERNAME_KEY = 'instalog_auth_username';
const PROFILE_KEY = 'instalog_profile_name';
const PROFILES_KEY = 'instalog_profiles';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getUsername = () => localStorage.getItem(USERNAME_KEY);
export const setUsername = (username: string) => localStorage.setItem(USERNAME_KEY, username);
export const clearUsername = () => localStorage.removeItem(USERNAME_KEY);

export const getProfileName = () => localStorage.getItem(PROFILE_KEY);
export const setProfileName = (name: string) => {
  localStorage.setItem(PROFILE_KEY, name);
  // Lets the Chrome extension (app_bridge.js) pick up a profile switch immediately,
  // instead of waiting for its next login/recording-toggle sync.
  window.postMessage({ source: 'instalog-app', type: 'INSTALOG_PROFILE_CHANGED', profileName: name }, window.location.origin);
};
export const clearProfileName = () => {
  localStorage.removeItem(PROFILE_KEY);
  // Same reason as setProfileName's broadcast: without this, an extension that already cached
  // a profile name keeps tagging new logs with it after logout/profile-delete in this SPA
  // (no page reload happens to re-sync it otherwise).
  window.postMessage({ source: 'instalog-app', type: 'INSTALOG_PROFILE_CHANGED', profileName: '' }, window.location.origin);
};

export const getProfiles = (): Profile[] => {
  try {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore malformed/inaccessible storage
  }
  return DEFAULT_PROFILES;
};

export const addProfile = (name: string): Profile => {
  const profiles = getProfiles();
  const color = PROFILE_COLOR_PALETTE[profiles.length % PROFILE_COLOR_PALETTE.length];

  // Avoid repeating an avatar another profile already has, as long as one is still free.
  const usedAvatars = new Set(profiles.map((p) => p.avatar).filter(Boolean));
  const freeAvatars = AVATAR_POOL.filter((a) => !usedAvatars.has(a));
  const avatarPool = freeAvatars.length > 0 ? freeAvatars : AVATAR_POOL;
  const avatar = avatarPool[Math.floor(Math.random() * avatarPool.length)];

  const profile: Profile = { name, color, avatar };
  localStorage.setItem(PROFILES_KEY, JSON.stringify([...profiles, profile]));
  return profile;
};

// Only removes the profile from the picker/switcher list. Logs already tagged with its name
// keep that name (they store a plain profileName string, not a reference) — and if a profile
// with the same name is added again later, those logs line back up with it automatically.
export const deleteProfile = (name: string) => {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(getProfiles().filter((p) => p.name !== name)));
};


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
