// frontend/src/components/workshop/booking/DayCarousel.jsx
// Carrusel horizontal de días (Hoy · lun 29 · mar 30 ...) -- extraído de la
// agenda pública (PublicAppointmentPage) para reutilizarlo en el modal de
// reagendar del staff (RescheduleAppointmentModal). Los días se arman con
// buildDayCarousel (utils/publicBooking.js).
//
// `dark`: agrega variantes dark: -- solo para vistas internas; la agenda
// pública es siempre clara y no debe cambiar con el tema del usuario.
export default function DayCarousel({ days, value, onChange, dark = false, ariaLabel = 'Días disponibles' }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin"
      role="listbox"
      aria-label={ariaLabel}
    >
      {days.map((day) => {
        const active = day.dateKey === value;
        return (
          <button
            key={day.dateKey}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onChange(day.dateKey)}
            className={`snap-start shrink-0 w-[4.5rem] rounded-2xl border px-2 py-3 text-center transition ${
              active
                ? 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : dark
                  ? 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-200 dark:hover:border-sky-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300'
            }`}
          >
            <span className={`block text-[10px] font-semibold uppercase tracking-wide ${
              active ? 'text-sky-100' : dark ? 'text-slate-400 dark:text-gray-500' : 'text-slate-400'
            }`}>
              {day.isToday ? 'Hoy' : day.weekdayShort}
            </span>
            <span className="block text-xl font-bold leading-tight mt-0.5">{day.dayNumber}</span>
          </button>
        );
      })}
    </div>
  );
}
