import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../../components/layout/Layout';
import { commissionApi } from '../../../api/workshop';
import {
  DollarSign, ChevronRight, Search, Calendar,
  CheckCircle, AlertCircle, Loader2, User, Percent
} from 'lucide-react';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const today = new Date();
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const todayStr = today.toISOString().split('T')[0];

const STATUS_LABEL = {
  recibido: { label: 'Recibido', color: 'bg-gray-100 text-gray-600' },
  en_proceso: { label: 'En proceso', color: 'bg-blue-100 text-blue-700' },
  en_espera: { label: 'En espera', color: 'bg-yellow-100 text-yellow-700' },
  listo: { label: 'Listo', color: 'bg-purple-100 text-purple-700' },
  entregado: { label: 'Entregado', color: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
};

export default function CommissionSettlementsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('new'); // 'new' | 'history'

  // ── New settlement state ──────────────────────────────────────────────────
  const [technicians, setTechnicians] = useState([]);
  const [techId, setTechId] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [percentage, setPercentage] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── History state ─────────────────────────────────────────────────────────
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [histTechId, setHistTechId] = useState('');

  // ── Load technicians ──────────────────────────────────────────────────────
  useEffect(() => {
    commissionApi.getTechnicians()
      .then(r => setTechnicians(r.data.data || []))
      .catch(() => {});
  }, []);

  // ── Preview ───────────────────────────────────────────────────────────────
  const loadPreview = useCallback(async () => {
    if (!techId || !percentage) return;
    setLoadingPreview(true);
    setPreview(null);
    setErrorMsg('');
    try {
      const res = await commissionApi.preview({ technician_id: techId, date_from: dateFrom, date_to: dateTo, commission_percentage: percentage });
      setPreview(res.data.data);
    } catch {
      setErrorMsg('Error al calcular preview');
    } finally {
      setLoadingPreview(false);
    }
  }, [techId, dateFrom, dateTo, percentage]);

  // ── Create settlement ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!preview || preview.orders.length === 0) return;
    setCreating(true);
    setErrorMsg('');
    try {
      const res = await commissionApi.create({
        technician_id: techId,
        date_from: dateFrom,
        date_to: dateTo,
        commission_percentage: parseFloat(percentage),
      });
      setSuccessMsg(`Liquidación ${res.data.data.settlement_number} creada por ${COP(res.data.data.commission_amount)}`);
      setPreview(null);
      setTechId('');
      setPercentage('');
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || 'Error al crear la liquidación');
    } finally {
      setCreating(false);
    }
  };

  // ── Load history ──────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params = histTechId ? { technician_id: histTechId } : {};
      const res = await commissionApi.list(params);
      setHistory(res.data.data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [histTechId]);

  // Reload history every time the tab is activated
  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTech = technicians.find(t => t.id === techId);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-600 rounded-xl">
            <DollarSign size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Liquidación de Comisiones</h1>
            <p className="text-sm text-gray-500">Mano de obra de técnicos · solo OTs no liquidadas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {[
            { key: 'new', label: 'Nueva liquidación' },
            { key: 'history', label: 'Historial' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSuccessMsg(''); setErrorMsg(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── NEW SETTLEMENT ── */}
        {tab === 'new' && (
          <div className="space-y-5">

            {/* Success */}
            {successMsg && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}

            {/* Form card */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Parámetros de liquidación</h2>

              {/* Técnico */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Técnico</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select value={techId} onChange={e => { setTechId(e.target.value); setPreview(null); }}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">Selecciona un técnico...</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fechas + porcentaje */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreview(null); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                  <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreview(null); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">% Comisión</label>
                  <div className="relative">
                    <Percent size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="number" min="0" max="100" step="0.5" placeholder="Ej: 15"
                      value={percentage} onChange={e => { setPercentage(e.target.value); setPreview(null); }}
                      className="w-full border border-gray-200 rounded-lg px-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Preview button */}
              <button onClick={loadPreview} disabled={!techId || !percentage || loadingPreview}
                className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition">
                {loadingPreview ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {loadingPreview ? 'Calculando...' : 'Calcular preview'}
              </button>
            </div>

            {/* Preview result */}
            {preview && (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">

                {/* Summary */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-gray-500 mb-0.5">Técnico</p>
                      <p className="font-semibold text-gray-900">
                        {selectedTech ? `${selectedTech.first_name} ${selectedTech.last_name}` : techId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5">{preview.total_orders} OT · {preview.commission_percentage}% de comisión</p>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Base mano de obra</p>
                          <p className="text-lg font-bold text-gray-700">{COP(preview.base_amount)}</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200" />
                        <div className="text-right">
                          <p className="text-xs text-gray-500">A pagar</p>
                          <p className="text-2xl font-bold text-emerald-600">{COP(preview.commission_amount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Orders list */}
                {preview.orders.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    No hay órdenes con mano de obra pendiente de liquidar
                  </div>
                ) : (
                  <div>
                    <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex justify-between text-xs font-medium text-gray-500">
                      <span>Orden</span>
                      <span>Mano de obra</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {preview.orders.map(o => {
                        const st = STATUS_LABEL[o.status] || { label: o.status, color: 'bg-gray-100 text-gray-600' };
                        return (
                          <div key={o.id} className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-medium text-gray-800">{o.order_number}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{COP(o.labor_amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Confirm button */}
                {preview.orders.length > 0 && (
                  <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between gap-4">
                    <p className="text-sm text-emerald-700">
                      Se marcarán <strong>{preview.total_orders} OT</strong> como liquidadas y no volverán a aparecer en futuras liquidaciones.
                    </p>
                    <button onClick={handleCreate} disabled={creating}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition whitespace-nowrap">
                      {creating ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
                      {creating ? 'Liquidando...' : 'Confirmar y liquidar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === 'history' && (
          <div className="space-y-4">

            {/* Filter */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por técnico</label>
                <select value={histTechId} onChange={e => setHistTechId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="">Todos los técnicos</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <button onClick={loadHistory} disabled={loadingHistory}
                className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition">
                {loadingHistory ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Buscar
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-12 text-gray-400">Cargando historial...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <DollarSign size={36} className="mx-auto mb-3 text-gray-200" />
                <p>No hay liquidaciones registradas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(s => (
                  <button key={s.id} onClick={() => navigate(`/workshop/commission-settlements/${s.id}`)}
                    className="w-full bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-emerald-200 hover:shadow-sm transition group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition">
                          <DollarSign size={18} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold text-gray-800">{s.settlement_number}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {s.technician ? `${s.technician.first_name} ${s.technician.last_name}` : '—'}
                            {s.date_from && ` · ${s.date_from} → ${s.date_to}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{s.commission_percentage}% de {COP(s.base_amount)}</p>
                          <p className="text-base font-bold text-emerald-600">{COP(s.commission_amount)}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-400 transition" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}