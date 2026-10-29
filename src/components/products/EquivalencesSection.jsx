import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useEquivalencesStore from '../../store/equivalencesStore';
import EquivalenceGroupModal from './EquivalenceGroupModal';
import { Users, Plus, Trash2, Star, Package, ChevronDown, ChevronUp, ExternalLink, Truck } from 'lucide-react';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const QTY = (n) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO');
};

// Último costo aterrizado del producto; si no está, el de la última compra recibida
const lastCost = (member) => member.last_purchase_cost || member.last_purchase?.unit_cost || 0;

// Para la tabla: sin compras registradas (p. ej. productos importados con su costo)
// no hay último costo, así que se muestra el promedio marcándolo como tal
const tableCost = (member) => {
  const last = lastCost(member);
  if (last) return { value: last, isAverage: false };
  if (member.average_cost) return { value: member.average_cost, isAverage: true };
  return null;
};

const NoPrice = () => (
  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">Sin precio</span>
);

const stockColor = (member) => {
  if (!member.track_inventory) return 'text-gray-400 dark:text-gray-500';
  const stock = member.available_stock;
  if (stock <= 0) return 'text-red-600 dark:text-red-400';
  if (stock <= Math.max(member.min_stock || 0, 3)) return 'text-orange-500 dark:text-orange-400';
  return 'text-green-600 dark:text-green-400';
};

function SummaryItem({ label, value, hint }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-500 uppercase">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-500">{hint}</p>}
    </div>
  );
}

function MemberSummary({ member, onOpenProduct, onOpenPurchase }) {
  const last = member.last_purchase;
  return (
    <div className="px-4 py-4 bg-gray-50 dark:bg-white/5 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryItem
          label="Stock total"
          value={member.track_inventory ? QTY(member.current_stock) : 'No controla inventario'}
          hint={member.in_process_stock > 0 ? `${QTY(member.in_process_stock)} en trámite` : null}
        />
        <SummaryItem label="Disponible" value={member.track_inventory ? QTY(member.available_stock) : '—'} />
        <SummaryItem label="Stock mínimo" value={QTY(member.min_stock)} />
        <SummaryItem label="Precio de venta" value={member.sale_price > 0 ? COP(member.sale_price) : <NoPrice />} />
        <SummaryItem label="Costo promedio" value={member.average_cost ? COP(member.average_cost) : '—'} />
        <SummaryItem
          label="Último costo"
          value={lastCost(member) ? COP(lastCost(member)) : '—'}
          hint={lastCost(member) ? null : 'sin compras registradas'}
        />
        <SummaryItem label="Marca" value={member.brand || '—'} />
        <SummaryItem label="Proveedores" value={member.suppliers_count || '—'} hint={member.suppliers_count ? 'con compras recibidas' : null} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-start gap-2 text-sm">
          <Truck className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
          {last ? (
            <p className="text-gray-700 dark:text-gray-300">
              Última compra a <span className="font-medium text-gray-900 dark:text-gray-100">{last.supplier_name || 'proveedor sin nombre'}</span>
              {' '}el {fmtDate(last.date)}: {QTY(last.quantity)} × {COP(last.unit_cost)}
              {last.supplier_phone && <span className="text-gray-500 dark:text-gray-500"> · Tel. {last.supplier_phone}</span>}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-500">Sin compras recibidas de este producto</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {last?.purchase_id && (
            <button
              onClick={() => onOpenPurchase(last.purchase_id)}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Ver compra
            </button>
          )}
          {onOpenProduct && (
            <button
              onClick={() => onOpenProduct(member.product_id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver ficha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EquivalencesSection({ productId, readOnly = false }) {
  const navigate = useNavigate();
  const { groups, isLoading, fetchEquivalences, removeFromGroup, updateMember } = useEquivalencesStore();
  const [showModal, setShowModal] = useState(false);
  // Los grupos se muestran abiertos; aquí se guardan los que el usuario colapsa
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedMember, setExpandedMember] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (productId) fetchEquivalences(productId);
    setExpandedMember(null);
  }, [productId, fetchEquivalences]);

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleMember = (memberId) => {
    setExpandedMember(prev => (prev === memberId ? null : memberId));
  };

  const handleRemove = async (groupId) => {
    const success = await removeFromGroup(productId, groupId);
    if (success) setConfirmDelete(null);
  };

  const handleSetReference = async (groupId, memberId) => {
    await updateMember(productId, groupId, memberId, { role: 'referencia' });
  };

  if (isLoading && groups.length === 0) {
    return (
      <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Grupos de Equivalencia</h3>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
            {groups.length === 0
              ? 'Este producto no tiene equivalencias registradas'
              : `${groups.length} grupo${groups.length !== 1 ? 's' : ''} de equivalencia · clic en un producto para ver su resumen`}
          </p>
        </div>
        {!readOnly && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agregar Equivalencia
        </button>
        )}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-8">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Sin grupos de equivalencia</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">
              Crea un grupo para relacionar este producto con otros repuestos intercambiables
            </p>
            {!readOnly && <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-100"
            >
              <Plus className="w-4 h-4" />
              Crear primer grupo
            </button>}
          </div>
        </div>
      )}

      {/* Groups list */}
      {groups.map((group) => {
        const isOpen = !collapsedGroups[group.group_id];
        const others = group.members.filter(m => m.product_id !== productId);
        const groupAvailable = group.members.reduce((sum, m) => sum + (m.track_inventory ? Math.max(m.available_stock, 0) : 0), 0);
        const othersWithStock = others.filter(m => m.track_inventory && m.available_stock > 0).length;

        return (
        <div key={group.group_id} className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          {/* Group header */}
          <div
            className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            onClick={() => toggleGroup(group.group_id)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{group.group_name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {group.members.length} miembro{group.members.length !== 1 ? 's' : ''}
                  {' · '}{QTY(groupAvailable)} disponible{groupAvailable !== 1 ? 's' : ''} en el grupo
                  {' · '}{othersWithStock} equivalente{othersWithStock !== 1 ? 's' : ''} con stock
                  {group.group_notes && ` · ${group.group_notes}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {readOnly ? null : confirmDelete === group.group_id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">¿Salir del grupo?</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(group.group_id); }}
                    className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    Sí
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                    className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded hover:bg-gray-200"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(group.group_id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Salir de este grupo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {/* Members table */}
          {isOpen && (
            <div className="border-t border-gray-100 dark:border-white/10 overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Producto</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Disponible</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Precio</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Costo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Último proveedor</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {group.members.map((member) => {
                    const isCurrentProduct = member.product_id === productId;
                    const isExpanded = expandedMember === member.member_id;
                    const cost = tableCost(member);

                    return (
                      <Fragment key={member.member_id}>
                      <tr
                        onClick={() => toggleMember(member.member_id)}
                        className={`cursor-pointer transition-colors ${
                          isCurrentProduct ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        } ${member.is_active === false ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            member.role === 'referencia'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                          }`}>
                            {member.role === 'referencia' && <Star className="w-3 h-3" />}
                            {member.role === 'referencia' ? 'Referencia' : 'Equivalente'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {member.name}
                            {isCurrentProduct && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-300 font-medium">(actual)</span>
                            )}
                            {member.is_active === false && (
                              <span className="ml-2 text-xs text-gray-500 font-medium">(inactivo)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            <span className="font-mono">{member.sku}</span>
                            {member.brand && ` · ${member.brand}`}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right font-medium">
                          {member.track_inventory ? (
                            <>
                              <span className={stockColor(member)}>{QTY(member.available_stock)}</span>
                              {member.in_process_stock > 0 && (
                                <p className="text-xs font-normal text-gray-500 dark:text-gray-500">de {QTY(member.current_stock)}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-gray-700 dark:text-gray-300">
                          {member.sale_price > 0 ? COP(member.sale_price) : <NoPrice />}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-gray-700 dark:text-gray-300">
                          {cost ? (
                            <>
                              {COP(cost.value)}
                              {cost.isAverage && <p className="text-xs text-gray-500 dark:text-gray-500">promedio</p>}
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                          {member.last_purchase ? (
                            <>
                              <p className="truncate max-w-[180px]" title={member.last_purchase.supplier_name || ''}>
                                {member.last_purchase.supplier_name || '—'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">{fmtDate(member.last_purchase.date)}</p>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            {!readOnly && !isCurrentProduct && member.role !== 'referencia' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSetReference(group.group_id, member.member_id); }}
                                className="p-1 text-gray-400 hover:text-amber-600 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                title="Marcar como referencia"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                            {!isCurrentProduct && (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/products/${member.product_id}`); }}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Abrir ficha del producto"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <MemberSummary
                              member={member}
                              onOpenProduct={isCurrentProduct ? null : (id) => navigate(`/products/${id}`)}
                              onOpenPurchase={(id) => navigate(`/purchases/${id}`)}
                            />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        );
      })}

      {/* Modal */}
      {showModal && (
        <EquivalenceGroupModal
          productId={productId}
          onClose={() => {
            setShowModal(false);
            fetchEquivalences(productId);
          }}
        />
      )}
    </div>
  );
}
