/**
 * Motor del demo interactivo: ejecuta el guion (lista de pasos) de un tour.
 *
 * Un tour es DATOS:
 *   { id, title, module, summary, duration, Screen, initialState, steps }
 *
 * Acciones de un guion (`do`):
 *   caption   { text }                       frase explicativa (inicia un "paso" visible)
 *   move      { to }                         mueve el cursor a [data-demo-id=to]
 *   click     { on?, set? }                  (mueve si hace falta) pulsa y aplica `set`
 *   type      { into, field, text, perChar? } (mueve si hace falta) escribe en state[field]
 *   set       { patch }                      cambia el state de la pantalla mock
 *   highlight { on, ms? }                    anillo sobre un elemento
 *   wait      { ms }                         pausa
 *
 * La pantalla mock es una función pura de `state` (más `typing`): no tiene lógica propia.
 * Cualquier posición del guion se puede reconstruir sin animar con `replay`, y por eso
 * pausa, reinicio y paso anterior/siguiente son exactos.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const TIMING = {
  move: 700,       // viaje del cursor (la transición CSS dura 650 ms)
  click: 280,      // pulsación antes de aplicar el cambio
  typeChar: 70,    // ms por carácter al escribir
  highlight: 1300, // duración del anillo de resaltado
  wait: 600,       // pausa por defecto
  frames: 34,      // dos cuadros de pintura tras un `set`
};

/** Un "paso" visible = desde un `caption` hasta el siguiente. */
export function buildChapters(steps) {
  const starts = [];
  steps.forEach((s, i) => { if (s.do === 'caption') starts.push(i); });
  if (starts.length === 0 || starts[0] !== 0) starts.unshift(0);
  return starts.map((start, k) => ({
    start,
    end: k + 1 < starts.length ? starts[k + 1] : steps.length,
    title: steps[start] && steps[start].do === 'caption' ? steps[start].text : '',
  }));
}

/** Estado visible tras aplicar, sin animación, los pasos [0, upto). */
export function replay(tour, upto) {
  let mock = { ...tour.initialState };
  let caption = '';
  let target = null;
  for (let i = 0; i < upto && i < tour.steps.length; i += 1) {
    const st = tour.steps[i];
    switch (st.do) {
      case 'caption': caption = st.text; break;
      case 'move': target = st.to; break;
      case 'click':
        if (st.on) target = st.on;
        if (st.set) mock = { ...mock, ...st.set };
        break;
      case 'type':
        if (st.into) target = st.into;
        mock = { ...mock, [st.field]: st.text };
        break;
      case 'set': mock = { ...mock, ...st.patch }; break;
      default: break; // wait y highlight no dejan rastro
    }
  }
  return { mock, caption, target };
}

/** Duración estimada (ms) de un tour reproducido de corrido. */
export function estimateDuration(tour) {
  let ms = 0;
  let target = null;
  const travel = (id) => { if (id && id !== target) { ms += TIMING.move; target = id; } };
  tour.steps.forEach((st) => {
    switch (st.do) {
      case 'move': travel(st.to); break;
      case 'click': travel(st.on); ms += TIMING.click + TIMING.frames; break;
      case 'type': travel(st.into); ms += st.text.length * (st.perChar ?? TIMING.typeChar); break;
      case 'set': ms += TIMING.frames; break;
      case 'highlight': ms += st.ms ?? TIMING.highlight; break;
      case 'wait': ms += st.ms ?? TIMING.wait; break;
      default: break;
    }
  });
  return ms;
}

const toView = (r) => ({
  mock: r.mock, caption: r.caption, target: r.target, highlight: null, typing: null, press: 0,
});

/**
 * @param tour   definición del tour (montar el reproductor con key={tour.id})
 * @param active true cuando el reproductor está a la vista (arranca solo / se pausa al salir)
 * @param manual true con prefers-reduced-motion: sin animación, un paso por pulsación
 */
