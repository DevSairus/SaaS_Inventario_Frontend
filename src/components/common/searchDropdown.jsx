import { useState, useEffect, useLayoutEffect, useRef, useCallback, forwardRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Primitivas compartidas por los buscadores (Combobox, CustomerSearchInput,
 * ProductSearchInput, etc.):
 *  - normalizeSearch / matchesSearch: búsqueda sin tildes ni mayúsculas
 *  - HighlightMatch: resalta el texto buscado dentro de una opción
 *  - useListNavigation: flechas / Enter / Escape con scroll al elemento activo
 *  - FloatingPanel: dropdown en portal (no se recorta dentro de modales ni
 *    tarjetas con overflow) que se abre hacia arriba si no hay espacio abajo
 */

const stripChar = (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const normalizeSearch = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** true si todas las palabras de `query` aparecen en alguno de los campos */
export const matchesSearch = (query, ...fields) => {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields.map(normalizeSearch).join(' ');
  return words.every(w => haystack.includes(w));
};

export function HighlightMatch({ text, query, className = '' }) {
  const str = String(text ?? '');
  const words = normalizeSearch(query).split(/\s+/).filter(w => w.length > 0);
  if (!str || !words.length) return <>{str}</>;

  // Texto normalizado carácter a carácter para mantener los índices alineados
  const chars = Array.from(str);
  const norm = chars.map(c => stripChar(c).charAt(0) || c.toLowerCase());
  const normStr = norm.join('');
  const marks = new Array(chars.length).fill(false);
  for (const w of words) {
    let from = 0;
    let idx;
    while ((idx = normStr.indexOf(w, from)) !== -1) {
      for (let i = idx; i < idx + w.length && i < marks.length; i++) marks[i] = true;
      from = idx + w.length;
    }
  }
  if (!marks.some(Boolean)) return <>{str}</>;

  const parts = [];
  let buf = '';
  let cur = marks[0];
  chars.forEach((c, i) => {
    if (marks[i] !== cur) {
      parts.push({ text: buf, hit: cur });
      buf = '';
      cur = marks[i];
    }
    buf += c;
  });
  parts.push({ text: buf, hit: cur });

  return (
    <>
      {parts.map((p, i) => p.hit
        ? <mark key={i} className={`bg-yellow-100 dark:bg-yellow-500/25 text-inherit rounded-sm px-0 ${className}`}>{p.text}</mark>
        : <span key={i}>{p.text}</span>)}
    </>
  );
}

/**
 * Navegación por teclado sobre una lista.
 * Las opciones deben renderizarse con `data-index={i}` dentro de `listRef`.
 */
export function useListNavigation({ count, open, onPick, onOpen, onClose, resetKey }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => { setActiveIndex(0); }, [resetKey, count]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const onKeyDown = useCallback((e) => {
    if (!open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); onOpen?.(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => (count ? (i + 1) % count : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => (count ? (i - 1 + count) % count : 0));
        break;
      case 'PageDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(count - 1, i + 8));
        break;
      case 'PageUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(0, i - 8));
        break;
      case 'Enter':
        if (count > 0) {
          e.preventDefault();
          onPick?.(activeIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        break;
      case 'Tab':
        onClose?.();
        break;
      default:
        break;
    }
  }, [open, count, activeIndex, onPick, onOpen, onClose]);

  return { activeIndex, setActiveIndex, listRef, onKeyDown };
}

/** Posición fija calculada a partir del ancla; se recalcula con scroll/resize */
function useFloatingPosition(anchorRef, open, { maxHeight, minWidth, matchWidth }) {
  const [style, setStyle] = useState(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const below = vh - r.bottom - 8;
    const above = r.top - 8;
    const openUp = below < Math.min(maxHeight, 220) && above > below;
    const width = Math.min(vw - 16, Math.max(matchWidth ? r.width : 0, minWidth || 0, r.width));
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    setStyle({
      position: 'fixed',
      left,
      width,
      maxHeight: Math.max(120, Math.min(maxHeight, openUp ? above : below)),
      ...(openUp ? { bottom: vh - r.top + 4 } : { top: r.bottom + 4 }),
    });
  }, [anchorRef, maxHeight, minWidth, matchWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return style;
}

/**
 * Dropdown flotante en portal.
 * Props: anchorRef (elemento contra el que se posiciona), open, maxHeight,
 * minWidth (px), children. El ref apunta al contenedor con scroll (útil como
 * listRef de useListNavigation y para detectar clic fuera).
 */
export const FloatingPanel = forwardRef(function FloatingPanel(
  { anchorRef, open, maxHeight = 320, minWidth, matchWidth = true, className = '', children, footer },
  ref
) {
  const style = useFloatingPosition(anchorRef, open, { maxHeight, minWidth, matchWidth });
  if (!open || !style) return null;
  return createPortal(
    <div
      style={{ ...style, maxHeight: undefined }}
      className={`z-[1100] bg-white dark:bg-graphite border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col ${className}`}
      // Evita que el mousedown dentro del panel quite el foco del input
      onMouseDown={e => e.preventDefault()}
    >
      <div ref={ref} role="listbox" className="overflow-y-auto overscroll-contain" style={{ maxHeight: style.maxHeight - (footer ? 30 : 0) }}>
        {children}
      </div>
      {footer && (
        <div className="px-3 py-1.5 text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex-shrink-0">
          {footer}
        </div>
      )}
    </div>,
    document.body
  );
});

/** Cierra al hacer clic fuera de cualquiera de los refs (input + panel en portal) */
export function useClickOutside(refs, onOutside, active = true) {
  const refsRef = useRef(refs);
  const cbRef = useRef(onOutside);
  refsRef.current = refs;
  cbRef.current = onOutside;
  useEffect(() => {
    if (!active) return;
    const h = (e) => {
      if (refsRef.current.some(r => r.current?.contains(e.target))) return;
      cbRef.current();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [active]);
}

export const optionCls = (active, selected) =>
  `w-full text-left px-3 py-2 text-sm border-b border-gray-50 dark:border-white/5 last:border-0 transition-colors cursor-pointer ${
    active
      ? 'bg-blue-50 dark:bg-blue-900/30'
      : selected
        ? 'bg-blue-50/50 dark:bg-blue-900/15'
        : 'hover:bg-gray-50 dark:hover:bg-white/5'
  }`;

export const kbdHint = 'Flechas ↑↓ para moverse · Enter para elegir · Esc para cerrar';
