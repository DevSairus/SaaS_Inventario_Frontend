export const STORAGE_KEYS = Object.freeze({
  TOKEN: 'token',
  USER: 'user',
  ACTIVE_BRANCH: 'active_branch_id',
});

// Slot para la sesión del superadmin mientras impersona a un usuario de un
// tenant (soporte/seguimiento) — en sessionStorage, no localStorage, para no
// sobrevivir sin querer entre reinicios del navegador.
const IMPERSONATOR_KEYS = Object.freeze({
  TOKEN: 'impersonator_token',
  USER: 'impersonator_user',
});

export function getStoredBranchId() {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_BRANCH) || null;
  } catch {
    return null;
  }
}

export function setStoredBranchId(branchId) {
  try {
    if (branchId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH, branchId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_BRANCH);
    }
  } catch {
    /* noop */
  }
}

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
  setStoredBranchId(null);
}

export function getImpersonatorSession() {
  try {
    const token = sessionStorage.getItem(IMPERSONATOR_KEYS.TOKEN);
    const rawUser = sessionStorage.getItem(IMPERSONATOR_KEYS.USER);
    if (!token || !rawUser) return null;
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return null;
  }
}

export function setImpersonatorSession(token, user) {
  try {
    sessionStorage.setItem(IMPERSONATOR_KEYS.TOKEN, token);
    sessionStorage.setItem(IMPERSONATOR_KEYS.USER, JSON.stringify(user));
  } catch {
    /* noop */
  }
}

export function clearImpersonatorSession() {
  try {
    sessionStorage.removeItem(IMPERSONATOR_KEYS.TOKEN);
    sessionStorage.removeItem(IMPERSONATOR_KEYS.USER);
  } catch {
    /* noop */
  }
}

export function decodeJwtPayload(token) {
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
