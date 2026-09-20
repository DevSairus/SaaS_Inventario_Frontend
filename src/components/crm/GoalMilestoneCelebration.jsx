// frontend/src/components/crm/GoalMilestoneCelebration.jsx
//
// CRM — Gamificación, Fase 3 (§5.2). "Debe hacer resaltar a la persona sin
// dejar de ser profesional — banner/modal breve, no un toast genérico
// perdido entre otros mensajes." Se monta una sola vez en Layout.jsx (igual
// que NexaChatWidget) y escucha useGoalMilestoneStore: cualquier página que
// dispare un evento de gamificación (mover oportunidad a "ganada",
// completar un seguimiento, crear un cliente — ver §4) termina mostrando
// esto, sin importar en qué pantalla esté el usuario.
//
// Confetti reutiliza exactamente canvas-confetti con los mismos colores de
// marca que ya usa celebrateWin() en PipelinePage.jsx (A.2.3) — sin
// dependencia nueva, mismo patrón. Sin sonido ni animaciones tipo
// videojuego, tal como pide §11 (fuera de alcance a propósito).
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Rocket, Flag, Trophy, Star, Car, X } from 'lucide-react';
import useGoalMilestoneStore from '../../store/goalMilestoneStore';

const ICON_BY_STYLE = { rocket: Rocket, flag: Flag, trophy: Trophy, star: Star, car: Car };

const AUTO_DISMISS_MS = 6000;

function celebrateMilestone() {
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 45,
    origin: { y: 0.15 },
    colors: ['#CF3A0B', '#F0572B', '#2FAE66'],
  });
}

export default function GoalMilestoneCelebration() {
  const current = useGoalMilestoneStore((s) => s.current);
  const dismissCurrent = useGoalMilestoneStore((s) => s.dismissCurrent);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!current) return;
    celebrateMilestone();
    timerRef.current = setTimeout(dismissCurrent, AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [current, dismissCurrent]);

  if (!current) return null;

  const Icon = ICON_BY_STYLE[current.icon_style] || Trophy;
  const achievement = current.target_label
    ? `${current.target_label} — ${current.name}`
    : current.name;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md"
      role="status"
      aria-live="polite"
    >
      <div className="bg-white dark:bg-graphite border border-amber-200 dark:border-amber-800/40 rounded-2xl shadow-lg shadow-black/10 p-4 flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0 shadow-sm shadow-amber-500/30">
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{achievement}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {current.milestone_reached?.message || `${current.milestone_reached?.percent}% de la meta`}
          </p>
        </div>
        <button
          onClick={dismissCurrent}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 flex-shrink-0"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
