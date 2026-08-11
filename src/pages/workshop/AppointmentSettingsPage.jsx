import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import { appointmentsApi } from '../../api/workshopAppointments';
import useBranchStore from '../../store/branchStore';
import useTenantStore from '../../store/tenantStore';
import { ClipboardDocumentIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

const EMPTY_HOURS = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

// Configuración de citas de la SEDE ACTIVA (la que el usuario tiene
// seleccionada en el BranchSelector global del header) -- cada sede tiene su
// propio horario/capacidad, por eso este formulario no incluye un selector
// de sede propio.
export default function AppointmentSettingsPage() {
  const { branches, activeBranchId } = useBranchStore();
  const { tenantSlug, fetchFeatures } = useTenantStore();
  const activeBranch = branches.find(b => b.id === activeBranchId);

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState({ date: '', reason: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await appointmentsApi.getConfig();
      setConfig(res.data.data);
    } catch {
      toast.error('No se pudo cargar la configuración de citas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
    load();
  }, [activeBranchId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await appointmentsApi.updateConfig({
        business_hours: config.business_hours,
        slot_duration_minutes: config.slot_duration_minutes,
        capacity_per_slot: config.capacity_per_slot,
        advance_booking_days: config.advance_booking_days,
        min_notice_hours: config.min_notice_hours,
        blocked_dates: config.blocked_dates,
        is_public_booking_enabled: config.is_public_booking_enabled,
      });
      setConfig(res.data.data);
      toast.success('Configuración guardada');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayKey, open) => {
    const hours = { ...(config.business_hours || EMPTY_HOURS) };
    hours[dayKey] = open ? [{ start: '08:00', end: '18:00' }] : [];
    setConfig({ ...config, business_hours: hours });
  };

  const updateDayRange = (dayKey, field, value) => {
    const hours = { ...(config.business_hours || EMPTY_HOURS) };
    const range = hours[dayKey]?.[0] || { start: '08:00', end: '18:00' };
    hours[dayKey] = [{ ...range, [field]: value }];
    setConfig({ ...config, business_hours: hours });
  };

  const addBlockedDate = () => {
    if (!newBlockedDate.date) return;
    setConfig({ ...config, blocked_dates: [...(config.blocked_dates || []), newBlockedDate] });
    setNewBlockedDate({ date: '', reason: '' });
  };

  const removeBlockedDate = (date) => {
    setConfig({ ...config, blocked_dates: (config.blocked_dates || []).filter(b => b.date !== date) });
  };

  const publicUrl = tenantSlug ? `${window.location.origin}/agendar/${tenantSlug}` : null;

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar el link');
    }
  };

  if (loading || !config) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const hours = config.business_hours || EMPTY_HOURS;

  return (
    <Layout>
      <div className="space-y-4 max-w-3xl">

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Configurar horarios de citas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
            Sede activa: <span className="font-medium">{activeBranch?.name || '—'}</span>
          </p>
        </div>

        {/* Link público */}
        <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Link público para agendar citas</p>
          {publicUrl ? (
            <div className="flex items-center gap-2">
              <input readOnly value={publicUrl} className="flex-1 text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2" />
              <button onClick={copyPublicUrl} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                <ClipboardDocumentIcon className="w-4 h-4" /> Copiar
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Cargando...</p>
          )}
          <label className="flex items-center gap-2 pt-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={config.is_public_booking_enabled}
              onChange={e => setConfig({ ...config, is_public_booking_enabled: e.target.checked })}
              className="rounded border-gray-300 dark:border-white/10"
            />
            Habilitar reserva pública de citas para esta sede
          </label>
        </div>

        {/* Días y horarios */}
        <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Días y horarios de atención</p>
          {DAYS.map(day => {
            const range = hours[day.key]?.[0];
            const isOpen = !!range;
            return (
              <div key={day.key} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-32 shrink-0">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={e => toggleDay(day.key, e.target.checked)}
                    className="rounded border-gray-300 dark:border-white/10"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{day.label}</span>
                </label>
                {isOpen ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={range.start}
                      onChange={e => updateDayRange(day.key, 'start', e.target.value)}
                      className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5"
                    />
                    <span className="text-gray-400">a</span>
                    <input
                      type="time"
                      value={range.end}
                      onChange={e => updateDayRange(day.key, 'end', e.target.value)}
                      className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Slot / capacidad / ventana */}
        <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 p-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">Duración de cada franja (min)</label>
            <select
              value={config.slot_duration_minutes}
              onChange={e => setConfig({ ...config, slot_duration_minutes: parseInt(e.target.value) })}
              className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
            >
              {[15, 30, 60, 90, 120].map(v => <option key={v} value={v}>{v} min</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">Vehículos por franja</label>
            <input
              type="number" min={1}
              value={config.capacity_per_slot}
              onChange={e => setConfig({ ...config, capacity_per_slot: parseInt(e.target.value) || 1 })}
              className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">Días de anticipación permitidos</label>
            <input
              type="number" min={1}
              value={config.advance_booking_days}
              onChange={e => setConfig({ ...config, advance_booking_days: parseInt(e.target.value) || 1 })}
              className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 block mb-1">Horas mínimas de anticipación</label>
            <input
              type="number" min={0}
              value={config.min_notice_hours}
              onChange={e => setConfig({ ...config, min_notice_hours: parseInt(e.target.value) || 0 })}
              className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Fechas bloqueadas */}
        <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Fechas bloqueadas (festivos, cierres)</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={newBlockedDate.date}
              onChange={e => setNewBlockedDate({ ...newBlockedDate, date: e.target.value })}
              className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
            />
            <input
              type="text" placeholder="Motivo (opcional)"
              value={newBlockedDate.reason}
              onChange={e => setNewBlockedDate({ ...newBlockedDate, reason: e.target.value })}
              className="flex-1 text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2"
            />
            <button onClick={addBlockedDate} className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
              <PlusIcon className="w-4 h-4" /> Agregar
            </button>
          </div>
          {(config.blocked_dates || []).length > 0 && (
            <ul className="divide-y divide-gray-100 dark:divide-white/10">
              {config.blocked_dates.map(b => (
                <li key={b.date} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{b.date} {b.reason && `— ${b.reason}`}</span>
                  <button onClick={() => removeBlockedDate(b.date)} className="text-gray-400 hover:text-red-500">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>

      </div>
    </Layout>
  );
}
