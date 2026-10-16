import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../../components/layout/Layout';
import {
  MANUAL_STYLE, loadCatalog, loadManual, readingMinutes, setLastRead, norm,
} from './manualsMeta';
import './manuals.css';

/* ───────────── Cuerpo del manual (memo: no se re-renderiza al buscar/scroll) ───────────── */
const ManualBody = memo(function ManualBody({ manual, onCopyLink }) {
  const AnchorBtn = ({ id }) => (
    <button
      type="button"
      onClick={() => onCopyLink(id)}
      title="Copiar enlace a esta sección"
      aria-label="Copiar enlace a esta sección"
      className="ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-300 hover:text-indigo-500 transition-opacity text-base align-middle"
    >
      #
    </button>
  );
  return (
    <div className="manual-prose">
      {manual.chapters.map((c) => (
        <section key={c.id} className="mb-12">
          <h2
            id={`s-${c.id}`}
            data-spy
            className="manual-anchor group text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 pb-2 mb-4 border-b border-gray-200 dark:border-white/10"
          >
            {c.num && <span className="text-indigo-500 mr-2">{c.num}.</span>}
            {c.title}
            <AnchorBtn id={`s-${c.id}`} />
          </h2>
          {c.html && <div dangerouslySetInnerHTML={{ __html: c.html }} />}
          {c.sections.map((s) => (
            <div key={s.id} className="mt-8">
              <h3
                id={`s-${s.id}`}
                data-spy
                className="manual-anchor group text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
              >
                {s.num && /^\d/.test(s.num) && <span className="text-indigo-500 mr-2 font-mono text-base">{s.num}</span>}
                {s.title}
                <AnchorBtn id={`s-${s.id}`} />
              </h3>
              <div dangerouslySetInnerHTML={{ __html: s.html }} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
});

/* ───────────── Tabla de contenido ───────────── */
function Toc({ manual, activeId, onGo }) {
  const chapterOf = useMemo(() => {
    const map = {};
    manual.chapters.forEach((c) => {
      map[`s-${c.id}`] = c.id;
      c.sections.forEach((s) => { map[`s-${s.id}`] = c.id; });
    });
    return map;
  }, [manual]);
  const activeChapter = chapterOf[activeId];
  return (
    <nav aria-label="Contenido del manual" className="text-sm">
      <ul className="space-y-0.5">
        {manual.chapters.map((c) => {
          const open = activeChapter === c.id;
          const chActive = activeId === `s-${c.id}`;
          return (
            <li key={c.id}>
              <button
                onClick={() => onGo(`s-${c.id}`)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition ${chActive ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 font-semibold' : open ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
              >
                {c.num && <span className="text-[11px] font-mono text-gray-400 w-4 shrink-0">{c.num}</span>}
                <span className="truncate">{c.title}</span>
              </button>
              {open && c.sections.length > 0 && (
                <ul className="mt-0.5 mb-1.5 ml-4 pl-2 border-l border-gray-200 dark:border-white/10 space-y-0.5">
                  {c.sections.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => onGo(`s-${s.id}`)}
                        className={`w-full text-left px-2 py-1 rounded-md text-[13px] leading-snug transition ${activeId === `s-${s.id}` ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                      >
                        {/^\d/.test(s.num) && <span className="font-mono text-[11px] text-gray-400 mr-1.5">{s.num}</span>}
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ───────────── Resaltado de búsqueda dentro del manual ───────────── */
function clearMarks(root) {
  root.querySelectorAll('mark.manual-hit').forEach((m) => {
    const parent = m.parentNode;
    parent.replaceChild(document.createTextNode(m.textContent), m);
    parent.normalize();
  });
}
function applyMarks(root, query) {
  const tokens = norm(query).split(/\s+/).filter((t) => t.length > 1);
  if (!tokens.length) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const marks = [];
  nodes.forEach((node) => {
    const text = node.nodeValue;
    const n = norm(text);
    const spans = [];
    tokens.forEach((t) => {
      let i = n.indexOf(t);
      while (i !== -1) {
        if (i === 0 || !/[a-z0-9]/.test(n[i - 1])) spans.push([i, i + t.length]);
        i = n.indexOf(t, i + t.length);
      }
    });
    if (!spans.length) return;
    spans.sort((a, b) => a[0] - b[0]);
    const merged = [];
    spans.forEach((s) => {
      const last = merged[merged.length - 1];
      if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]); else merged.push([...s]);
    });
    const frag = document.createDocumentFragment();
    let pos = 0;
    merged.forEach(([a, b]) => {
      if (a > pos) frag.appendChild(document.createTextNode(text.slice(pos, a)));
      const m = document.createElement('mark');
      m.className = 'manual-hit';
      m.textContent = text.slice(a, b);
      frag.appendChild(m);
      marks.push(m);
      pos = b;
    });
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  });
  return marks;
}

/* ───────────── Página ───────────── */
export default function ManualReader() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [manual, setManual] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [progress, setProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [find, setFind] = useState('');
  const [hits, setHits] = useState(0);
  const [cur, setCur] = useState(0);
  const contentRef = useRef(null);
  const marksRef = useRef([]);

  const urlQ = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);

  // Carga del manual (y catálogo para anterior/siguiente)
  useEffect(() => {
    setManual(null); setError(false); setActiveId(''); setCur(0); setHits(0);
    loadManual(slug).then(setManual).catch(() => setError(true));
    loadCatalog().then(setCatalog).catch(() => {});
  }, [slug]);

  useEffect(() => { setFind(urlQ); }, [urlQ, slug]);

  useEffect(() => {
    if (manual) document.title = `${manual.title} · Manuales Pitbox`;
    return () => { document.title = 'Pitbox'; };
  }, [manual]);

  // Salto a la sección del hash (también cuando cambia con los enlaces internos)
  useEffect(() => {
    if (!manual) return;
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!id) { window.scrollTo({ top: 0 }); return; }
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveId(id); }
    }, 60);
    return () => clearTimeout(t);
  }, [manual, location.hash, slug]);

  // Resaltado + navegación entre coincidencias
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !manual) return;
    clearMarks(root);
    marksRef.current = [];
    const q = find.trim();
    if (q.length < 2) { setHits(0); setCur(0); return; }
    const t = setTimeout(() => {
      clearMarks(root);
      marksRef.current = applyMarks(root, q);
      setHits(marksRef.current.length);
      setCur(0);
      if (marksRef.current[0] && !location.hash) {
        marksRef.current[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 200);
    return () => { clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [find, manual]);

  useEffect(() => {
    marksRef.current.forEach((m, i) => m.classList.toggle('is-current', i === cur));
  }, [cur, hits]);

  const gotoHit = (dir) => {
    if (!marksRef.current.length) return;
    const next = (cur + dir + marksRef.current.length) % marksRef.current.length;
    setCur(next);
    marksRef.current[next].scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  // Scrollspy + barra de progreso
  useEffect(() => {
    if (!manual) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const heads = contentRef.current?.querySelectorAll('[data-spy]') || [];
        let current = '';
        heads.forEach((h) => { if (h.getBoundingClientRect().top <= 140) current = h.id; });
        if (current) setActiveId((prev) => (prev === current ? prev : current));
        const el = contentRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          const total = r.height - window.innerHeight * 0.6;
          setProgress(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [manual]);

  // "Continuar leyendo": recuerda la última sección vista
  useEffect(() => {
    if (!manual || !activeId || slug === 'guia') return;
    const t = setTimeout(() => {
      const el = document.getElementById(activeId);
      if (el) setLastRead(slug, activeId.replace(/^s-/, ''), el.textContent.replace(/#$/, '').trim());
    }, 1200);
    return () => clearTimeout(t);
  }, [activeId, manual, slug]);

  const goTo = useCallback((id) => {
    setTocOpen(false);
    navigate({ pathname: location.pathname, search: location.search, hash: `#${id}` }, { replace: true });
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveId(id); }
  }, [navigate, location.pathname, location.search]);

  const copyLink = useCallback((id) => {
    const url = `${window.location.origin}/support/manuals/${slug}#${id}`;
    navigator.clipboard?.writeText(url).then(() => toast.success('Enlace copiado'), () => {});
  }, [slug]);

  // Referencias cruzadas ("Manual 5 — Ventas, capítulo 4.3") sin recargar la app
  const onContentClick = (e) => {
    const a = e.target.closest?.('a.xref');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    const [path, hash] = href.split('#');
    if (path === location.pathname) { goTo(hash); return; }
    navigate(hash ? `${path}#${hash}` : path);
  };

  // Atajos: Ctrl/Cmd+F no se secuestra; "/" enfoca el buscador del manual
  const findRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault(); findRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const neighbors = useMemo(() => {
    if (!catalog) return {};
    const list = catalog.filter((m) => m.slug !== 'guia');
    const i = list.findIndex((m) => m.slug === slug);
    return i === -1 ? {} : { prev: list[i - 1], next: list[i + 1] };
  }, [catalog, slug]);

  if (error) {
    return (
      <Layout>
        <div className="p-10 text-center">
          <p className="text-gray-600 dark:text-gray-300">No encontramos ese manual.</p>
          <Link to="/support/manuals" className="text-indigo-600 text-sm font-medium">Volver a los manuales</Link>
        </div>
      </Layout>
    );
  }

  const st = MANUAL_STYLE[slug] || MANUAL_STYLE.guia;
  const words = catalog?.find((m) => m.slug === slug)?.words;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Barra superior: migas, búsqueda en el manual, progreso */}
        <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-5 bg-white/90 dark:bg-[#17181C]/90 backdrop-blur border-b border-gray-200 dark:border-white/10 rounded-t-2xl">
          <div className="px-4 sm:px-6 py-2.5 flex items-center gap-3">
            <button
              onClick={() => setTocOpen(true)}
              className="lg:hidden shrink-0 px-2.5 py-1.5 text-xs font-medium border border-gray-300 dark:border-white/15 rounded-lg text-gray-700 dark:text-gray-200"
              aria-label="Abrir contenido del manual"
            >
              ☰ Contenido
            </button>
            <nav className="hidden sm:flex items-center text-xs text-gray-400 min-w-0">
              <Link to="/support/manuals" className="hover:text-indigo-600 shrink-0">Centro de Ayuda</Link>
              <span className="mx-1.5">/</span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{manual?.name || '…'}</span>
            </nav>
            <div className="ml-auto flex items-center gap-1.5 min-w-0 flex-1 sm:flex-none justify-end">
              <div className="relative flex-1 sm:flex-none min-w-0">
                <input
                  ref={findRef}
                  value={find}
                  onChange={(e) => setFind(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); gotoHit(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') setFind(''); }}
                  placeholder="Buscar en este manual"
                  aria-label="Buscar en este manual"
                  className="w-full sm:w-56 pl-3 pr-14 py-1.5 text-xs border border-gray-300 dark:border-white/15 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {find.trim().length >= 2 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 tabular-nums">
                    {hits ? `${cur + 1}/${hits}` : '0'}
                  </span>
                )}
              </div>
              <button onClick={() => gotoHit(-1)} disabled={!hits} aria-label="Coincidencia anterior" className="p-1.5 text-gray-500 hover:text-indigo-600 disabled:opacity-30">▲</button>
              <button onClick={() => gotoHit(1)} disabled={!hits} aria-label="Coincidencia siguiente" className="p-1.5 text-gray-500 hover:text-indigo-600 disabled:opacity-30">▼</button>
            </div>
          </div>
          <div className="h-0.5 bg-transparent">
            <div className={`h-full ${st.bar} transition-[width] duration-150`} style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {!manual ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            {/* TOC escritorio */}
            <aside className="hidden lg:block w-64 shrink-0 sticky top-[7.5rem] max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-2.5">Contenido</p>
              <Toc manual={manual} activeId={activeId} onGo={goTo} />
              <div className="mt-5 mx-2.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-xs text-indigo-900 dark:text-indigo-200">
                ¿No encuentras la respuesta?
                <Link to="/support/new-ticket" className="block mt-1 font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">Crear un ticket →</Link>
              </div>
            </aside>

            {/* Lectura */}
            <article className="min-w-0 flex-1 max-w-3xl" onClick={onContentClick}>
              <header className="mb-8">
                <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${st.chip}`}>
                  {manual.num ? `Manual ${manual.num} de la serie` : 'Guía de la serie'}
                </span>
                <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{manual.title}</h1>
                <p className="mt-2 text-gray-500 dark:text-gray-400 leading-relaxed">{manual.description}</p>
                <p className="mt-3 text-xs text-gray-400">
                  Versión {manual.version} · {manual.date}{words ? ` · ${readingMinutes(words)} min de lectura` : ''}
                </p>
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 leading-relaxed">
                  <strong className="text-gray-700 dark:text-gray-200">Cómo leerlo:</strong> el <strong className="text-gray-700 dark:text-gray-200">texto en negrita</strong> es exactamente lo que ves en pantalla (botones, campos, mensajes).
                  Los recuadros <span className="text-amber-700 dark:text-amber-400 font-semibold">Importante</span> y <span className="text-blue-700 dark:text-blue-300 font-semibold">Nota</span> avisan de reglas que evitan errores.
                </div>
              </header>

              <div ref={contentRef}>
                <ManualBody manual={manual} onCopyLink={copyLink} />
              </div>

              {/* Siguiente / anterior */}
              <div className="mt-10 pt-6 border-t border-gray-200 dark:border-white/10 grid sm:grid-cols-2 gap-3">
                {neighbors.prev ? (
                  <Link to={`/support/manuals/${neighbors.prev.slug}`} className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-indigo-300 transition">
                    <span className="text-[11px] text-gray-400">← Manual anterior</span>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{neighbors.prev.num}. {neighbors.prev.name}</span>
                  </Link>
                ) : <span />}
                {neighbors.next && (
                  <Link to={`/support/manuals/${neighbors.next.slug}`} className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-indigo-300 transition text-right">
                    <span className="text-[11px] text-gray-400">Manual siguiente →</span>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{neighbors.next.num}. {neighbors.next.name}</span>
                  </Link>
                )}
              </div>
              <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-indigo-900 dark:text-indigo-200">¿Algo no se ve como en el manual o no encuentras tu caso?</p>
                <Link to="/support/new-ticket" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Crear ticket</Link>
              </div>
            </article>
          </div>
        )}

        {/* TOC móvil */}
        {tocOpen && manual && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Contenido del manual">
            <div className="absolute inset-0 bg-black/40" onClick={() => setTocOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white dark:bg-graphite p-4 overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{manual.name}</p>
                <button onClick={() => setTocOpen(false)} aria-label="Cerrar" className="p-1 text-gray-500 text-lg leading-none">✕</button>
              </div>
              <Toc manual={manual} activeId={activeId} onGo={goTo} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
