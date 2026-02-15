import React from 'react';
import { Eye, Edit, Trash2, MoreVertical } from 'lucide-react';

/**
 * Tabla de datos moderna y reutilizable
 * 
 * @param {Array} columns - Columnas [{key, label, render, align, width}]
 * @param {Array} data - Datos a mostrar
 * @param {boolean} isLoading - Estado de carga
 * @param {React.Component} emptyIcon - Icono para estado vacío
 * @param {string} emptyMessage - Mensaje cuando no hay datos
 * @param {function} onRowClick - Callback al hacer click en una fila
 * @param {Array} actions - Acciones por fila [{icon, onClick, label, variant, show}]
 * @param {boolean} hover - Efecto hover en filas
 */
const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyIcon: EmptyIcon,
  emptyMessage = 'No hay datos disponibles',
  emptySubtitle,
  onRowClick,
  actions = [],
  hover = true
}) => {
  const getActionButton = (action, item) => {
    // Verificar si la acción debe mostrarse
    if (action.show && !action.show(item)) {
      return null;
    }

    const ActionIcon = action.icon;
    const variants = {
      view: 'text-blue-600 hover:bg-blue-50',
      edit: 'text-green-600 hover:bg-green-50',
      delete: 'text-red-600 hover:bg-red-50',
      default: 'text-gray-600 hover:bg-gray-50'
    };

    const className = variants[action.variant] || variants.default;

    return (
      <button
        key={action.label}
        onClick={(e) => {
          e.stopPropagation();
          action.onClick(item);
        }}
        className={`p-2 ${className} rounded-lg transition-colors`}
        title={action.label}
      >
        {ActionIcon && <ActionIcon className="w-4 h-4" />}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
          {EmptyIcon && <EmptyIcon className="w-16 h-16 mb-4 text-gray-300" />}
          <p className="text-xl font-medium">{emptyMessage}</p>
          {emptySubtitle && <p className="text-sm text-gray-400 mt-2">{emptySubtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-${column.align || 'left'} text-xs font-semibold text-gray-700 uppercase tracking-wider ${column.width ? `w-${column.width}` : ''}`}
                >
                  {column.label}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={item.id || index}
                className={`${hover ? 'hover:bg-gray-50' : ''} transition-colors duration-150 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-${column.align || 'left'}`}
                  >
                    {column.render ? column.render(item) : (
                      <div className="text-sm text-gray-900">
                        {item[column.key]}
                      </div>
                    )}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {actions.map((action) => getActionButton(action, item))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;