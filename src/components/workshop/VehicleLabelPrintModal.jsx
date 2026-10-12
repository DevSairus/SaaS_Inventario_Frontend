// frontend/src/components/workshop/VehicleLabelPrintModal.jsx
// Sticker QR permanente del vehículo -> portal público (/portal/vehiculo/:token).
// Se imprime con el PERFIL de impresión del equipo para stickers (impresora +
// papel, Ajustes → Impresión de etiquetas; motor en utils/labelPrinting.js):
// tamaño exacto de página, columnas, hoja adhesiva, desplazamiento de
// calibración y rotación. Antes había 4 tamaños fijos y una ventana aparte.
// El próximo servicio NO va impreso: el sticker es uno solo por vehículo y
// quedaría desactualizado; el cliente lo consulta al escanear.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Printer, QrCode, Info, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { vehiclesApi } from '../../api/workshop';
import { labelPrintingAPI } from '../../api/labelPrinting';
import useAuthStore from '../../store/authStore';
import VehicleLabelPreview from '../labels/VehicleLabelPreview';
import { vehicleLabelCss, vehicleLabelHtml, vehicleMetricsForProfile, DEFAULT_VEHICLE_OPTIONS } from './vehicleLabel';
import {
  DEFAULT_PROFILE, pickProfile, setDeviceProfileId, normalizeProfile, labelsPerPage, printHtmlLabels,
} from '../../utils/labelPrinting';

const MANAGE_ROLES = ['admin', 'manager'];

// Sin perfiles configurados: el tamaño clásico del sticker de parabrisas.
const DEFAULT_VEHICLE_PROFILE = { ...DEFAULT_PROFILE, id: 'default-vehicle', name: 'Sticker 58 × 40 mm', label_w_mm: 58, label_h_mm: 40 };

