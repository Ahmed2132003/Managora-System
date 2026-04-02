import axios from "axios";

export function normalizeDateForApi(rawDate: string) {
  if (!rawDate) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate;
  }
  return parsed.toISOString().split("T")[0];
}

function flattenValidationErrors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenValidationErrors(item));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([field, fieldValue]) => {
      const fieldMessages = flattenValidationErrors(fieldValue);
      return fieldMessages.map((message) => `${field}: ${message}`);
    });
  }
  if (value == null) {
    return [];
  }
  return [String(value)];
}

export function formatApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const backendData = error.response?.data;
    const messages = flattenValidationErrors(backendData);
    if (messages.length > 0) {
      return messages.join("\n");
    }
    if (backendData && typeof backendData === "object") {
      return JSON.stringify(backendData);
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}