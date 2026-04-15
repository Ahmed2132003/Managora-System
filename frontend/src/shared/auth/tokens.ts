const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";
const USER_ROLE_KEY = "auth.userRole";

type Tokens = {
  access: string;
  refresh: string;
};

export function setTokens(tokens: Tokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function setStoredRole(role: string) {
  localStorage.setItem(USER_ROLE_KEY, role);
}

export function getStoredRole() {
  return localStorage.getItem(USER_ROLE_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

export function setAccessToken(access: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
}