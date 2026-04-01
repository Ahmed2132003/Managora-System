import { useMutation } from "@tanstack/react-query";

export type AttendanceQrTokenResponse = {
  token: string;
  valid_from: string;
  valid_until: string;
  worksite_id: number;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("access") ||
    window.localStorage.getItem("access_token") ||
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("jwt") ||
    null
  );
}

export function useAttendanceQrGenerateMutationLocal() {
  return useMutation<AttendanceQrTokenResponse, Error, { worksite_id?: number; expires_minutes?: number }>({
    mutationFn: async (payload) => {
      const token = getAuthToken();
      const res = await fetch("/api/attendance/qr/generate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload ?? {}),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      return (await res.json()) as AttendanceQrTokenResponse;
    },
  });
}

export function getErrorDetail(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return fallback;

  const maybe = error as { response?: { data?: unknown } };
  const data = maybe.response?.data;

  if (!data) return fallback;
  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;

    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") parts.push(`${k}: ${v}`);
      else if (Array.isArray(v)) parts.push(`${k}: ${v.map(String).join(", ")}`);
    }
    if (parts.length) return parts.join(" | ");
  }

  return fallback;
}