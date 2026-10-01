// frontend/src/pages/combos/CombosPage.jsx
// "Inventario > Combos": agrupaciones de productos/servicios que se cargan de
// una vez en facturas, cotizaciones y órdenes de trabajo.
import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import ComboFormModal from '../../components/combos/ComboFormModal';
import { combosAPI } from '../../api/combos';
import useAuthStore from '../../store/authStore';
import { formatCurrency } from '../../utils/formatters';
import { estimateComboTotal } from '../../components/combos/comboUtils';
import { Layers, Plus, Pencil, Trash2, Loader2, Search, Power } from 'lucide-react';
import toast from 'react-hot-toast';

const WRITE_ROLES = ['admin', 'manager', 'super_admin'];

export default function CombosPage() {
  const { user } = useAuthStore();
  const canWrite = WRITE_ROLES.includes(user?.role);

  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await combosAPI.list({ include_inactive: showInactive ? 'true' : 'false' });
      setCombos(res.data.data || []);
    } catch {
      toast.error('Error al cargar los combos');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (combo) => { setEditing(combo); setModalOpen(true); };

  const handleSave = async (payload) => {
    try {
      if (editing) await combosAPI.update(editing.id, payload);
      else await combosAPI.create(payload);
      toast.success(editing ? 'Combo actualizado' : 'Combo creado');
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al guardar el combo');
    }
  };

  const toggleActive = async (combo) => {
    try {
      await combosAPI.update(combo.id, { is_active: !combo.is_active });
      toast.success(combo.is_active ? 'Combo desactivado' : 'Combo activado');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al actualizar el combo');
    }
  };

  const handleDelete = async (combo) => {
    if (!window.confirm(`¿Eliminar el combo "${combo.name}"? Los documentos donde ya se usó no cambian.`)) return;
    try {
      await combosAPI.remove(combo.id);
      toast.success('Combo eliminado');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al eliminar el combo');
    }
  };

  const term = search.trim().toLowerCase();
  const visible = term
    ? combos.filter(c => c.name.toLowerCase().includes(term)
      || (c.items || []).some(i => i.product?.name?.toLowerCase().includes(term)))
    : combos;

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Layers size={20} className="text-emerald-600" /> Combos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Agrupa productos y servicios para cargarlos de una vez en facturas, cotizaciones y órdenes de trabajo.
            </p>
          </div>
          {canWrite && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shrink-0">
              <Plus size={15} /> Nuevo combo
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar combo o producto..."
              className="w-full border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inactivos
          </label>
        </div>

        <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">{term ? 'Ningún combo coincide con la búsqueda.' : 'Todavía no hay combos.'}</p>
              {canWrite && !term && (
                <button onClick={openCreate} className="mt-2 text-sm text-emerald-600 hover:underline">+ Crear el primero</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {visible.map(c => (
                <div key={c.id} className={`flex items-start justify-between gap-3 px-4 py-3 ${c.is_active ? '' : 'opacity-60'}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{c.name}</p>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                        c.show_breakdown ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                      }`}>
                        {c.show_breakdown ? 'Desglosado' : 'Solo nombre y total'}
                      </span>
                      {!c.is_active && <span className="text-[11px] bg-gray-100 dark:bg-white/10 text-gray-600 px-1.5 py-0.5 rounded">Inactivo</span>}
                    </div>
                    {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {(c.items || []).map(i => `${Number(i.quantity)} × ${i.product?.name || 'Producto'}`).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 mr-2 whitespace-nowrap">
                      {formatCurrency(estimateComboTotal(c.items))}
                    </span>
                    {canWrite && (
                      <>
                        <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg" title="Editar">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => toggleActive(c)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg"
                          title={c.is_active ? 'Desactivar' : 'Activar'}>
                          <Power size={15} />
                        </button>
                        <button onClick={() => handleDelete(c)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400">El total es estimado con el IVA de cada producto; en el documento se calcula con las reglas de impuestos del tenant.</p>
      </div>

      <ComboFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} combo={editing} />
    </Layout>
  );
}
