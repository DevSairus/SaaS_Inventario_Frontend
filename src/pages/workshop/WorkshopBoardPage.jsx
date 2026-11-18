// frontend/src/pages/workshop/WorkshopBoardPage.jsx
// Tablero del taller dentro del sistema (Taller → Tablero). Solo consulta:
// el mismo mapa de ocupación del TV, para la sede activa (admin/manager
// pueden elegir otra). La bahía de una OT se asigna desde la OT.
import { useCallback, useRef, useState } from 'react';
import Layout from '../../components/layout/Layout';
import useAuthStore from '../../store/authStore';
import useBranchStore from '../../store/branchStore';
import { workshopBoardApi } from '../../api/workshopBoard';
import useWorkshopBoard from '../../hooks/useWorkshopBoard';
import WorkshopBoardView from '../../components/workshop/board/WorkshopBoardView';
import { unlockAudio, playBoardSound } from '../../utils/boardSounds';

export default function WorkshopBoardPage() {
  const { token, user } = useAuthStore();
  const { branches, activeBranchId } = useBranchStore();
  const canPick = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const [branchId, setBranchId] = useState(activeBranchId);
  const effectiveBranch = canPick ? branchId || activeBranchId : activeBranchId;
  const [soundOn, setSoundOn] = useState(false);
  const boxRef = useRef(null);

  const load = useCallback(
    () => workshopBoardApi.getBoard(effectiveBranch).then((r) => r.data.data),
    [effectiveBranch],
  );
  const { data, error, now, highlightIds, banner, connected } = useWorkshopBoard({
    load, socket: { token, branchId: effectiveBranch }, soundOn,
  });

  const toggleSound = async () => {
    if (soundOn) return setSoundOn(false);
    const ok = await unlockAudio();
    setSoundOn(ok);
    if (ok) playBoardSound('status');
  };

  return (
    <Layout>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tablero del taller</h1>
          <p className="text-sm text-gray-500">
            Ocupación por bahía en vivo. La bahía se asigna desde la orden de trabajo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPick && branches.length > 1 && (
            <select
              value={effectiveBranch || ''}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <span className={`inline-flex items-center gap-1.5 text-sm ${connected ? 'text-emerald-600' : 'text-amber-600'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {connected ? 'En vivo' : 'Reconectando…'}
          </span>
          <button type="button" onClick={toggleSound} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
            {soundOn ? '🔔 Sonido activo' : '🔕 Activar sonido'}
          </button>
          <button
            type="button"
            onClick={() => boxRef.current?.requestFullscreen?.().catch(() => {})}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            ⛶ Pantalla completa
          </button>
        </div>
      </div>

      <div ref={boxRef} className="relative h-[calc(100vh-14rem)] min-h-[32rem] overflow-hidden rounded-2xl bg-zinc-950 p-4 text-zinc-100">
        {!data ? (
          <div className="flex h-full items-center justify-center text-zinc-400">
            {error ? (error.response?.data?.message || 'No se pudo cargar el tablero') : 'Cargando…'}
          </div>
        ) : (
          <WorkshopBoardView
            data={data}
            now={now}
            highlightIds={highlightIds}
            header={<h2 className="text-xl font-black text-zinc-50">{data.branch.name}</h2>}
          />
        )}
        {banner && (
          <div key={banner.id} className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <div className="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-2 text-zinc-950 shadow-2xl">
              {banner.plate && <span className="rounded border-2 border-zinc-950 bg-yellow-400 px-2 font-mono text-xl font-black tracking-widest">{banner.plate}</span>}
              <span className="text-lg font-bold">{banner.text}</span>
              <span className="text-sm text-zinc-600">{banner.order}{banner.where ? ` · ${banner.where}` : ''}</span>
            </div>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
