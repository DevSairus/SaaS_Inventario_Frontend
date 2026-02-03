import { useState } from 'react';

/**
 * Componente de vista de árbol para categorías jerárquicas
 * Permite expandir/colapsar subcategorías
 */
function CategoryTreeView({ categories, onEdit, onDelete, onToggleActive }) {
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Construir árbol jerárquico
  const buildTree = (items, parentId = null) => {
    return items
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }));
  };

  const tree = buildTree(categories);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const CategoryNode = ({ category, level = 0 }) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);

    return (
      <div>
        {/* Nodo principal */}
        <div
          className={`flex items-center gap-3 py-3 px-4 hover:bg-purple-50 transition-colors rounded-lg ${
            level > 0 ? 'ml-' + (level * 8) : ''
          }`}
          style={{ marginLeft: `${level * 32}px` }}
        >
          {/* Botón expandir/colapsar */}
          {hasChildren && (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-1 hover:bg-purple-100 rounded transition-colors"
            >
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Icono de carpeta */}
          <div className={`${!hasChildren ? 'ml-5' : ''}`}>
            {hasChildren ? (
              <svg
                className={`w-5 h-5 ${
                  isExpanded ? 'text-purple-600' : 'text-gray-400'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 11-2 0 1 1 0 012 0zm-1 4a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Nombre y descripción */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">
                {category.name}
              </span>
              {!category.is_active && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Inactiva
                </span>
              )}
              {hasChildren && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded-full">
                  {category.children.length} sub
                </span>
              )}
            </div>
            {category.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {category.description}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(category)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>

            <button
              onClick={() => onToggleActive(category)}
              className={`p-2 rounded-lg transition-colors ${
                category.is_active
                  ? 'text-orange-600 hover:bg-orange-50'
                  : 'text-green-600 hover:bg-green-50'
              }`}
              title={category.is_active ? 'Desactivar' : 'Activar'}
            >
              {category.is_active ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={() => onDelete(category)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Renderizar hijos si está expandido */}
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children.map(child => (
              <CategoryNode key={child.id} category={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Vista de Árbol</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedIds(new Set(categories.map(c => c.id)))}
              className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
            >
              Expandir Todo
            </button>
            <button
              onClick={() => setExpandedIds(new Set())}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Colapsar Todo
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {tree.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p>No hay categorías</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map(category => (
              <CategoryNode key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryTreeView;