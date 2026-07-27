import { useState, useEffect, useRef } from 'react';
import useEquivalencesStore from '../../store/equivalencesStore';
import useProductsStore from '../../store/productsStore';
import { X, Search, Plus, Users, Package } from 'lucide-react';

export default function EquivalenceGroupModal({ productId, onClose }) {
  const { groups, addToGroup, searchGroups, searchResults, isSearching, clearSearchResults } = useEquivalencesStore();
  const { searchProducts } = useProductsStore();

  const [mode, setMode] = useState('choose'); // 'choose' | 'new' | 'existing'
  const [groupName, setGroupName] = useState('');
  const [notes, setNotes] = useState('');
  const [role, setRole] = useState('equivalente');

  // Búsqueda de grupos existentes
  const [groupSearch, setGroupSearch] = useState('');
  const groupSearchTimer = useRef(null);

  // Búsqueda de productos para agregar como miembros adicionales
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const productSearchTimer = useRef(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  // Buscar grupos existentes
  useEffect(() => {
    if (groupSearchTimer.current) clearTimeout(groupSearchTimer.current);
    if (mode === 'existing') {
      groupSearchTimer.current = setTimeout(() => {
        searchGroups(groupSearch);
      }, 300);
    }
    return () => clearTimeout(groupSearchTimer.current);
  }, [groupSearch, mode, searchGroups]);

  // Buscar productos
  useEffect(() => {
    if (productSearchTimer.current) clearTimeout(productSearchTimer.current);
    if (productSearch.trim().length >= 2) {
      productSearchTimer.current = setTimeout(async () => {
        setIsSearchingProducts(true);
        const results = await searchProducts(productSearch);
        setProductResults((results || []).filter(p => p.id !== productId));
        setIsSearchingProducts(false);
      }, 300);
    } else {
      setProductResults([]);
    }
    return () => clearTimeout(productSearchTimer.current);
  }, [productSearch, productId, searchProducts]);

  const handleSelectGroup = async (group) => {
    setSubmitting(true);
    const success = await addToGroup(productId, {
      group_id: group.id,
      role
    });
    setSubmitting(false);
    if (success) onClose();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setSubmitting(true);

    // Crear grupo con el producto actual
    const success = await addToGroup(productId, {
      new_group_name: groupName.trim(),
      notes: notes.trim() || undefined,
      role: 'referencia' // El primero en el grupo es la referencia
    });

    if (success) {
      // Si hay productos seleccionados, agregarlos también
      // Necesitamos el group_id recién creado — lo obtenemos refetchando
      if (selectedProducts.length > 0) {
        // Refetch para obtener el nuevo grupo
        await useEquivalencesStore.getState().fetchEquivalences(productId);
        const newGroups = useEquivalencesStore.getState().groups;
        const newGroup = newGroups.find(g => g.group_name === groupName.trim());

        if (newGroup) {
          for (const prod of selectedProducts) {
            await addToGroup(prod.id, {
              group_id: newGroup.group_id,
              role: 'equivalente'
            });
          }
        }
      }
      onClose();
    }
    setSubmitting(false);
  };

  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Agregar Equivalencia</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mode === 'choose' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">¿Qué deseas hacer?</p>
              <button
                onClick={() => setMode('new')}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Crear grupo nuevo</p>
                  <p className="text-xs text-gray-500">Crea un nuevo grupo de equivalencia con este producto</p>
                </div>
              </button>
              {groups.length > 0 && (
                <button
                  onClick={() => setMode('existing')}
                  className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Agregar a grupo existente</p>
                    <p className="text-xs text-gray-500">Agrega este producto a un grupo que ya existe</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {mode === 'existing' && (
            <div className="space-y-3">
              <button onClick={() => setMode('choose')} className="text-sm text-blue-600 hover:underline">
                ← Volver
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Buscar grupo por nombre..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Rol selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rol:</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="equivalente">Equivalente</option>
                  <option value="referencia">Referencia</option>
                </select>
              </div>

              {isSearching && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}

              <div className="space-y-2">
                {searchResults.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group)}
                    disabled={submitting}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-xs text-gray-500">
                        {group.member_count} miembro{group.member_count !== 1 ? 's' : ''}
                        {group.members_preview?.length > 0 && (
                          <> · {group.members_preview.map(m => m.sku).join(', ')}</>
                        )}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-blue-600" />
                  </button>
                ))}
                {!isSearching && groupSearch && searchResults.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No se encontraron grupos</p>
                )}
              </div>
            </div>
          )}

          {mode === 'new' && (
            <div className="space-y-4">
              <button onClick={() => setMode('choose')} className="text-sm text-blue-600 hover:underline">
                ← Volver
              </button>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej: Pastilla freno del. Aveo/Spark 2008-2015"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre este grupo de equivalencia..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Buscar y agregar otros productos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agregar otros productos equivalentes (opcional)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto por nombre o SKU..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {isSearchingProducts && (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {productResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
                    {productResults.map((p) => {
                      const isSelected = selectedProducts.find(sp => sp.id === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleProductSelection(p)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                            isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.sku} · Stock: {p.current_stock}</p>
                          </div>
                          {isSelected && (
                            <span className="text-xs text-blue-600 font-medium">Seleccionado</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Productos seleccionados */}
              {selectedProducts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Productos a agregar:</p>
                  {selectedProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-blue-900">{p.name} ({p.sku})</span>
                      <button
                        onClick={() => toggleProductSelection(p)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'new' && (
          <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