export default function useTourRunner(tour, { active = true, manual = false } = {}) {
  const { steps } = tour;
  const chapters = useMemo(() => buildChapters(steps), [steps]);

  const initialView = useMemo(() => toView(replay(tour, 0)), [tour]);
  const [view, setView] = useState(initialView);
  const viewRef = useRef(initialView);
  const [status, setStatus] = useState('idle'); // idle | playing | paused | finished
  const [index, setIndexState] = useState(0);  // próximo paso del guion por ejecutar
  const indexRef = useRef(0);
  const [runKey, setRunKey] = useState(0);
  const autoPausedRef = useRef(false);          // pausado por salir de pantalla, no por el usuario

  const commit = useCallback((next) => { viewRef.current = next; setView(next); }, []);
  const patch = useCallback((p) => commit({ ...viewRef.current, ...p }), [commit]);
  const patchMock = useCallback(
    (p) => commit({ ...viewRef.current, mock: { ...viewRef.current.mock, ...p } }),
    [commit]
  );
  const setIndex = useCallback((i) => { indexRef.current = i; setIndexState(i); }, []);

  /** Salta a una posición del guion reconstruyendo el estado sin animar. */
  const jump = useCallback((i, nextStatus) => {
    commit(toView(replay(tour, i)));
    setIndex(i);
    autoPausedRef.current = false;
    setRunKey((k) => k + 1);
    setStatus(nextStatus);
  }, [tour, commit, setIndex]);

  const currentChapter = useMemo(() => {
    if (index <= 0) return -1;
    for (let k = chapters.length - 1; k >= 0; k -= 1) {
      if (index - 1 >= chapters[k].start) return k;
    }
    return -1;
  }, [index, chapters]);

  const fraction = useMemo(() => {
    if (status === 'finished') return 1;
    if (currentChapter < 0) return 0;
    const ch = chapters[currentChapter];
    return Math.min(1, Math.max(0, (index - ch.start) / Math.max(1, ch.end - ch.start)));
  }, [status, currentChapter, chapters, index]);

  /** Va al paso visible k. Si estaba reproduciendo sigue reproduciendo desde su inicio. */
  const goToChapter = useCallback((k, keepPlaying) => {
    if (k < 0) { jump(0, 'paused'); return; }
    if (k >= chapters.length) { jump(steps.length, 'finished'); return; }
    const ch = chapters[k];
    if (keepPlaying && !manual) {
      jump(steps[ch.start].do === 'caption' ? ch.start + 1 : ch.start, 'playing');
    } else {
      jump(ch.end, 'paused');
    }
  }, [chapters, steps, manual, jump]);

  const restart = useCallback(() => {
    if (manual) goToChapter(0, false);
    else jump(0, 'playing');
  }, [manual, goToChapter, jump]);

  const play = useCallback(() => {
    if (manual) return;
    autoPausedRef.current = false;
    if (status === 'finished') restart();
    else setStatus('playing');
  }, [manual, status, restart]);

  const pause = useCallback(() => {
    autoPausedRef.current = false;
    setStatus((s) => (s === 'playing' ? 'paused' : s));
  }, []);

  const toggle = useCallback(() => {
    if (status === 'playing') pause(); else play();
  }, [status, play, pause]);

  const next = useCallback(() => {
    if (status === 'finished') return;
    goToChapter(currentChapter + 1, status === 'playing');
  }, [status, currentChapter, goToChapter]);

  const prev = useCallback(() => {
    let target = currentChapter - 1;
    if (target < 0) target = manual ? -1 : 0;
    goToChapter(target, status === 'playing');
  }, [currentChapter, manual, status, goToChapter]);

  const goTo = useCallback((k) => goToChapter(k, status === 'playing'), [goToChapter, status]);

  /* Arranca solo al entrar en pantalla y se pausa al salir (salvo pausa del usuario). */
  useEffect(() => {
    if (manual) {
      if (status === 'playing') setStatus('paused');
      else if (active && status === 'idle') goToChapter(0, false);
      return;
    }
    if (active) {
      if (status === 'idle' || (status === 'paused' && autoPausedRef.current)) {
        autoPausedRef.current = false;
        setStatus('playing');
      }
    } else if (status === 'playing') {
      autoPausedRef.current = true;
      setStatus('paused');
    }
  }, [active, manual, status, goToChapter]);

  /* Ejecuta el guion mientras status === 'playing'. */
  useEffect(() => {
    if (status !== 'playing') return undefined;
    let cancelled = false;
    const pending = new Set();

    const sleep = (ms) => new Promise((resolve) => {
      const entry = { resolve };
      entry.t = setTimeout(() => { pending.delete(entry); resolve(); }, ms);
      pending.add(entry);
    });
    const frames = () => new Promise((resolve) => {
      const entry = { resolve };
      entry.raf = requestAnimationFrame(() => {
        entry.raf = requestAnimationFrame(() => { pending.delete(entry); resolve(); });
      });
      pending.add(entry);
    });

    const moveTo = async (id) => {
      if (!id || viewRef.current.target === id) return;
      patch({ target: id });
      await sleep(TIMING.move);
    };

    const execute = async (step) => {
      switch (step.do) {
        case 'caption':
          patch({ caption: step.text });
          break;
        case 'wait':
          await sleep(step.ms ?? TIMING.wait);
          break;
        case 'move':
          await moveTo(step.to);
          break;
        case 'highlight':
          patch({ highlight: step.on });
          await sleep(step.ms ?? TIMING.highlight);
          if (!cancelled) patch({ highlight: null });
          break;
        case 'set':
          patchMock(step.patch);
          await frames();
          break;
        case 'click':
          await moveTo(step.on);
          if (cancelled) return;
          patch({ press: viewRef.current.press + 1 });
          await sleep(TIMING.click);
          if (cancelled) return;
          if (step.set) patchMock(step.set);
          await frames();
          break;
        case 'type': {
          await moveTo(step.into);
          if (cancelled) return;
          patch({ typing: step.field });
          patchMock({ [step.field]: '' });
          const per = step.perChar ?? TIMING.typeChar;
          for (let n = 1; n <= step.text.length; n += 1) {
            await sleep(per);
            if (cancelled) return;
            patchMock({ [step.field]: step.text.slice(0, n) });
          }
          patch({ typing: null });
          break;
        }
        default:
          break;
      }
    };

    const run = async () => {
      // Parte siempre de un estado consistente (también al reanudar tras una pausa).
      commit(toView(replay(tour, indexRef.current)));
      await frames();
      while (!cancelled && indexRef.current < steps.length) {
        await execute(steps[indexRef.current]);
        if (cancelled) return;
        setIndex(indexRef.current + 1);
      }
      if (!cancelled) {
        patch({ typing: null, highlight: null });
        setStatus('finished');
      }
    };
    run();

    return () => {
      cancelled = true;
      pending.forEach((e) => {
        clearTimeout(e.t);
        cancelAnimationFrame(e.raf);
        e.resolve();
      });
      pending.clear();
      patch({ typing: null, highlight: null });
    };
  }, [status, runKey, tour, steps, commit, patch, patchMock, setIndex]);

  return {
    view, status, index, chapters,
    chapter: currentChapter, fraction,
    manual,
    play, pause, toggle, restart, next, prev, goTo,
  };
}
