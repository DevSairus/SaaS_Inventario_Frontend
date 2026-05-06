const REQUIRED_ENV_VARS = ['VITE_API_URL'];

export function assertEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = import.meta.env[key];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    const msg = `Faltan variables de entorno requeridas: ${missing.join(
      ', '
    )}. Crea un archivo .env en la raíz del proyecto (revisa .env.example).`;

    if (typeof document !== 'undefined') {
      document.body.innerHTML = `
        <div style="padding:24px;font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:40px auto;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:12px;">
          <h1 style="margin:0 0 8px;font-size:18px;">Configuración incompleta</h1>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.5;">${msg}</p>
        </div>`;
    }
    throw new Error(msg);
  }
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL;
}

export function getServerOrigin() {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) return '';
  try {
    const url = new URL(apiUrl, window.location.origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return String(apiUrl).replace(/\/?api\/?$/, '');
  }
}
