// frontend/src/components/workshop/booking/SlotGrid.jsx
// Grilla de franjas horarias -- extraída de la agenda pública
// (PublicAppointmentPage) para reutilizarla al reagendar desde el staff.
//
//  - Público: solo franjas disponibles (showUnavailable = false).
//  - Staff: todas, con ocupación "1/2", las llenas deshabilitadas, la franja
//    actual de la cita marcada y la elegida resaltada.
// `dark`: variantes dark: solo para vistas internas (ver DayCarousel).
export default function SlotGrid({
  slots,
  onSelect,
  selectedAt = null,
  currentAt = null,
  showUnavailable = false,
  dark = false,
}) {
  const list = showUnavailable ? slots : slots.filter((s) => s.available);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {list.map((slot) => {
        const isSelected = selectedAt && slot.scheduled_at === selectedAt;
        const isCurrent = currentAt && slot.scheduled_at === currentAt;
        const disabled = !slot.available || isCurrent;

        let cls = 'border-sky-200 text-sky-800 bg-sky-50 hover:bg-sky-100 hover:border-sky-300';
        if (dark) cls += ' dark:border-sky-800/50 dark:text-sky-200 dark:bg-sky-900/20 dark:hover:bg-sky-900/40';
        if (isSelected) {
          cls = 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-600/20';
        } else if (isCurrent) {
          cls = 'border-dashed border-slate-300 text-slate-500 bg-white cursor-default';
          if (dark) cls += ' dark:border-white/20 dark:text-gray-400 dark:bg-transparent';
        } else if (!slot.available) {
          cls = 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed';
          if (dark) cls += ' dark:border-white/5 dark:text-gray-600 dark:bg-white/5';
        }

        return (
          <button
            key={slot.time}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot)}
            className={`text-sm py-2.5 rounded-xl border font-medium transition ${cls}`}
          >
            <span className={`block leading-tight ${!slot.available && !isCurrent ? 'line-through' : ''}`}>{slot.time}</span>
            {showUnavailable && (
              <span className={`block text-[10px] font-normal leading-tight mt-0.5 ${isSelected ? 'text-sky-100' : 'opacity-70'}`}>
                {isCurrent ? 'Actual' : `${slot.booked}/${slot.capacity}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
