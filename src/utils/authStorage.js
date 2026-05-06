export const STORAGE_KEYS = Object.freeze({
  TOKEN: 'token',
  USER: 'user',
});

export function getStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  } catch {
    /* noop */
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  } catch {
    /* noop */
  }
}

export function clearAuthStorage() {
  setStoredToken(null);
  setStoredUser(null);
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export function isTokenExpired(token, skewSeconds = 0) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSec + skewSeconds;
}
