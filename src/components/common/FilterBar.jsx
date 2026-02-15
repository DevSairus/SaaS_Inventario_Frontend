import React from 'react';
import { Search, Filter } from 'lucide-react';

/**
 * Barra de filtros moderna y reutilizable
 * 
 * @param {string} searchValue - Valor del campo de búsqueda
 * @param {function} onSearchChange - Callback cuando cambia la búsqueda
 * @param {string} searchPlaceholder - Placeholder del campo de búsqueda
 * @param {Array} filters - Array de filtros [{type, value, onChange, options, placeholder, icon}]
 */
const FilterBar = ({ 
  searchValue = '', 
  onSearchChange, 
  searchPlaceholder = 'Buscar...',
  filters = []
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
      <div className={`grid grid-cols-1 ${filters.length > 0 ? `md:grid-cols-${Math.min(filters.length + 1, 4)}` : ''} gap-4`}>
        {/* Búsqueda */}
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        )}

        {/* Filtros dinámicos */}
        {filters.map((filter, index) => {
          const FilterIcon = filter.icon || Filter;
          
          if (filter.type === 'select') {
            return (
              <div key={index} className="relative">
                <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filter.value || ''}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none bg-white"
                >
                  <option value="">{filter.placeholder || 'Todos'}</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          
          if (filter.type === 'date') {
            return (
              <div key={index} className="relative">
                <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={filter.value || ''}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder={filter.placeholder}
                />
              </div>
            );
          }

          if (filter.type === 'text') {
            return (
              <div key={index} className="relative">
                <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filter.value || ''}
                  onChange={(e) => filter.onChange(e.target.value)}
                  placeholder={filter.placeholder}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default FilterBar;