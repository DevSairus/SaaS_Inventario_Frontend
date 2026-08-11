// frontend/src/components/workshop/AppointmentMiniCalendar.jsx
//
// Mini-calendario mensual para la Agenda de citas de Taller -- mismo patrón
// que FollowUpMiniCalendar.jsx (CRM): no trae datos por su cuenta, recibe el
// mapa de citas por día ya armado (appointmentsByDay) y solo se encarga de
// la grilla, la navegación entre meses y el punto indicador por día.
import { useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Prioridad del punto indicador cuando un día tiene varias citas con
// distinto estado: pendiente (necesita acción del staff) > confirmada >
// completada > cancelada/no_asistio.
function dotColorFor(dayAppointments) {
  if (dayAppointments.some(a => a.status === 'pendiente')) return 'bg-amber-500';
  if (dayAppointments.some(a => a.status === 'confirmada')) return 'bg-blue-500';
  if (dayAppointments.some(a => a.status === 'completada')) return 'bg-green-500';
  return 'bg-gray-400';
}

/**
 * @param {Date} month - cualquier día dentro del mes visible
 * @param {(d: Date) => void} onMonthChange
 * @param {Map<string, Array>} appointmentsByDay - clave 'yyyy-MM-dd' -> citas de ese día
 * @param {Date} selectedDay
 * @param {(d: Date) => void} onSelectDay
 * @param {string} todayKey - 'yyyy-MM-dd' de hoy (en hora local)
 */
export default function AppointmentMiniCalendar({ month, onMonthChange, appointmentsByDay, selectedDay, onSelectDay, todayKey }) {
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
          const dayAppointments = appointmentsByDay.get(key) || [];
          const inMonth = isSameMonth(d, month);
          const isToday = key === todayKey;
          const isSelected = selectedDay && isSameDay(d, selectedDay);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(d)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition
                ${!inMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}
                ${isSelected ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm shadow-blue-500/30 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                ${isToday && !isSelected ? 'ring-1 ring-blue-500/60 font-semibold' : ''}
              `}
            >
              <span>{format(d, 'd')}</span>
              {dayAppointments.length > 0 && (
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : dotColorFor(dayAppointments)}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
