// Metadatos de los manuales de usuario (contenido en src/content/manuals/*.json,
// generado desde los .docx de la serie de manuales).

// slug del manual -> módulo del tenant (enabledModules) que lo habilita.
export const MANUAL_MODULE = {
  contabilidad: 'accounting',
  nomina: 'payroll',
  tesoreria: 'treasury',
  cartera: 'receivables',
  ventas: 'sales',
  inventario: 'inventory',
  taller: 'workshop',
  crm: 'crm',
  ensambladora: 'ensambladora',
};

// Color de acento por manual (clases completas para que Tailwind las detecte).
export const MANUAL_STYLE = {
  contabilidad: { chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', bar: 'bg-emerald-500' },
  nomina:       { chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', bar: 'bg-violet-500' },
  tesoreria:    { chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', bar: 'bg-sky-500' },
  cartera:      { chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', bar: 'bg-amber-500' },
  ventas:       { chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', bar: 'bg-indigo-500' },
  inventario:   { chip: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', bar: 'bg-orange-500' },
  taller:       { chip: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300', bar: 'bg-red-500' },
  crm:          { chip: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', bar: 'bg-pink-500' },
  ensambladora: { chip: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300', bar: 'bg-slate-500' },
  guia:         { chip: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300', bar: 'bg-gray-500' },
};

// "Empieza según tu rol" (tomado del capítulo 4 de la Guía de la serie).
export const ROLE_STARTS = [
  { role: 'Administrador', to: '/support/manuals/ventas#s-3', hint: 'Ventas · puesta en marcha' },
  { role: 'Gerente', to: '/support/manuals/crm#s-4-1', hint: 'CRM · pipeline' },
  { role: 'Contador', to: '/support/manuals/contabilidad#s-3', hint: 'Contabilidad · puesta en marcha' },
  { role: 'Vendedor', to: '/support/manuals/ventas#s-4-1', hint: 'Ventas · clientes' },
  { role: 'Cajero', to: '/support/manuals/tesoreria#s-4-1', hint: 'Tesorería · cajas' },
  { role: 'Bodeguero', to: '/support/manuals/inventario#s-4-5', hint: 'Inventario · productos' },
  { role: 'Técnico', to: '/support/manuals/taller#s-4-2', hint: 'Taller · órdenes de trabajo' },
  { role: 'Asesor de servicio', to: '/support/manuals/taller#s-4-9', hint: 'Taller · vehículos y citas' },
  { role: 'Centro de servicio', to: '/support/manuals/ensambladora#s-3', hint: 'Ensambladora · puesta en marcha' },
];

const loaders = import.meta.glob('../../../content/manuals/*.json');

const clean = (p) => p.replace(/^.*\/([^/]+)\.json$/, '$1');
const byName = Object.fromEntries(Object.entries(loaders).map(([p, fn]) => [clean(p), fn]));

export const loadCatalog = () => byName.catalog().then((m) => m.default);
export const loadSearchIndex = () => byName['search-index']().then((m) => m.default);
export const loadManual = (slug) =>
  byName[slug] && slug !== 'catalog' && slug !== 'search-index'
    ? byName[slug]().then((m) => m.default)
    : Promise.reject(new Error('Manual no encontrado'));

export const readingMinutes = (words) => Math.max(1, Math.round((words || 0) / 200));

const LAST_KEY = 'pitbox:manuals:last';
export function getLastRead() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || '{}'); } catch { return {}; }
}
export function setLastRead(slug, id, title) {
  try {
    const all = getLastRead();
    all[slug] = { id, title, at: Date.now() };
    localStorage.setItem(LAST_KEY, JSON.stringify(all));
  } catch { /* sin storage: no pasa nada */ }
}

// Búsqueda sin acentos ni mayúsculas.
// Conserva la longitud del texto (1 carácter -> 1 carácter) para poder usar las
// posiciones sobre el texto original (snippets y resaltado).
const ACCENTS = { á: 'a', à: 'a', ä: 'a', é: 'e', è: 'e', ë: 'e', í: 'i', ì: 'i', ï: 'i', ó: 'o', ò: 'o', ö: 'o', ú: 'u', ù: 'u', ü: 'u', ñ: 'n' };
export const norm = (s) => s.toLowerCase().replace(/[áàäéèëíìïóòöúùüñ]/g, (c) => ACCENTS[c]);

export function searchIndex(index, query, limit = 12) {
  const tokens = norm(query).split(/\s+/).filter((t) => t.length > 1);
  if (!tokens.length) return [];
  const out = [];
  for (const e of index) {
    const title = norm(e.t);
    const text = e._n || (e._n = norm(e.x));
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const inTitle = title.includes(t);
      const inText = text.includes(t);
      if (!inTitle && !inText) { ok = false; break; }
      score += (inTitle ? 10 : 0) + (inText ? 1 : 0);
    }
    if (!ok) continue;
    out.push({ e, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit).map(({ e }) => {
    const text = e._n;
    const pos = text.indexOf(tokens.find((t) => text.includes(t)) || '');
    const start = Math.max(0, pos - 60);
    const raw = e.x.slice(start, start + 180);
    return { ...e, snippet: (start > 0 ? '…' : '') + raw + (start + 180 < e.x.length ? '…' : ''), tokens };
  });
}
