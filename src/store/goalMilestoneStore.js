// frontend/src/store/goalMilestoneStore.js
//
// CRM — Gamificación, Fase 3 (§5.2). Cola de hitos de metas recién
// cruzados, alimentada desde cualquier punto de la app que dispare uno de
// los 3 eventos de gamificación (mover oportunidad a "ganada", completar
// un seguimiento, crear un cliente) — ver §4. El backend ya anexa
// `gamification.goals_updated` a la respuesta HTTP de esos 3 endpoints; acá
// solo se traduce eso en una cola que <GoalMilestoneCelebration /> consume
// una por una, para no encimar varios banners si se cruzan dos hitos a la
// vez (ej. una oportunidad que mueve `opportunities_won` y `revenue_won`
// al mismo tiempo).
import { create } from 'zustand';

const useGoalMilestoneStore = create((set, get) => ({
  queue: [],
  current: null,

  // Encola los hitos de un `gamification.goals_updated` tal como viene del
  // backend. Si no hay nada mostrándose ahora mismo, muestra el primero de
  // inmediato; si ya hay uno en pantalla, el resto espera su turno.
  pushMilestones: (goalsUpdated) => {
    if (!Array.isArray(goalsUpdated) || goalsUpdated.length === 0) return;

    set((state) => {
      const nextQueue = [...state.queue, ...goalsUpdated];
      if (state.current) return { queue: nextQueue };
      const [next, ...rest] = nextQueue;
      return { current: next, queue: rest };
    });
  },

  // El banner terminó de mostrarse (cerrado a mano o por temporizador) —
  // pasa al siguiente de la cola, si hay.
  dismissCurrent: () => {
    set((state) => {
      const [next, ...rest] = state.queue;
      return { current: next || null, queue: rest };
    });
  },
}));

// Helper de conveniencia para llamar desde cualquier handler que reciba una
// respuesta con `gamification` (moveStage en PipelinePage, handleComplete
// en FollowUpsPage, creación de cliente): `notifyGoalMilestones(res.data.gamification)`.
export function notifyGoalMilestones(gamification) {
  if (!gamification?.goals_updated?.length) return;
  useGoalMilestoneStore.getState().pushMilestones(gamification.goals_updated);
}

export default useGoalMilestoneStore;