export default function VehicleLabelPrintModal({ isOpen, onClose, vehicleId }) {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenant_id;
  const canManage = MANAGE_ROLES.includes(user?.role);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ profiles: [] });
  const [profileId, setProfileId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [skip, setSkip] = useState(0);
  const [mono, setMono] = useState(true);
  const [opts, setOpts] = useState(DEFAULT_VEHICLE_OPTIONS);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      vehiclesApi.getLabel(vehicleId).then((r) => setData(r.data.data)),
      labelPrintingAPI.get()
        .then((res) => {
          const cfg = res.data || { profiles: [] };
          setConfig(cfg);
          setProfileId(pickProfile(cfg, tenantId, 'vehicle', DEFAULT_VEHICLE_PROFILE).id);
        })
        .catch(() => setProfileId(DEFAULT_VEHICLE_PROFILE.id)),
    ])
      .catch(() => { toast.error('No se pudo preparar el sticker'); onClose(); })
      .finally(() => setLoading(false));
  }, [isOpen, vehicleId, tenantId]);

  const profile = useMemo(
    () => normalizeProfile(config.profiles.find((p) => p.id === profileId) || DEFAULT_VEHICLE_PROFILE),
    [config, profileId]
  );

  // Térmica o color: lo trae el perfil (tipo de impresora) y se puede cambiar para esta impresión.
  useEffect(() => { setMono(!profile.color); setSkip(0); }, [profile]);

  if (!isOpen) return null;

  const handleProfileChange = (id) => {
    setProfileId(id);
    if (config.profiles.some((p) => p.id === id)) setDeviceProfileId(tenantId, id, 'vehicle');
  };

  const handlePrint = async () => {
    if (!data) return;
    setPrinting(true);
    try {
      const metrics = vehicleMetricsForProfile(profile);
      const accent = data.workshop?.primary_color || '#1e40af';
      await printHtmlLabels(profile, vehicleLabelHtml(data, metrics, opts), vehicleLabelCss(metrics, mono, accent), { quantity, skip });
    } catch {
      toast.error('No se pudo preparar la impresión.');
    } finally {
      setPrinting(false);
    }
  };

  const toggles = [
    { key: 'showLogo', label: 'Logo del taller' },
    { key: 'showShop', label: 'Nombre del taller' },
    { key: 'showPhone', label: 'Teléfono' },
    { key: 'showVehicle', label: 'Marca / modelo / año' },
  ];
  const perPage = labelsPerPage(profile);
  const rounded = profile.media !== 'sheet' && profile.fill_row && profile.columns > 1
    ? Math.ceil(quantity / profile.columns) * profile.columns : quantity;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-graphite rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
              <QrCode size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Imprimir sticker QR</h2>
              <p className="text-xs text-gray-500">{data?.vehicle?.plate || '...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading || !data ? (
            <div className="py-16 text-center text-sm text-gray-400">Preparando sticker...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Impresora / papel</label>
                  {config.profiles.length > 0 ? (
                    <select value={profileId || ''} onChange={(e) => handleProfileChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100">
                      {config.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-graphite-2 rounded-lg p-2.5">
                      Sin perfiles configurados: se usa un sticker de 58 × 40 mm.
                    </p>
                  )}
                  <Link to="/settings/label-printing" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1.5">
                    <Settings size={12} /> {canManage ? 'Configurar impresoras y papel' : 'Ver perfiles de impresión'}
                  </Link>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Tinta</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[[true, 'Térmica (B/N)'], [false, 'Color']].map(([val, lbl]) => (
                      <button key={lbl} onClick={() => setMono(val)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
                          mono === val
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 shadow-sm'
                            : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Contenido</label>
                  <div className="space-y-2 bg-gray-50 dark:bg-graphite-2 rounded-xl p-3">
                    {toggles.map((t) => (
                      <label key={t.key} className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={opts[t.key]}
                          onChange={(e) => setOpts((o) => ({ ...o, [t.key]: e.target.checked }))}
                          className="w-4 h-4 rounded accent-blue-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t.label}</span>
                      </label>
                    ))}
                    <p className="text-[11px] text-gray-400 pt-1">La placa y el QR siempre van.</p>
                  </div>
                </div>

                <div className="flex gap-6 flex-wrap">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Cantidad</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold text-lg">−</button>
                      <span className="w-10 text-center text-sm font-medium text-gray-800 dark:text-gray-200">{quantity}</span>
                      <button onClick={() => setQuantity((q) => Math.min(30, q + 1))}
                        className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold text-lg">+</button>
                    </div>
                    {rounded !== quantity && (
                      <p className="text-[11px] text-gray-500 mt-1">Se imprimirán {rounded} para completar filas.</p>
                    )}
                  </div>
                  {profile.media === 'sheet' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Ya usadas en la hoja</label>
                      <input type="number" min="0" max={perPage - 1} value={skip}
                        onChange={(e) => setSkip(Math.max(0, Math.min(perPage - 1, parseInt(e.target.value, 10) || 0)))}
                        className="w-20 text-center border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg py-2 text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Vista previa</label>
                <div className="bg-gray-100 dark:bg-graphite-2 rounded-xl p-4 flex items-center justify-center min-h-[200px] overflow-hidden">
                  <VehicleLabelPreview profile={profile} data={data} opts={opts} mono={mono} maxWidthPx={250} />
                </div>
                <p className="text-[11px] text-gray-400 mt-2 break-all">QR → {data.portal_url}</p>

                <div className="flex gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 mt-3">
                  <Info size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed space-y-1">
                    <p>En el cuadro de impresión: Márgenes "Ninguno", Escala 100% y sin encabezados ni pies de página.</p>
                    <p>Para el parabrisas usa etiqueta de <strong>poliéster o vinilo</strong>: el papel térmico directo se borra con el sol.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-graphite-2 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-graphite hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handlePrint} disabled={!data || printing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
            <Printer size={16} /> {printing ? 'Preparando...' : `Imprimir ${rounded} sticker${rounded !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
