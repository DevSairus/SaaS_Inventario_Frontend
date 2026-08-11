// frontend/src/components/common/AppointmentNotificationsBell.jsx
//
// Campana para avisar al staff cuando llega una nueva solicitud de cita
// desde la página pública (/agendar/:slug). Mismo patrón de polling +
// bandeja persistida que QuoteNotificationsBell.jsx.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Bell } from 'lucide-react';
import { appointmentsApi } from '../../api/workshopAppointments';
import useTenantStore from '../../store/tenantStore';

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function AppointmentNotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const enabledModules = useTenantStore((s) => s.enabledModules);
  const hasWorkshop = enabledModules === null || enabledModules.includes('workshop');

  const fetchPending = useCallback(async () => {
    if (!hasWorkshop) return;
    setLoading(true);
    try {
      const res = await appointmentsApi.getPending();
      setItems(res.data.data || []);
    } catch {
      // silencioso — si falla, la campana simplemente no muestra badge
    } finally {
      setLoading(false);
    }
  }, [hasWorkshop]);

  useEffect(() => {
    if (!hasWorkshop) return;
    fetchPending();
    const interval = setInterval(fetchPending, 90 * 1000);
    return () => clearInterval(interval);
  }, [hasWorkshop, fetchPending]);

  if (!hasWorkshop) return null;

  const handleOpen = () => {
    setIsOpen(true);
    fetchPending();
  };

  const handleSelect = (item) => {
    setIsOpen(false);
    navigate('/workshop/appointments');
  };

  const total = items.length;

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-500"
        aria-label="Notificaciones de citas"
        title="Nuevas solicitudes de cita"
      >
        <CalendarClock className="w-6 h-6" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div
            className="absolute right-0 mt-3 w-80 bg-white dark:bg-graphite rounded-xl shadow-xl z-50 border border-gray-200 dark:border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b dark:border-white/10 bg-gradient-to-r from-amber-50 to-orange-50 dark:to-orange-900/20">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nuevas citas</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Solicitudes pendientes de confirmar</p>
            </div>

            <div className="p-2 max-h-96 overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                </div>
              ) : total === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Bell className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sin novedades</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">No hay solicitudes de cita pendientes</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left"
                    >
                      <div className="p-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5">
                        <CalendarClock size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.customer_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {fmt(item.scheduled_at)}{item.vehicle_plate ? ` · ${item.vehicle_plate}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AppointmentNotificationsBell;
