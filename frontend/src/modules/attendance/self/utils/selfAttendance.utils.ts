import axios from "axios";

export function getTodayValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function getTimeLabel(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string") return data;

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;

      if (typeof obj.detail === "string") return obj.detail;

      return Object.entries(obj)
        .map(([key, value]) => {
          if (Array.isArray(value)) return `${key}: ${value.map(String).join(", ")}`;
          return `${key}: ${String(value)}`;
        })
        .join(" | ");
    }

    const status = error.response?.status;
    return status ? `HTTP ${status}` : error.message;
  }

  return String(error);
}

export function getErrorDetail(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const emailConfig = obj.email_config;
      if (Array.isArray(emailConfig) && emailConfig.length > 0) {
        return String(emailConfig[0]);
      }
      if (typeof emailConfig === "string") {
        return emailConfig;
      }
      const detail = obj.detail ?? obj.otp ?? obj.code;
      if (typeof detail === "string" || typeof detail === "number") {
        return String(detail);
      }
    }
  }
  return formatApiError(error);
}

export function getGeo(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}