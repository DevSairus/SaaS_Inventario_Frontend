import React from 'react';
import { 
  formatNumber, 
  formatCurrency, 
  formatPercentage, 
  formatInteger,
  formatStock 
} from '../../utils/numberFormat';

/**
 * Tabla inteligente que formatea automáticamente según el tipo de columna
 * 
 * Uso:
 * <SmartTable 
 *   columns={[
 *     { key: 'name', label: 'Nombre' },
 *     { key: 'price', label: 'Precio', type: 'currency' },
 *     { key: 'stock', label: 'Stock', type: 'stock' }
 *   ]}
 *   data={products}
 * />
 */
const SmartTable = ({ 
  columns, 
  data, 
  onRowClick,
  emptyMessage = 'No hay datos para mostrar',
  className = ''
}) => {
  
  /**
   * Detecta automáticamente el tipo de columna si no está especificado
   */
  const detectColumnType = (key) => {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('price') || 
        lowerKey.includes('cost') || 
        lowerKey.includes('amount') ||
        lowerKey.includes('total') ||
        lowerKey.includes('subtotal') ||
        lowerKey.includes('value')) {
      return 'currency';
    }
    
    if (lowerKey.includes('percentage') || 
        lowerKey.includes('margin') ||
        lowerKey.includes('percent')) {
      return 'percentage';
    }
    
    if (lowerKey.includes('stock') || 
        lowerKey.includes('quantity') ||
        lowerKey.includes('qty')) {
      return 'stock';
    }
    
    return 'text';
  };
  
  /**
   * Formatea el valor según el tipo
   */
  const formatValue = (value, type, row) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      
      case 'number':
        return formatNumber(value, 2);
      
      case 'percentage':
        return formatPercentage(value);
      
      case 'integer':
        return formatInteger(value);
      
      case 'stock':
        return formatStock(value, row.unit_of_measure || 'unit');
      
      case 'text':
      default:
        return value;
    }
  };
  
  /**
   * Renderiza una celda
   */
  const renderCell = (row, column) => {
    // Si la columna tiene un render personalizado, usarlo
    if (column.render) {
      return column.render(row[column.key], row);
    }
    
    // Detectar tipo si no está especificado
    const type = column.type || detectColumnType(column.key);
    
    // Formatear valor
    const formattedValue = formatValue(row[column.key], type, row);
    
    // Aplicar clase CSS si está especificada
    const cellClass = column.className || '';
    
    return <span className={cellClass}>{formattedValue}</span>;
  };
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${column.headerClassName || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr
                key={row.id || index}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4">
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SmartTable;

/**
 * Versión con paginación incluida
 */
export const SmartTableWithPagination = ({ 
  columns, 
  data, 
  pagination,
  onPageChange,
  ...props 
}) => {
  return (
    <>
      <SmartTable columns={columns} data={data} {...props} />
      
      {pagination && pagination.pages > 1 && (
        <div className="bg-white rounded-b-xl border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> a{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              de <span className="font-medium">{pagination.total}</span> registros
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};