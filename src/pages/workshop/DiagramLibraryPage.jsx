// frontend/src/pages/workshop/DiagramLibraryPage.jsx
// "Taller > Biblioteca de diagramas": el admin del taller elige qué
// diagramas usa (los desactivados no aparecen en el selector de la OT ni de
// la cotización) y en qué categorías adicionales aplica cada uno (ej. una
// suspensión de automóvil que también se ve en camionetas). Los ajustes son
// solo de este taller -- ver diagram_template_settings en el backend.
import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { diagramTemplatesApi } from '../../api/workshop';
import { VEHICLE_TYPE_LABELS } from '../../components/workshop/maintenanceStatus';
import { SYSTEM_LABELS } from '../../components/workshop/diagramLabels';
import { Layers, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DiagramLibraryPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicleType, setVehicleType] = useState('automovil');
  const [savingIds, setSavingIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await diagramTemplatesApi.list({ all: 1 });
      setTemplates(res.data.data || []);
    } catch {
      toast.error('Error al cargar la biblioteca de diagramas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Guarda y actualiza el estado local; si falla, recarga para no dejar la
  // pantalla mostrando algo que no quedó guardado.
  const save = async (changes) => {
    const ids = changes.map(c => c.diagram_template_id);
    setSavingIds(prev => new Set([...prev, ...ids]));
    setTemplates(prev => prev.map(t => {
      const change = changes.find(c => c.diagram_template_id === t.id);
      return change ? { ...t, ...change } : t;
    }));
    try {
      await diagramTemplatesApi.updateSettings(changes);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo guardar el cambio');
      load();
    } finally {
      setSavingIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
    }
  };

  const toggleEnabled = (t) => save([{ diagram_template_id: t.id, is_enabled: !t.is_enabled }]);

  const toggleExtraType = (t, vt) => {
    const extra = t.extra_vehicle_types.includes(vt)
      ? t.extra_vehicle_types.filter(x => x !== vt)
      : [...t.extra_vehicle_types, vt];
    save([{ diagram_template_id: t.id, extra_vehicle_types: extra }]);
  };

  const own = templates.filter(t => t.vehicle_type === vehicleType);
  const borrowed = templates.filter(t => t.vehicle_type !== vehicleType && t.extra_vehicle_types.includes(vehicleType));

  const setAll = (is_enabled) => {
    const changes = own.filter(t => t.is_enabled !== is_enabled).map(t => ({ diagram_template_id: t.id, is_enabled }));
    if (changes.length) save(changes);
  };

  const countByType = templates.reduce((acc, t) => {
    const c = acc[t.vehicle_type] || { enabled: 0, total: 0 };
    return { ...acc, [t.vehicle_type]: { enabled: c.enabled + (t.is_enabled ? 1 : 0), total: c.total + 1 } };
  }, {});

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Layers size={20} className="text-blue-600" /> Biblioteca de diagramas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Activa solo los diagramas que usa tu taller: los desactivados no aparecen al diagnosticar una OT o cotización.
            También puedes indicar en qué otras categorías aplica cada diagrama.
          </p>
        </div>

        {/* Tabs por tipo de vehículo */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(VEHICLE_TYPE_LABELS).map(([k, label]) => (
            <button key={k} onClick={() => setVehicleType(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                vehicleType === k
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-graphite-2 dark:text-gray-300 dark:border-white/10'
              }`}>
              {label}
              {countByType[k] ? <span className="ml-1.5 text-xs opacity-70">{countByType[k].enabled}/{countByType[k].total}</span> : null}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-graphite-2 border border-gray-100 dark:border-white/10 rounded-xl">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : own.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-400">
              No hay diagramas propios de {VEHICLE_TYPE_LABELS[vehicleType].toLowerCase()}.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-gray-50 dark:border-white/5 text-xs">
                <button onClick={() => setAll(true)} className="text-blue-600 hover:underline">Activar todos</button>
                <button onClick={() => setAll(false)} className="text-gray-500 hover:underline">Desactivar todos</button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {own.map(t => (
                  <div key={t.id} className={`px-4 py-3 ${t.is_enabled ? '' : 'opacity-60'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{t.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{SYSTEM_LABELS[t.system] || t.system}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={t.is_enabled}
                        aria-label={`${t.is_enabled ? 'Desactivar' : 'Activar'} ${t.name}`}
                        disabled={savingIds.has(t.id)}
                        onClick={() => toggleEnabled(t)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                          t.is_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-white/20'
                        }`}>
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${t.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {t.is_enabled && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[11px] text-gray-400">También aplica en:</span>
                        {Object.entries(VEHICLE_TYPE_LABELS)
                          .filter(([k]) => k !== t.vehicle_type)
                          .map(([k, label]) => {
                            const on = t.extra_vehicle_types.includes(k);
                            return (
                              <button key={k} type="button"
                                disabled={savingIds.has(t.id)}
                                onClick={() => toggleExtraType(t, k)}
                                aria-pressed={on}
                                className={`text-[11px] px-2 py-0.5 rounded-full border transition disabled:opacity-50 ${
                                  on
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:text-gray-400 dark:border-white/10'
                                }`}>
                                {label}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!loading && borrowed.length > 0 && (
          <div className="bg-white dark:bg-graphite-2 border border-gray-100 dark:border-white/10 rounded-xl">
            <p className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-50 dark:border-white/5">
              De otras categorías que también aplican en {VEHICLE_TYPE_LABELS[vehicleType].toLowerCase()}
            </p>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {borrowed.map(t => (
                <div key={t.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${t.is_enabled ? '' : 'opacity-60'}`}>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-100">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {VEHICLE_TYPE_LABELS[t.vehicle_type]} · {SYSTEM_LABELS[t.system] || t.system}
                      {!t.is_enabled && ' · desactivado'}
                    </p>
                  </div>
                  <button onClick={() => toggleExtraType(t, vehicleType)} disabled={savingIds.has(t.id)}
                    className="text-xs text-gray-500 hover:text-red-600 hover:underline shrink-0 disabled:opacity-50">
                    Quitar de {VEHICLE_TYPE_LABELS[vehicleType].toLowerCase()}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
