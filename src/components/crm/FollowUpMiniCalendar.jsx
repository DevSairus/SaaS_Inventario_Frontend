// frontend/src/components/crm/FollowUpMiniCalendar.jsx
//
// Fase A.2 — punto 2.4. Mini-calendario mensual para la vista "Mi día" de
// FollowUpsPage. No trae datos por su cuenta: recibe el mapa de tareas por
// día ya armado (tasksByDay) y solo se encarga de la grilla y la navegación
// entre meses. Los vencidos se resaltan en rojo, como pide la propuesta.
import { useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * @param {Date} month - cualquier día dentro del mes visible
 * @param {(d: Date) => void} onMonthChange
 * @param {Map<string, Array>} tasksByDay - clave 'yyyy-MM-dd' -> tareas de ese día
 * @param {Date} selectedDay
 * @param {(d: Date) => void} onSelectDay
 * @param {string} todayKey - 'yyyy-MM-dd' de hoy (en hora local)
 */
export default function FollowUpMiniCalendar({ month, onMonthChange, tasksByDay, selectedDay, onSelectDay, todayKey }) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayKey = (d) => format(d, 'yyyy-MM-dd');

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4 dark:bg-graphite dark:border-white/10">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => onMonthChange(subMonths(month, 1))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-white/5">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-800 capitalize dark:text-gray-200">
          {format(month, 'MMMM yyyy', { locale: es })}
        </span>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-white/5">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[11px] font-medium text-gray-400 py-1 dark:text-gray-500">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const key = dayKey(d);
          const dayTasks = tasksByDay.get(key) || [];
          const inMonth = isSameMonth(d, month);
          const isToday = key === todayKey;
          const isSelected = selectedDay && isSameDay(d, selectedDay);
          const isPast = key < todayKey;
          const hasOverdue = isPast && dayTasks.some(t => t.status === 'pendiente');
          const hasOpen = dayTasks.some(t => t.status === 'pendiente');

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(d)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition
                ${!inMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}
                ${isSelected ? 'bg-gradient-to-br from-accent to-accent-soft text-white shadow-sm shadow-accent/30 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                ${isToday && !isSelected ? 'ring-1 ring-accent/60 font-semibold' : ''}
              `}
            >
              <span>{format(d, 'd')}</span>
              {dayTasks.length > 0 && (
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${
                  isSelected
                    ? 'bg-white'
                    : hasOverdue ? 'bg-red-500' : hasOpen ? 'bg-blue-500' : 'bg-green-500'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
