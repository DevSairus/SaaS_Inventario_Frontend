import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../../components/layout/Layout';
import useTenantStore from '../../../store/tenantStore';
import {
  MANUAL_MODULE, MANUAL_STYLE, ROLE_STARTS,
  loadCatalog, loadSearchIndex, searchIndex, getLastRead, readingMinutes, norm,
} from './manualsMeta';

function Highlight({ text, tokens }) {
  if (!tokens?.length) return text;
  const src = norm(text);
  const spans = [];
  tokens.forEach((t) => {
    let i = src.indexOf(t);
    while (i !== -1) { if (i === 0 || !/[a-z0-9]/.test(src[i - 1])) spans.push([i, i + t.length]); i = src.indexOf(t, i + t.length); }
  });
  if (!spans.length) return text;
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]); else merged.push([...s]);
  }
  const out = [];
  let pos = 0;
  merged.forEach(([a, b], k) => {
    if (a > pos) out.push(text.slice(pos, a));
    out.push(<mark key={k} className="bg-yellow-200 dark:bg-yellow-400/30 text-inherit rounded px-0.5">{text.slice(a, b)}</mark>);
    pos = b;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}

export default function ManualsHub() {
  const navigate = useNavigate();
  const enabledModules = useTenantStore((s) => s.enabledModules);
  const [catalog, setCatalog] = useState(null);
  const [index, setIndex] = useState(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const lastRead = useMemo(() => getLastRead(), []);

  useEffect(() => { loadCatalog().then(setCatalog); }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 120);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    if (debounced && !index) loadSearchIndex().then(setIndex);
  }, [debounced, index]);
  useEffect(() => { setActive(0); }, [debounced]);

  // Atajo "/" para ir directo al buscador
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => (index && debounced ? searchIndex(index, debounced) : []), [index, debounced]);
  const names = useMemo(() => Object.fromEntries((catalog || []).map((m) => [m.slug, m])), [catalog]);

  const open = (r) => navigate(`/support/manuals/${r.m}?q=${encodeURIComponent(debounced)}#s-${r.id}`);
  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); open(results[active]); }
    if (e.key === 'Escape') { setQuery(''); }
  };

  const manuals = (catalog || []).filter((m) => m.slug !== 'guia');
  const guide = names.guia;
  const isMine = (m) => !enabledModules || enabledModules.includes(MANUAL_MODULE[m.slug]);
  const mine = manuals.filter(isMine);
  const others = manuals.filter((m) => !isMine(m));

  const Card = ({ m, dim }) => {
    const st = MANUAL_STYLE[m.slug];
    const last = lastRead[m.slug];
    return (
      <Link
        to={`/support/manuals/${m.slug}`}
        className={`group flex flex-col bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-400/50 hover:shadow-md transition ${dim ? 'opacity-75' : ''}`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${st.chip}`}>{m.num}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">{m.name}</h3>
            <p className="text-[11px] text-gray-400">v{m.version} · {readingMinutes(m.words)} min de lectura</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-4">{m.description}</p>
        <div className="mt-auto pt-3 flex items-center justify-between text-[11px]">
          <span className="text-gray-400">{m.chapters.find((c) => c.id === '4')?.sections.length || 0} pantallas</span>
          {last ? (
            <span className="text-indigo-600 dark:text-indigo-300 font-medium truncate max-w-[60%]" title={last.title}>Continuar: {last.title}</span>
          ) : (
            <span className="text-indigo-600 dark:text-indigo-300 font-medium">Leer &rarr;</span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Centro de Ayuda</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Un manual por módulo, paso a paso. Busca lo que necesitas o elige el módulo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/support/tickets" className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800">Mis tickets</Link>
            <Link to="/support/new-ticket" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Crear ticket</Link>
          </div>
        </div>

        {/* Buscador global */}
        <div className="relative mb-6">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Busca en los 9 manuales… (ej. "anular venta", "cesantías", "conteo físico")'
            aria-label="Buscar en los manuales"
            className="w-full pl-11 pr-14 py-3.5 text-sm border border-gray-300 dark:border-white/15 dark:bg-graphite-2 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          />
          <kbd className="hidden sm:block absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 border border-gray-200 dark:border-white/15 rounded px-1.5 py-0.5">/</kbd>
        </div>

        {debounced ? (
          <div className="mb-8" role="listbox" aria-label="Resultados">
            <p className="text-xs text-gray-400 mb-2">
              {!index ? 'Buscando…' : results.length ? `${results.length >= 12 ? 'Los 12 mejores resultados' : `${results.length} resultado${results.length > 1 ? 's' : ''}`} · usa ↑ ↓ y Enter` : ''}
            </p>
            {index && !results.length && (
              <div className="text-center py-10 bg-white dark:bg-graphite-2 rounded-xl border border-gray-200 dark:border-white/10">
                <p className="text-sm text-gray-600 dark:text-gray-300">No encontramos “{debounced}” en los manuales.</p>
                <p className="text-xs text-gray-400 mt-1">Prueba con otra palabra o <Link className="text-indigo-600 font-medium" to="/support/new-ticket">crea un ticket</Link>.</p>
              </div>
            )}
            <ul className="space-y-2">
              {results.map((r, i) => {
                const st = MANUAL_STYLE[r.m];
                return (
                  <li key={`${r.m}-${r.id}`}>
                    <button
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => open(r)}
                      className={`w-full text-left p-3.5 rounded-xl border transition ${i === active ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-graphite-2'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${st.chip}`}>{names[r.m]?.num ? `Manual ${names[r.m].num}` : 'Guía'}</span>
                        <span className="text-[11px] text-gray-400 truncate">{r.p}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100"><Highlight text={r.t} tokens={r.tokens} /></p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2"><Highlight text={r.snippet} tokens={r.tokens} /></p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <>
            {/* Por rol */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Empieza según tu rol</h2>
              <div className="flex flex-wrap gap-2">
                {ROLE_STARTS.map((r) => (
                  <Link
                    key={r.role}
                    to={r.to}
                    title={r.hint}
                    className="px-3 py-1.5 text-xs rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-graphite-2 text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
                  >
                    {r.role}
                  </Link>
                ))}
              </div>
            </section>

            {!catalog ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <>
                <section className="mb-8">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    {others.length ? 'Tus módulos' : 'Los manuales'}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {mine.map((m) => <Card key={m.slug} m={m} />)}
                  </div>
                </section>

                {others.length > 0 && (
                  <section className="mb-8">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Otros módulos de Pitbox</h2>
                    <p className="text-xs text-gray-400 mb-3">Aún no están activos en tu plan, pero puedes leer cómo funcionan.</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {others.map((m) => <Card key={m.slug} m={m} dim />)}
                    </div>
                  </section>
                )}

                {guide && (
                  <Link
                    to="/support/manuals/guia"
                    className="flex items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-400/40 bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">¿No sabes por dónde empezar? Lee la Guía de la serie</p>
                      <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">Qué cubre cada manual, en qué orden leerlos, cómo se conectan los módulos y el cierre mensual.</p>
                    </div>
                    <span className="text-indigo-600 dark:text-indigo-300 text-sm font-medium shrink-0">Abrir &rarr;</span>
                  </Link>
                )}
              </>
            )}
          </>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          ¿Sigues con dudas?{' '}
          <Link to="/support/new-ticket" className="text-indigo-600 dark:text-indigo-300 font-medium">Crea un ticket</Link>{' '}y nuestro equipo te ayuda.
        </div>
      </div>
    </Layout>
  );
}
