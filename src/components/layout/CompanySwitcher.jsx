// frontend/src/components/layout/CompanySwitcher.jsx
// Cambiar de empresa sin cerrar sesión, para quien trabaja en varias
// (contadores, auxiliares). Solo aparece si la persona tiene más de una
// empresa; no aparece en modo soporte. Ver backend services/auth/identity.service.js.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../api/auth';
import { roleLabel } from '../../utils/roleLabels';

const SwitchIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M7 4L3 8l4 4" />
    <path d="M3 8h13a4 4 0 010 8h-1" />
    <path d="M17 20l4-4-4-4" />
    <path d="M21 16H8" />
  </svg>
);

// El selector está en la barra móvil y en la de escritorio, y Layout se
// monta en cada página: una sola consulta cada 5 minutos por usuario.
const CACHE_MS = 5 * 60 * 1000;
let cache = { userId: null, at: 0, promise: null };
function loadCompanies(userId) {
  if (cache.userId !== userId || !cache.promise || Date.now() - cache.at > CACHE_MS) {
    cache = {
      userId,
      at: Date.now(),
      promise: authAPI.getCompanies().then((r) => r.data || []).catch(() => []),
    };
  }
  return cache.promise;
}

export default function CompanySwitcher({ compact = false }) {
  const user = useAuthStore((s) => s.user);
  const isImpersonating = useAuthStore((s) => s.isImpersonating);
  const switchCompany = useAuthStore((s) => s.switchCompany);
  const [companies, setCompanies] = useState(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [switching, setSwitching] = useState(null);
  const ref = useRef(null);

  const eligible = !!user?.tenant_id && !isImpersonating();
  // Sesiones anteriores a esta función no traen companies_count: se consulta
  // igual una vez (respuesta liviana).
  const shouldLoad = eligible && (user.companies_count === undefined || user.companies_count > 1);

  useEffect(() => {
    if (!shouldLoad) return undefined;
    let alive = true;
    loadCompanies(user.id).then((list) => { if (alive) setCompanies(list); });
    return () => { alive = false; };
  }, [shouldLoad, user?.id]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!eligible || !companies || companies.length < 2) return null;

  const current = companies.find((c) => c.is_current);
  const list = companies.filter((c) => c.company_name.toLowerCase().includes(search.trim().toLowerCase()));

  const choose = async (c) => {
    if (c.is_current) return setOpen(false);
    setSwitching(c.tenant_id);
    const result = await switchCompany(c.tenant_id);
    if (!result.success) {
      setSwitching(null);
      toast.error(result.error, { duration: 7000 });
    }
    // Si funcionó, switchCompany ya navega a /dashboard (recarga completa).
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(''); }}
        title="Cambiar de empresa"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shadow-sm dark:border-white/10 dark:bg-graphite dark:hover:bg-white/5 dark:text-gray-300"
      >
        <SwitchIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        {!compact && <span className="max-w-[180px] truncate">{current?.company_name || user.company_name || 'Empresa'}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 dark:bg-graphite dark:border-white/10">
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide dark:text-gray-500">Cambiar de empresa</p>
          {companies.length > 6 && (
            <div className="px-2 pb-1">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empresa…"
                autoFocus
                className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-200 dark:border-white/10 dark:bg-graphite-2"
              />
            </div>
          )}
          <div className="max-h-80 overflow-y-auto">
            {list.map((c) => (
              <button
                key={c.tenant_id}
                type="button"
                disabled={!!switching}
                onClick={() => choose(c)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors dark:hover:bg-white/5 disabled:opacity-60 ${
                  c.is_current ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-sm truncate ${c.is_current ? 'font-semibold text-orange-700 dark:text-orange-300' : 'text-gray-800 dark:text-gray-200'}`}>
                    {c.company_name}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{roleLabel(c.role)}</span>
                </span>
                {switching === c.tenant_id ? (
                  <span className="text-xs text-gray-500">Cambiando…</span>
                ) : c.is_current ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0 text-orange-600"><polyline points="20 6 9 17 4 12" /></svg>
                ) : null}
              </button>
            ))}
            {list.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">Ninguna empresa coincide.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
