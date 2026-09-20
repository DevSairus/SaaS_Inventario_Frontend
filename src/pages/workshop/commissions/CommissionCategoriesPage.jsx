import { useState, useEffect, useCallback } from 'react';
import Layout from '../../../components/layout/Layout';
import { commissionCategoriesApi, commissionApi } from '../../../api/workshop';
import {
  Tag, Plus, Pencil, Trash2, Loader2, CheckCircle, AlertCircle,
  Users, GitBranch, X,
} from 'lucide-react';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

export default function CommissionCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // categoría en edición o null (nueva)
  const [form, setForm] = useState({ name: '', code: '', default_percentage: '' });
  const [saving, setSaving] = useState(false);

  const [ratesCategory, setRatesCategory] = useState(null); // categoría con panel de tarifas abierto
  const [technicians, setTechnicians] = useState([]);
  const [rateInputs, setRateInputs] = useState({}); // { technician_id: percentage }
  const [savingRates, setSavingRates] = useState(false);

  const [diagramSystems, setDiagramSystems] = useState([]);
  const [diagramMappings, setDiagramMappings] = useState({}); // { system: commission_category_id }
  const [savingMappings, setSavingMappings] = useState(false);
  const [loadingDiagrams, setLoadingDiagrams] = useState(false);

  const notify = (msg, isError = false) => {
    if (isError) { setErrorMsg(msg); setSuccessMsg(''); }
    else { setSuccessMsg(msg); setErrorMsg(''); }
    setTimeout(() => { setErrorMsg(''); setSuccessMsg(''); }, 4000);
  };

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await commissionCategoriesApi.list();
      setCategories(res.data.data || []);
    } catch {
      notify('Error al cargar categorías de comisión', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    commissionApi.getTechniciansFiltered('technician')
      .then(r => setTechnicians(r.data.data || []))
      .catch(() => {});
  }, []);

  const loadDiagramMappingData = useCallback(async () => {
    setLoadingDiagrams(true);
    try {
      const [sysRes, mapRes] = await Promise.all([
        commissionCategoriesApi.getDiagramSystems(),
        commissionCategoriesApi.getDiagramMappings(),
      ]);
      setDiagramSystems(sysRes.data.data || []);
      const map = {};
      for (const m of (mapRes.data.data || [])) map[m.system] = m.commission_category_id;
      setDiagramMappings(map);
    } catch {
      notify('Error al cargar el mapeo de diagramas', true);
    } finally {
      setLoadingDiagrams(false);
    }
  }, []);

  useEffect(() => { loadDiagramMappingData(); }, [loadDiagramMappingData]);

  // ── CRUD categorías ──────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', default_percentage: '' }); setShowModal(true); };
  const openEdit = (cat) => { setEditing(cat); setForm({ name: cat.name, code: cat.code || '', default_percentage: cat.default_percentage }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return notify('El nombre es requerido', true);
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim() || null, default_percentage: parseFloat(form.default_percentage) || 0 };
      if (editing) await commissionCategoriesApi.update(editing.id, payload);
      else await commissionCategoriesApi.create(payload);
      notify(editing ? 'Categoría actualizada' : 'Categoría creada');
      setShowModal(false);
      loadCategories();
    } catch (e) {
      notify(e?.response?.data?.message || 'Error al guardar la categoría', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    try {
      await commissionCategoriesApi.remove(cat.id);
      notify('Categoría eliminada');
      loadCategories();
    } catch (e) {
      notify(e?.response?.data?.message || 'Error al eliminar la categoría', true);
    }
  };

  // ── Tarifas por técnico ──────────────────────────────────────────────────
  const openRates = (cat) => {
    setRatesCategory(cat);
    const inputs = {};
    for (const t of technicians) {
      const existing = (cat.technician_rates || []).find(r => r.technician_id === t.id);
      inputs[t.id] = existing ? existing.percentage : '';
    }
    setRateInputs(inputs);
  };

  const handleSaveRates = async () => {
    setSavingRates(true);
    try {
      const rates = Object.entries(rateInputs).map(([technician_id, percentage]) => ({ technician_id, percentage: percentage === '' ? null : percentage }));
      await commissionCategoriesApi.setTechnicianRates(ratesCategory.id, rates);
      notify('Tarifas por técnico actualizadas');
      setRatesCategory(null);
      loadCategories();
    } catch (e) {
      notify(e?.response?.data?.message || 'Error al guardar tarifas', true);
    } finally {
      setSavingRates(false);
    }
  };

  // ── Mapeo de diagramas ───────────────────────────────────────────────────
  const handleSaveMappings = async () => {
    setSavingMappings(true);
    try {
      const mappings = Object.entries(diagramMappings)
        .filter(([, catId]) => !!catId)
        .map(([system, commission_category_id]) => ({ system, commission_category_id }));
      await commissionCategoriesApi.setDiagramMappings(mappings);
      notify('Mapeo de diagramas actualizado');
    } catch (e) {
      notify(e?.response?.data?.message || 'Error al guardar el mapeo', true);
    } finally {
      setSavingMappings(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-xl">
              <Tag size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Comisiones · Categorías</h1>
              <p className="text-sm text-gray-500">Frenos, Suspensión, Motor... el % que gana cada técnico por tipo de trabajo</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition">
            <Plus size={15} /> Nueva categoría
          </button>
        </div>

        {successMsg && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Tabla de categorías */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin categorías aún</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-5 py-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    {cat.is_default && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-500">fallback "Otros"</span>
                    )}
                    {!cat.is_active && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-500">inactiva</span>
                    )}
                    <span className="text-sm text-gray-500">{cat.default_percentage}%</span>
                    {cat.technician_rates && cat.technician_rates.length > 0 && (
                      <span className="text-xs text-teal-600">{cat.technician_rates.length} override(s) por técnico</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openRates(cat)} title="Tarifas por técnico"
                      className="p-1.5 text-gray-400 hover:text-teal-600 transition"><Users size={15} /></button>
                    <button onClick={() => openEdit(cat)} title="Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-500 transition"><Pencil size={15} /></button>
                    {!cat.is_default && (
                      <button onClick={() => handleDelete(cat)} title="Eliminar"
                        className="p-1.5 text-gray-400 hover:text-red-500 transition"><Trash2 size={15} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mapeo desde diagramas */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Mapeo desde diagramas de intervención</h2>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Cuando un técnico marca un punto en el diagrama (ej. "Suspensión delantera"), el ítem generado
            hereda automáticamente la categoría de comisión que definas acá.
          </p>
          {loadingDiagrams ? (
            <div className="text-center py-6 text-gray-400 text-sm">Cargando sistemas...</div>
          ) : diagramSystems.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No hay diagramas configurados aún</div>
          ) : (
            <div className="space-y-2">
              {diagramSystems.map(system => (
                <div key={system} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600 font-mono">{system}</span>
                  <select value={diagramMappings[system] || ''}
                    onChange={e => setDiagramMappings(prev => ({ ...prev, [system]: e.target.value }))}
                    className={`${inputCls} max-w-[220px]`}>
                    <option value="">Sin mapear (usa "Otros")</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button onClick={handleSaveMappings} disabled={savingMappings}
                className="mt-2 flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition">
                {savingMappings ? <Loader2 size={14} className="animate-spin" /> : null}
                Guardar mapeo
              </button>
            </div>
          )}
        </div>

        {/* Modal crear/editar categoría */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">{editing ? 'Editar categoría' : 'Nueva categoría'}</h3>
                <button onClick={() => setShowModal(false)}><X size={16} className="text-gray-400" /></button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Frenos" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Código (opcional)</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="Ej: frenos" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">% de comisión por defecto</label>
                <input type="number" min="0" max="100" step="0.5" value={form.default_percentage}
                  onChange={e => setForm(f => ({ ...f, default_percentage: e.target.value }))}
                  placeholder="Ej: 15" className={inputCls} />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition">
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* Modal tarifas por técnico */}
        {ratesCategory && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Tarifas por técnico · {ratesCategory.name}</h3>
                <button onClick={() => setRatesCategory(null)}><X size={16} className="text-gray-400" /></button>
              </div>
              <p className="text-xs text-gray-400">
                Dejá el campo vacío para usar el % por defecto de la categoría ({ratesCategory.default_percentage}%).
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {technicians.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700">{t.first_name} {t.last_name}</span>
                    <input type="number" min="0" max="100" step="0.5"
                      placeholder={`${ratesCategory.default_percentage}%`}
                      value={rateInputs[t.id] ?? ''}
                      onChange={e => setRateInputs(prev => ({ ...prev, [t.id]: e.target.value }))}
                      className={`${inputCls} w-24 text-right`} />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveRates} disabled={savingRates}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition">
                {savingRates ? <Loader2 size={15} className="animate-spin" /> : null}
                {savingRates ? 'Guardando...' : 'Guardar tarifas'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
