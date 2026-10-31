import React, { useState, useRef, useMemo, useCallback } from 'react';
import api from '../../api/axios';
import useRemoteOptions from '../../hooks/useRemoteOptions';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  FloatingPanel, HighlightMatch, matchesSearch, useClickOutside, useListNavigation, optionCls,
} from './searchDropdown';

const MAX_RESULTS = 50;

/**
 * Input de búsqueda de clientes con autocomplete
 *
 * Props:
 * - customers: array de clientes
 * - value: ID del cliente seleccionado
 * - onChange: función que recibe el ID del cliente
 * - placeholder: texto placeholder
 * - className: clases adicionales
 * - remote: con 2+ letras también busca en el servidor (default true), para
 *   encontrar clientes que no vinieron en la lista precargada (que suele
 *   ser solo una página).
 */
const CustomerSearchInput = ({
  customers = [],
  value,
  onChange,
  placeholder = "Buscar cliente...",
  className = "",
  remote = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Cliente elegido desde la búsqueda remota (no está en `customers`).
  const [picked, setPicked] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedCustomer = customers.find(c => String(c.id) === String(value))
    || (picked && String(picked.id) === String(value) ? picked : null);

  const { options: remoteOptions } = useRemoteOptions(
    (q) => api.get('/customers', { params: { search: q, limit: 30 } }).then(r => r.data?.data || []),
    remote && isOpen ? searchTerm : '',
  );

  const { list, total } = useMemo(() => {
    let all = searchTerm
      ? customers.filter(c => matchesSearch(searchTerm, c.full_name, c.business_name, c.tax_id, c.email, c.phone))
      : customers;
    if (searchTerm && remoteOptions.length) {
      const ids = new Set(all.map(c => String(c.id)));
      all = all.concat(remoteOptions.filter(c => !ids.has(String(c.id))));
    }
    return { list: all.slice(0, MAX_RESULTS), total: all.length };
  }, [customers, searchTerm, remoteOptions]);

  const close = useCallback(() => setIsOpen(false), []);

  const handleSelect = (customer) => {
    setPicked(customer);
    onChange(String(customer.id));
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const nav = useListNavigation({
    count: list.length,
    open: isOpen,
    resetKey: searchTerm,
    onPick: (i) => list[i] && handleSelect(list[i]),
    onOpen: () => setIsOpen(true),
    onClose: () => { setIsOpen(false); setSearchTerm(''); },
  });

  useClickOutside([wrapperRef, nav.listRef], close, isOpen);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          autoComplete="off"
          value={selectedCustomer && !searchTerm ? selectedCustomer.full_name : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (!e.target.value && selectedCustomer) {
              onChange('');
            }
          }}
          onFocus={(e) => { setIsOpen(true); if (selectedCustomer) e.target.select(); }}
          onKeyDown={nav.onKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
        />

        {(selectedCustomer || searchTerm) && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 text-gray-400 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <FloatingPanel
        ref={nav.listRef}
        anchorRef={wrapperRef}
        open={isOpen && (list.length > 0 || !!searchTerm)}
        minWidth={280}
        footer={total > list.length ? `Mostrando ${list.length} de ${total}. Escribe más para afinar.` : null}
      >
        {list.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-500 text-center">
            No se encontraron clientes con "{searchTerm}"
          </p>
        ) : list.map((customer, index) => (
          <div
            key={customer.id}
            data-index={index}
            role="option"
            aria-selected={String(customer.id) === String(value)}
            onClick={() => handleSelect(customer)}
            onMouseEnter={() => nav.setActiveIndex(index)}
            className={optionCls(index === nav.activeIndex, String(customer.id) === String(value))}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  <HighlightMatch text={customer.full_name} query={searchTerm} />
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {customer.tax_id && (
                    <span className="text-xs text-gray-500">
                      <HighlightMatch text={customer.tax_id} query={searchTerm} />
                    </span>
                  )}
                  {customer.email && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      <HighlightMatch text={customer.email} query={searchTerm} />
                    </span>
                  )}
                </div>
              </div>
              {customer.customer_type === 'company' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">
                  Empresa
                </span>
              )}
            </div>
          </div>
        ))}
      </FloatingPanel>
    </div>
  );
};

export default CustomerSearchInput;
