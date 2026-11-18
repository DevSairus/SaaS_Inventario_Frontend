// frontend/src/pages/workshop/WorkshopDisplayPage.jsx
// Pantalla de taller para el TV de una sede, sin login: /pantalla-taller/:token
// Solo lectura. Se actualiza en vivo y suena con cada cambio de una OT.
// El enlace se genera en Configuración → Taller → Bahías y pantalla de taller.
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { workshopBoardApi } from '../../api/workshopBoard';
import useWorkshopBoard from '../../hooks/useWorkshopBoard';
import WorkshopBoardView from '../../components/workshop/board/WorkshopBoardView';
import { audioUnlocked, playBoardSound, unlockAudio } from '../../utils/boardSounds';

function Clock({ now }) {
  const d = new Date(now);
  return (
    <div className="text-right leading-tight">
      <div className="font-mono text-[clamp(1.6rem,2.4vw,2.6rem)] font-bold text-zinc-100">
        {d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </div>
      <div className="text-sm capitalize text-zinc-400">
        {d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
}

// Mantiene la pantalla encendida mientras la pestaña esté visible.
function useWakeLock() {
  useEffect(() => {
    let lock = null;
    const request = async () => {
      try { lock = await navigator.wakeLock?.request('screen'); } catch { /* no soportado o sin permiso */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); lock?.release?.().catch(() => {}); };
  }, []);
}

export default function WorkshopDisplayPage() {
  const { token } = useParams();
  const [soundOn, setSoundOn] = useState(false);
  const [askSound, setAskSound] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const load = useCallback(() => workshopBoardApi.getPublicBoard(token), [token]);
  const { data, error, now, highlightIds, banner, connected, revoked } = useWorkshopBoard({
    load, socket: { displayToken: token }, soundOn,
  });
  useWakeLock();

  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 10 * 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.title = data?.branch?.name ? `Taller · ${data.branch.name}` : 'Pantalla de taller';
  }, [data?.branch?.name]);

  const enableSound = async () => {
    const ok = await unlockAudio();
    setSoundOn(ok);
    setAskSound(false);
    if (ok) playBoardSound('status');
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const invalid = revoked || error?.status === 404;
  if (invalid) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 p-6 text-center text-zinc-300">
        <div>
          <p className="text-3xl font-bold text-zinc-100">Enlace de pantalla inválido o revocado</p>
          <p className="mt-3 text-lg">Genera un enlace nuevo en Configuración → Taller → Bahías y pantalla de taller.</p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-xl text-zinc-400">
        {error ? 'Sin conexión con Pitbox. Reintentando…' : 'Cargando pantalla de taller…'}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 p-4 text-zinc-100 lg:p-6">
      <WorkshopBoardView
        data={data}
        now={now}
        highlightIds={highlightIds}
        header={(
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">Pitbox · Taller</div>
              <h1 className="truncate text-[clamp(1.5rem,2.4vw,2.6rem)] font-black text-zinc-50">{data.branch.name}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-2 text-sm ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {connected ? 'En vivo' : 'Reconectando…'}
              </span>
              <button
                type="button"
                onClick={soundOn ? () => setSoundOn(false) : enableSound}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800"
                title={soundOn ? 'Silenciar' : 'Activar sonido'}
              >
                {soundOn ? '🔔 Sonido' : '🔕 Sin sonido'}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800"
              >
                ⛶ Pantalla completa
              </button>
              <Clock now={clock} />
            </div>
          </div>
        )}
      />

      {banner && (
        <div key={banner.id} className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-2xl bg-zinc-100 px-6 py-3 text-zinc-950 shadow-2xl">
            {banner.plate && (
              <span className="rounded-md border-[3px] border-zinc-950 bg-yellow-400 px-3 font-mono text-3xl font-black tracking-[0.12em]">{banner.plate}</span>
            )}
            <span className="text-2xl font-bold">{banner.text}</span>
            <span className="text-lg text-zinc-600">{banner.order}{banner.where ? ` · ${banner.where}` : ''}</span>
          </div>
        </div>
      )}

      {askSound && !audioUnlocked() && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 p-6">
          <div className="max-w-md rounded-2xl bg-zinc-900 p-6 text-center ring-1 ring-zinc-700">
            <p className="text-2xl font-bold text-zinc-50">¿Activar sonido de avisos?</p>
            <p className="mt-2 text-zinc-400">
              El navegador solo permite sonido después de un toque. Suena cuando una OT entra, cambia de estado,
              de técnico o de bahía, o el cliente responde la cotización.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" onClick={enableSound} className="rounded-xl bg-orange-600 px-5 py-2.5 text-lg font-semibold text-white hover:bg-orange-500">
                Activar sonido
              </button>
              <button type="button" onClick={() => setAskSound(false)} className="rounded-xl bg-zinc-800 px-5 py-2.5 text-lg text-zinc-300 hover:bg-zinc-700">
                Sin sonido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
