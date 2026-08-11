import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../../components/layout/Layout';
import AppointmentMiniCalendar from '../../components/workshop/AppointmentMiniCalendar';
import { appointmentsApi } from '../../api/workshopAppointments';
import { toLocalDateString } from '../../utils/formatters';

const STATUS_LABELS = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  confirmada: { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  cancelada:  { label: 'Cancelada', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  no_asistio: { label: 'No asistió', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
  completada: { label: 'Completada', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

const dayKeyOf = (scheduled_at) => (scheduled_at ? String(scheduled_at).slice(0, 10) : null);

function timeOf(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// Modal para completar placa + datos del vehículo cuando la cita se agendó
// sin esa información (la reserva pública no la exige) y el staff intenta
// convertirla a Orden de Trabajo -- antes esto simplemente se rechazaba.
function VehicleDataModal({ onSubmit, onClose, submitting }) {
  const [form, setForm] = useState({ vehicle_plate: '', vehicle_brand: '', vehicle_model: '' });
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    if (!form.vehicle_plate.trim()) {
      setError('La placa es requerida.');
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-graphite rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Registrar vehículo</h3>
        <p className="text-xs text-gray-500 dark:text-gray-500">Esta cita no tiene placa registrada. Ingresa los datos del vehículo para poder crear la Orden de Trabajo.</p>
        <input
          type="text" placeholder="Placa" value={form.vehicle_plate}
          onChange={e => setForm({ ...form, vehicle_plate: e.target.value })}
          className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
        />
        <input
          type="text" placeholder="Marca (opcional)" value={form.vehicle_brand}
          onChange={e => setForm({ ...form, vehicle_brand: e.target.value })}
          className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
        />
        <input
          type="text" placeholder="Modelo (opcional)" value={form.vehicle_model}
          onChange={e => setForm({ ...form, vehicle_model: e.target.value })}
          className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? 'Creando...' : 'Registrar y crear OT'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const navigate = useNavigate();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [monthAppointments, setMonthAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [plateModalFor, setPlateModalFor] = useState(null);

  const todayKey = toLocalDateString(new Date());

  // Trae todo el mes visible (incluye días del mes anterior/siguiente que
  // completan la semana) sin filtrar por estado -- el estado se distingue
  // por el color del punto; filtrar aquí escondería citas del calendario.
  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const from = format(startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const to = format(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const res = await appointmentsApi.list({ from_date: from, to_date: to });
      setMonthAppointments(res.data.data);
    } catch {
      toast.error('No se pudieron cargar las citas');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map();
    for (const a of monthAppointments) {
      const key = dayKeyOf(a.scheduled_at);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return map;
  }, [monthAppointments]);

  const selectedDayKey = selectedDay ? toLocalDateString(selectedDay) : null;
  const selectedDayAppointments = (selectedDayKey ? (appointmentsByDay.get(selectedDayKey) || []) : [])
    .filter(a => !statusFilter || a.status === statusFilter)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const openWaLink = (waLink) => {
    if (waLink) window.open(waLink, '_blank');
  };

  const handleConfirm = async (appointment) => {
    setBusyId(appointment.id);
    try {
      await appointmentsApi.confirm(appointment.id);
      const wa = await appointmentsApi.sendWhatsApp(appointment.id, 'confirmacion');
      openWaLink(wa.data.waLink);
      toast.success('Cita confirmada');
      loadMonth();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al confirmar la cita');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (appointment) => {
    const reason = window.prompt('Motivo de la cancelación (opcional):') || '';
    setBusyId(appointment.id);
    try {
      await appointmentsApi.cancel(appointment.id, reason);
      const wa = await appointmentsApi.sendWhatsApp(appointment.id, 'cancelacion');
      openWaLink(wa.data.waLink);
      toast.success('Cita cancelada');
      loadMonth();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cancelar la cita');
    } finally {
      setBusyId(null);
    }
  };

  const handleReminder = async (appointment) => {
    setBusyId(appointment.id);
    try {
      const wa = await appointmentsApi.sendWhatsApp(appointment.id, 'recordatorio');
      openWaLink(wa.data.waLink);
      loadMonth();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al generar el recordatorio');
    } finally {
      setBusyId(null);
    }
  };

  const doConvert = async (appointment, extra = {}) => {
    setBusyId(appointment.id);
    try {
      const res = await appointmentsApi.convertToWorkOrder(appointment.id, extra);
      setPlateModalFor(null);
      toast.success('Orden de trabajo creada');
      navigate(`/workshop/work-orders/${res.data.data.id}`);
    } catch (e) {
      if (e.response?.data?.code === 'VEHICLE_PLATE_REQUIRED') {
        setPlateModalFor(appointment);
      } else {
        toast.error(e.response?.data?.message || 'Error al convertir la cita');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleConvert = (appointment) => {
    if (!appointment.vehicle_plate) {
      setPlateModalFor(appointment);
      return;
    }
    doConvert(appointment);
  };

  return (
    <Layout>
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Agenda de citas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
              {loading ? 'Cargando...' : `${selectedDayAppointments.length} cita${selectedDayAppointments.length !== 1 ? 's' : ''} este día`}
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
          <AppointmentMiniCalendar
            month={month}
            onMonthChange={setMonth}
            appointmentsByDay={appointmentsByDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            todayKey={todayKey}
          />

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize px-1">
              {selectedDay ? format(selectedDay, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
              {selectedDayKey === todayKey && <span className="ml-2 text-xs font-medium text-blue-600">Hoy</span>}
            </p>

            <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedDayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <p className="text-gray-500 dark:text-gray-500 text-sm">No hay citas para este día</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/10">
                  {selectedDayAppointments.map(appointment => {
                    const st = STATUS_LABELS[appointment.status] || STATUS_LABELS.pendiente;
                    const busy = busyId === appointment.id;
                    return (
                      <div key={appointment.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="text-sm font-mono text-gray-700 dark:text-gray-300 w-14 shrink-0">{timeOf(appointment.scheduled_at)}</div>
                        <div className="flex-1 min-w-[180px]">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{appointment.customer_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {appointment.customer_phone}{appointment.vehicle_plate ? ` · ${appointment.vehicle_plate}` : ' · Sin placa'}
                          </p>
                        </div>
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        <div className="flex gap-2">
                          {appointment.status === 'pendiente' && (
                            <>
                              <button disabled={busy} onClick={() => handleConfirm(appointment)} className="px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Confirmar</button>
                              <button disabled={busy} onClick={() => handleCancel(appointment)} className="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">Cancelar</button>
                            </>
                          )}
                          {appointment.status === 'confirmada' && (
                            <>
                              <button disabled={busy} onClick={() => handleReminder(appointment)} className="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">Recordatorio</button>
                              <button disabled={busy} onClick={() => handleCancel(appointment)} className="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">Cancelar</button>
                              <button disabled={busy} onClick={() => handleConvert(appointment)} className="px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">Convertir a OT</button>
                            </>
                          )}
                          {appointment.converted_to_work_order_id && (
                            <button onClick={() => navigate(`/workshop/work-orders/${appointment.converted_to_work_order_id}`)} className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:underline">Ver OT</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {plateModalFor && (
        <VehicleDataModal
          submitting={busyId === plateModalFor.id}
          onClose={() => setPlateModalFor(null)}
          onSubmit={(data) => doConvert(plateModalFor, data)}
        />
      )}
    </Layout>
  );
}
