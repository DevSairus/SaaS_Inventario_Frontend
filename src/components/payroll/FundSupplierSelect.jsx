// frontend/src/components/payroll/FundSupplierSelect.jsx
//
// Selector de fondo de seguridad social (EPS, AFP, ARL, Caja, SENA, ICBF,
// fondo de cesantías). Los fondos se registran como proveedores: son el
// tercero de los aportes en los comprobantes de nómina. La lista se pide una
// sola vez por sesión y la comparten todos los selectores de la pantalla.
import React, { useEffect, useState } from 'react';
import { suppliersAPI } from '../../api/suppliers';

let suppliersPromise = null;
const loadSuppliers = () => {
  if (!suppliersPromise) {
    suppliersPromise = suppliersAPI.getAll({ is_active: true, limit: 1000, sort_by: 'name', sort_order: 'ASC' })
      .then((res) => res.data || [])
      .catch(() => {
        suppliersPromise = null;
        return [];
      });
  }
  return suppliersPromise;
};

const supplierLabel = (s) => `${s.business_name || s.name}${s.tax_id ? ` — NIT ${s.tax_id}` : ''}`;

const FundSupplierSelect = ({ name, value, onChange, placeholder = 'Sin asignar', className }) => {
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    let active = true;
    loadSuppliers().then((list) => { if (active) setSuppliers(list); });
    return () => { active = false; };
  }, []);

  return (
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      className={className || 'w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'}
    >
      <option value="">{placeholder}</option>
      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>{supplierLabel(s)}</option>
      ))}
    </select>
  );
};

export default FundSupplierSelect;
