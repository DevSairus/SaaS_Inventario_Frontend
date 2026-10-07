// frontend/src/hooks/useFormDraft.js
//
// Borrador de un formulario en dos niveles, para que un apagón, un cierre
// del navegador o una caída de internet no hagan perder lo que el usuario
// llevaba sin guardar, y para poder seguirlo desde otro equipo:
//   1) localStorage del equipo -- se guarda ~0,6 s después de cada cambio,
//      funciona sin internet.
//   2) Servidor (/api/form-drafts) -- copia que se sube unos segundos
//      después; si no hay internet se reintenta al reconectar.
// Al volver a abrir el mismo formulario se ofrece el borrador más reciente
// de los dos (indicando si viene de otro equipo).
//
//   const draft = useFormDraft({ scope: 'sale:new', data, isEmpty, meta });
//   <div {...draft.bind}> ...formulario... </div>
//   draft.pending   -> borrador para recuperar ({ data, savedAt, meta, otherDevice }) o null
//   draft.restore() -> devuelve data y la deja como trabajo actual
//   draft.discard() -> lo descarta
//   draft.conflict  -> otro equipo guardó una versión más reciente mientras
//                      se trabajaba acá ({ data, savedAt, ... }) o null
//   draft.resolveConflict(useRemote) -> true: devuelve la data del otro
//                      equipo para cargarla; false: se mantiene la de acá
//   draft.clear()   -> llamar al guardar con éxito o al cancelar
//
// Solo se guarda después de que el usuario interactúa con el formulario
// (teclea o hace clic dentro de `bind`) y si el estado cambió respecto del
// que había en ese primer momento -- así la carga inicial de una venta
// existente o los valores precargados no generan borradores. La clave
// incluye empresa y usuario: en un equipo compartido nadie ve el borrador
// de otro (y en el servidor cada usuario solo ve los suyos). Vencen a los 7 días.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAuthStore from '../store/authStore';
import { formDraftsAPI } from '../api/formDrafts';

const PREFIX = 'pitbox:draft:v1:';
const DEVICE_KEY = 'pitbox:device-id';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SAVE_DELAY_MS = 600;
const PUSH_DELAY_MS = 2500;

const readRecord = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || !rec.savedAt || Date.now() - rec.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return rec;
  } catch {
    return null;
  }
};

const removeRecord = (key) => {
  try { localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
};

// Identificador de este navegador, para saber si un borrador del servidor
// viene de otro equipo.
let deviceId = null;
const getDeviceId = () => {
  if (deviceId) return deviceId;
  try {
    deviceId = localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(DEVICE_KEY, deviceId);
    }
  } catch {
    deviceId = deviceId || `tmp-${Math.random().toString(36).slice(2)}`;
  }
  return deviceId;
};

// Limpia borradores locales vencidos de cualquier formulario (una vez por carga).
let purged = false;
const purgeExpired = () => {
  if (purged) return;
  purged = true;
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) readRecord(k);
    }
  } catch { /* sin almacenamiento */ }
};

const isNetworkError = (e) => !e?.response;

const fromServer = (dto) => ({
  data: dto.data,
  meta: dto.meta,
  savedAt: dto.saved_at,
  otherDevice: !!dto.device_id && dto.device_id !== getDeviceId(),
});

