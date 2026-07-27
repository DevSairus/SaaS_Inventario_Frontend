import { useEffect, useState } from 'react';
import useEquivalencesStore from '../../store/equivalencesStore';
import EquivalenceGroupModal from './EquivalenceGroupModal';
import { Users, Plus, Trash2, Star, Package, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

export default function EquivalencesSection({ productId }) {
  const { groups, isLoading, fetchEquivalences, removeFromGroup, updateMember } = useEquivalencesStore();
  const [showModal, setShowModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (productId) fetchEquivalences(productId);
  }, [productId, fetchEquivalences]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Grupos de Equivalencia</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {groups.length === 0
              ? 'Este producto no tiene equivalencias registradas'
              : `${groups.length} grupo${groups.length !== 1 ? 's' : ''} de equivalencia`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Agregar Equivalencia
        </button>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin grupos de equivalencia</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Crea un grupo para relacionar este producto con otros repuestos intercambiables
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Plus className="w-4 h-4" />
              Crear primer grupo
            </button>
          </div>
        </div>
      )}

      {/* Groups list */}
      {groups.map((group) => (
        <div key={group.group_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Group header */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleGroup(group.group_id)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{group.group_name}</h4>
                <p className="text-xs text-gray-500">
                  {group.members.length} miembro{group.members.length !== 1 ? 's' : ''}
                  {group.group_notes && ` · ${group.group_notes}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {confirmDelete === group.group_id ? (
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
                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(group.group_id); }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Salir de este grupo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {expandedGroups[group.group_id] ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {/* Members table */}
          {expandedGroups[group.group_id] && (
            <div className="border-t border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.members.map((member) => {
                    const isCurrentProduct = member.product_id === productId;
                    const stockNum = parseFloat(member.available_stock || 0);
                    const stockColor = stockNum <= 0 ? 'text-red-600' : stockNum <= 3 ? 'text-orange-500' : 'text-green-600';

                    return (
                      <tr
                        key={member.member_id}
                        className={`${isCurrentProduct ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}
                      >
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            member.role === 'referencia'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {member.role === 'referencia' && <Star className="w-3 h-3" />}
                            {member.role === 'referencia' ? 'Referencia' : 'Equivalente'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm font-mono text-gray-700">{member.sku}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-900">
                          {member.name}
                          {isCurrentProduct && (
                            <span className="ml-2 text-xs text-blue-600 font-medium">(actual)</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right font-medium">
                          <span className={stockColor}>{stockNum}</span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right text-gray-700">{COP(member.sale_price)}</td>
                        <td className="px-4 py-2.5 text-center">
                          {!isCurrentProduct && member.role !== 'referencia' && (
                            <button
                              onClick={() => handleSetReference(group.group_id, member.member_id)}
                              className="p-1 text-gray-400 hover:text-amber-600 rounded hover:bg-amber-50 transition-colors"
                              title="Marcar como referencia"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

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