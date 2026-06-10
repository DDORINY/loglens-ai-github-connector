import { clearAuth } from "@/lib/auth";
import type { ApiResponse } from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const payload = data as { detail?: unknown; message?: unknown };
    const detail = payload.detail;

    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: unknown } | undefined;
      if (typeof first?.msg === "string") return first.msg;
      return JSON.stringify(detail);
    }
    if (typeof payload.message === "string") return payload.message;
  }

  return `API 요청에 실패했습니다. (${status})`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window === "undefined"
    ? null
    : window.localStorage.getItem("loglens_access_token");

  const headers = new Headers(options.headers);

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!headers.has("Content-Type") && options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearAuth();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    throw new Error(errorMessage(data, response.status));
  }

  if (!data || typeof data !== "object") {
    throw new Error("서버 응답 형식이 올바르지 않습니다.");
  }

  return data as ApiResponse<T>;
}

export type { ApiResponse };
