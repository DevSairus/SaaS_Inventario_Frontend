// frontend/src/pages/finance/SupportDocumentsPage.jsx
//
// Pantalla dedicada para los Documentos Soporte DIAN (tipo 05) — antes solo
// se podían ver/generar entrando al detalle de la Compra o el Gasto que los
// originó (PurchaseDetailPage / ExpensesPage). Acá se listan TODOS los del
// tenant (con link directo a cada uno) y se puede generar uno "directo": el
// formulario crea por debajo un Gasto mínimo (categoría 'otro',
// requires_support_document=true) y encadena el mismo SupportDocumentPanel
// que ya usa el resto de la app — sin duplicar la lógica de envío a la DIAN,
// vendedor ad-hoc, retenciones, etc.
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import NumericInput from '../../components/inputs/NumericInput';
import SupportDocumentPanel from '../../components/dian/SupportDocumentPanel';
import { getSupportDocuments } from '../../api/dian';
import { expensesAPI } from '../../api/expenses';
import { suppliersAPI } from '../../api/suppliers';
import { formatCurrency } from '../../utils/formatters';

const IVA_RATE_OPTIONS = [0, 5, 19];

const STATUS_LABEL = {
  pending: 'Pendiente',
  sending: 'Enviando',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};
const STATUS_CLASS = {
  pending: 'bg-yellow-100 text-yellow-800',
  sending: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const emptyForm = {
  description: '',
  supplier_id: '',
  subtotal: '',
  tax_rate: 19,
  retefuente_rate: 0,
  reteiva_rate: 0,
  reteica_rate: 0,
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const sourceLabel = (doc) => {
  if (doc.purchase) return `Compra ${doc.purchase.purchase_number || ''}`.trim();
  if (doc.expense) return `Gasto ${doc.expense.expense_number || ''}`.trim();
  return '—';
};
const supplierLabel = (doc) => {
  const supplier = doc.purchase?.supplier || doc.expense?.supplier;
  return supplier?.business_name || supplier?.name || '—';
};

export default function SupportDocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [suppliers, setSuppliers] = useState([]);

  const [detailDoc, setDetailDoc] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createdExpense, setCreatedExpense] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getSupportDocuments({ search: search || undefined, status: statusFilter || undefined })
      .then(res => setDocs(res.data?.data || []))
      .catch(() => toast.error('Error cargando los Documentos Soporte'))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    suppliersAPI.getAll({ is_active: true, limit: 200 })
      .then(res => setSuppliers(res.data || []))
      .catch(() => {});
  }, []);

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setForm(emptyForm);
    setCreatedExpense(null);
    load();
  };

  const handleCreateBase = async () => {
    const subtotal = parseFloat(form.subtotal) || 0;
    if (!form.description.trim() || subtotal <= 0) {
      toast('Descripción y base gravable son obligatorios');
      return;
    }
    setCreating(true);
    try {
      const taxRate = parseFloat(form.tax_rate) || 0;
      const taxAmount = round2(subtotal * taxRate / 100);
      const retefuenteAmount = round2(subtotal * (parseFloat(form.retefuente_rate) || 0) / 100);
      const reteivaAmount = round2(taxAmount * (parseFloat(form.reteiva_rate) || 0) / 100);
      const reteicaAmount = round2(subtotal * (parseFloat(form.reteica_rate) || 0) / 100);

      const res = await expensesAPI.create({
        category: 'otro',
        description: form.description.trim(),
        total_amount: subtotal + taxAmount,
        expense_date: new Date().toISOString().split('T')[0],
        supplier_id: form.supplier_id || null,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        requires_support_document: true,
        retefuente_rate: parseFloat(form.retefuente_rate) || 0,
        retefuente_amount: retefuenteAmount,
        reteiva_rate: parseFloat(form.reteiva_rate) || 0,
        reteiva_amount: reteivaAmount,
        reteica_rate: parseFloat(form.reteica_rate) || 0,
        reteica_amount: reteicaAmount,
      });
      setCreatedExpense(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error creando el registro base');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Documentos Soporte DIAN</h1>
            <p className="text-sm text-gray-500 mt-1">
              Adquisiciones a proveedores no obligados a facturar — generados desde Compras, Gastos, o directo desde aquí.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowPathIcon className="w-4 h-4" /> Actualizar
            </button>
            <button
              onClick={() => { setForm(emptyForm); setCreatedExpense(null); setShowCreateModal(true); }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4" /> Nuevo Documento Soporte
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 p-3">
          <div className="relative flex-1 min-w-[220px]">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por número o CUDS..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="sending">Enviando</option>
            <option value="accepted">Aceptado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Número</th>
                  <th className="text-left px-4 py-3">Origen</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
                ) : docs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay Documentos Soporte todavía</td></tr>
                ) : docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{doc.support_document_number || '—'}</td>
                    <td className="px-4 py-3">{sourceLabel(doc)}</td>
                    <td className="px-4 py-3">{supplierLabel(doc)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[doc.dian_status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[doc.dian_status] || 'Sin generar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetailDoc(doc)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detalle de un Documento Soporte existente */}
      {detailDoc && (
        <Modal isOpen title="Documento Soporte" onClose={() => setDetailDoc(null)} size="sm">
          <SupportDocumentPanel
            sourceType={detailDoc.purchase_id ? 'purchase' : 'expense'}
            sourceId={detailDoc.purchase_id || detailDoc.expense_id}
            requiresSupportDocument={true}
            hasSupplier={!!(detailDoc.purchase?.supplier || detailDoc.expense?.supplier)}
            onSellerLinked={load}
          />
        </Modal>
      )}

      {/* Crear Documento Soporte directo */}
      {showCreateModal && (
        <Modal isOpen title="Nuevo Documento Soporte" onClose={closeCreateModal} size="sm">
          {!createdExpense ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Registra la adquisición y genera el Documento Soporte en un solo paso, sin pasar por la pantalla de Gastos.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Ej. Compra de repuestos a persona natural"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <select
                  value={form.supplier_id}
                  onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Sin proveedor (capturar datos al generar)</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.is_obligated_to_invoice === false ? ' — no factura' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base gravable (subtotal)<span className="text-red-500 ml-0.5">*</span></label>
                  <NumericInput
                    value={form.subtotal}
                    onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% IVA</label>
                  <select
                    value={form.tax_rate}
                    onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {IVA_RATE_OPTIONS.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                IVA calculado: {formatCurrency(round2((parseFloat(form.subtotal) || 0) * (parseFloat(form.tax_rate) || 0) / 100))}
                {' · '}Total: {formatCurrency((parseFloat(form.subtotal) || 0) + round2((parseFloat(form.subtotal) || 0) * (parseFloat(form.tax_rate) || 0) / 100))}
              </p>

              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600">Retenciones (opcional)</summary>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ReteFuente %</label>
                    <NumericInput
                      value={form.retefuente_rate}
                      onChange={e => setForm(f => ({ ...f, retefuente_rate: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ReteIVA %</label>
                    <NumericInput
                      value={form.reteiva_rate}
                      onChange={e => setForm(f => ({ ...f, reteiva_rate: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ReteICA %</label>
                    <NumericInput
                      value={form.reteica_rate}
                      onChange={e => setForm(f => ({ ...f, reteica_rate: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </details>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateBase}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Guardando...' : 'Continuar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Registro base creado (<span className="font-mono">{createdExpense.expense_number}</span>). Ahora genera el Documento Soporte:
              </p>
              <SupportDocumentPanel
                sourceType="expense"
                sourceId={createdExpense.id}
                requiresSupportDocument={true}
                hasSupplier={!!createdExpense.supplier_id}
                onSellerLinked={(supplier) => setCreatedExpense(e => ({ ...e, supplier_id: supplier.id }))}
              />
              <div className="flex justify-end pt-2">
                <button
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}
