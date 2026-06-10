import type { AuthUser, LoginData } from "@/types/api";

const TOKEN_KEY = "loglens_access_token";
const USER_KEY = "loglens_user";

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function saveAuth(data: LoginData): void {
  storage()?.setItem(TOKEN_KEY, data.access_token);
  storage()?.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth(): void {
  storage()?.removeItem(TOKEN_KEY);
  storage()?.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function getStoredUser(): AuthUser | null {
  const value = storage()?.getItem(USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    storage()?.removeItem(USER_KEY);
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export type { AuthUser, LoginData };