export default function useFormDraft({ scope, data, isEmpty = () => false, meta = null, enabled = true }) {
  const user = useAuthStore((s) => s.user);
  const key = user?.id ? `${PREFIX}${user.tenant_id || 'global'}:${user.id}:${scope}` : null;

  const [pending, setPending] = useState(null);
  const [conflict, setConflict] = useState(null);
  const pendingRef = useRef(null);
  pendingRef.current = pending;
  const serialized = useMemo(() => JSON.stringify(data), [data]);

  const latestRef = useRef(serialized);
  latestRef.current = serialized;
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  const baselineRef = useRef(null);   // estado al primer toque del usuario
  const touchedRef = useRef(false);
  const stoppedRef = useRef(false);    // tras clear(): no volver a guardar
  const timerRef = useRef(null);       // guardado local diferido
  const pushTimerRef = useRef(null);   // subida al servidor diferida
  const lastLocalRef = useRef(null);   // último registro guardado en local
  const serverAtRef = useRef(null);    // versión del servidor que este equipo conoce
  const forceRef = useRef(false);      // "mantener la mía" tras un conflicto
  const conflictRef = useRef(false);
  const retryRef = useRef(null);       // 'push' | 'delete' pendiente por falta de red

  // ── Servidor ───────────────────────────────────────────────────────
  const push = useCallback(async () => {
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = null;
    const rec = lastLocalRef.current;
    if (!scope || !rec || stoppedRef.current || conflictRef.current) return;
    try {
      const res = await formDraftsAPI.save({
        scope,
        data: rec.data,
        meta: rec.meta,
        saved_at: rec.savedAt,
        device_id: getDeviceId(),
        base_saved_at: serverAtRef.current,
        force: forceRef.current,
      });
      serverAtRef.current = res?.saved_at ?? rec.savedAt;
      forceRef.current = false;
      if (retryRef.current === 'push') retryRef.current = null;
    } catch (e) {
      if (e?.response?.status === 409 && e.response.data?.data) {
        conflictRef.current = true;
        setConflict(fromServer(e.response.data.data));
      } else if (isNetworkError(e)) {
        retryRef.current = 'push';
      }
    }
  }, [scope]);

  const schedulePush = useCallback(() => {
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(push, PUSH_DELAY_MS);
  }, [push]);

  const removeServer = useCallback(async () => {
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = null;
    lastLocalRef.current = null;
    if (!scope) return;
    try {
      await formDraftsAPI.remove(scope);
      serverAtRef.current = null;
      if (retryRef.current === 'delete') retryRef.current = null;
    } catch (e) {
      if (isNetworkError(e)) retryRef.current = 'delete';
    }
  }, [scope]);

  // Al reconectar, reintentar lo que quedó pendiente.
  useEffect(() => {
    const onOnline = () => {
      if (retryRef.current === 'push') push();
      else if (retryRef.current === 'delete') removeServer();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [push, removeServer]);

  // ── Al montar (o cambiar de formulario): buscar un borrador previo ──
  useEffect(() => {
    purgeExpired();
    touchedRef.current = false;
    baselineRef.current = null;
    stoppedRef.current = false;
    forceRef.current = false;
    conflictRef.current = false;
    serverAtRef.current = null;
    lastLocalRef.current = null;
    setConflict(null);
    if (!key || !enabled) {
      setPending(null);
      return undefined;
    }
    const local = readRecord(key);
    setPending(local ? { ...local, otherDevice: false } : null);

    let active = true;
    formDraftsAPI.get(scope).then((dto) => {
      if (!active || !dto) return;
      serverAtRef.current = dto.saved_at;
      // Se ofrece la del servidor solo si es más reciente que la local.
      if (!local || dto.saved_at > local.savedAt) {
        setPending((prev) => (prev && prev.savedAt >= dto.saved_at ? prev : fromServer(dto)));
      }
    }).catch(() => { /* sin red: queda la local */ });
    return () => { active = false; };
  }, [key, enabled, scope]);

  // ── Guardado local (y programación de la subida) ───────────────────
  const write = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!key || !enabled || stoppedRef.current || !touchedRef.current) return;
    const current = latestRef.current;
    try {
      // Sin cambios respecto de lo que había al empezar, o formulario vacío:
      // no hay nada que proteger.
      if (current === baselineRef.current || isEmptyRef.current(JSON.parse(current))) {
        // Mientras se ofrece recuperar un borrador, no se borra nada: el
        // usuario todavía no decidió.
        if (!pendingRef.current) {
          removeRecord(key);
          if (lastLocalRef.current || serverAtRef.current) removeServer();
        }
        return;
      }
      const rec = { savedAt: Date.now(), meta: metaRef.current, data: JSON.parse(current) };
      lastLocalRef.current = rec;
      localStorage.setItem(key, JSON.stringify(rec));
    } catch { /* almacenamiento lleno o bloqueado: igual se intenta el servidor */ }
    if (lastLocalRef.current) schedulePush();
  }, [key, enabled, removeServer, schedulePush]);

  // Guardado diferido en cada cambio.
  useEffect(() => {
    if (!touchedRef.current || stoppedRef.current) return undefined;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(write, SAVE_DELAY_MS);
    return undefined;
  }, [serialized, write]);

  // Guardar ya si se oculta la pestaña, se cierra o se sale del formulario.
  useEffect(() => {
    const flush = () => {
      if (timerRef.current) write();
      if (pushTimerRef.current) push();
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [write, push]);

  const touch = useCallback(() => {
    if (touchedRef.current || stoppedRef.current) return;
    touchedRef.current = true;
    baselineRef.current = latestRef.current;
  }, []);

  const bind = useMemo(() => ({
    onInputCapture: touch,
    onClickCapture: touch,
    onKeyDownCapture: touch,
  }), [touch]);

  const restore = useCallback(() => {
    const rec = pending;
    setPending(null);
    if (!rec) return null;
    // Lo recuperado es trabajo sin guardar: se sigue guardando como borrador.
    touchedRef.current = true;
    baselineRef.current = null;
    return rec.data;
  }, [pending]);

  const discard = useCallback(() => {
    setPending(null);
    // Si el usuario ya empezó algo nuevo, eso es lo que queda guardado
    // (y sobrescribe la copia del servidor); si no, se borra en ambos lados.
    if (touchedRef.current && latestRef.current !== baselineRef.current) {
      write();
    } else {
      if (key) removeRecord(key);
      removeServer();
    }
  }, [key, write, removeServer]);

  const resolveConflict = useCallback((useRemote) => {
    const remote = conflict;
    setConflict(null);
    conflictRef.current = false;
    if (!remote) return null;
    if (useRemote) {
      // Se carga la del otro equipo; los cambios siguientes se basan en ella.
      serverAtRef.current = remote.savedAt;
      touchedRef.current = true;
      baselineRef.current = null;
      return remote.data;
    }
    // Mantener la de este equipo: sobrescribe la del servidor.
    forceRef.current = true;
    push();
    return null;
  }, [conflict, push]);

  const clear = useCallback(() => {
    stoppedRef.current = true;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    setPending(null);
    setConflict(null);
    if (key) removeRecord(key);
    removeServer();
  }, [key, removeServer]);

  return { pending, conflict, restore, discard, resolveConflict, clear, bind };
}
