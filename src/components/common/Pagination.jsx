import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BTN = 'px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-graphite-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed';

const fmt = (n) => Number(n || 0).toLocaleString('es-CO');

/**
 * Paginación común. Props mínimas: currentPage, totalPages, onPageChange.
 * Opcionales:
 *  - totalItems + pageSize: muestra "Mostrando 51–100 de 1.234".
 *  - onPageSizeChange (+ pageSizeOptions): selector de filas por página.
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  className = '',
}) => {
  const pages = [];
  const maxVisible = 5;
  const lastPage = Math.max(1, totalPages || 1);

  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(lastPage, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const hasCount = totalItems != null && pageSize;
  // Sin conteo ni selector de tamaño, una sola página no necesita controles.
  if (lastPage <= 1 && !hasCount) return null;
  if (hasCount && totalItems === 0) return null;

  const from = hasCount ? (currentPage - 1) * pageSize + 1 : 0;
  const to = hasCount ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
        {hasCount ? (
          <span>
            Mostrando <span className="font-medium">{fmt(from)}–{fmt(to)}</span> de{' '}
            <span className="font-medium">{fmt(totalItems)}</span>
          </span>
        ) : (
          <span>
            Página <span className="font-medium">{currentPage}</span> de{' '}
            <span className="font-medium">{lastPage}</span>
          </span>
        )}
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-graphite-2 text-gray-700 dark:text-gray-300"
            >
              {(pageSizeOptions.includes(pageSize) ? pageSizeOptions : [...pageSizeOptions, pageSize].sort((a, b) => a - b))
                .map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            por página
          </label>
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex flex-wrap gap-2">
          {/* Botón Primera Página */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`${BTN} hidden sm:inline-block`}
            title="Primera página"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={BTN}
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {startPage > 1 && (
            <>
              <button onClick={() => onPageChange(1)} className={BTN}>
                1
              </button>
              {startPage > 2 && (
                <span className="px-2 py-2 text-gray-500 dark:text-gray-500">...</span>
              )}
            </>
          )}

          {pages.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                page === currentPage
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-graphite-2 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          {endPage < lastPage && (
            <>
              {endPage < lastPage - 1 && (
                <span className="px-2 py-2 text-gray-500 dark:text-gray-500">...</span>
              )}
              <button onClick={() => onPageChange(lastPage)} className={BTN}>
                {lastPage}
              </button>
            </>
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= lastPage}
            className={BTN}
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Botón Última Página */}
          <button
            onClick={() => onPageChange(lastPage)}
            disabled={currentPage >= lastPage}
            className={`${BTN} hidden sm:inline-block`}
            title="Última página"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
