// frontend/src/components/payroll/FundSupplierSelect.jsx
//
// Selector de fondo de seguridad social (EPS, AFP, ARL, Caja, SENA, ICBF,
// fondo de cesantías). Los fondos se registran como proveedores: son el
// tercero de los aportes en los comprobantes de nómina. Solo se listan los
// proveedores marcados con el tipo `fundType` (Proveedores → "Entidad de
// nómina"). La lista se pide una sola vez por sesión y la comparten todos los
// selectores de la pantalla.
import React, { useEffect, useState } from 'react';
import { suppliersAPI } from '../../api/suppliers';

export const FUND_TYPE_LABELS = {
  eps: 'EPS',
  afp: 'Fondo de pensión',
  cesantias: 'Fondo de cesantías',
  arl: 'ARL',
  ccf: 'Caja de compensación',
  sena: 'SENA',
  icbf: 'ICBF',
};

let suppliersPromise = null;
const loadSuppliers = () => {
  if (!suppliersPromise) {
    suppliersPromise = suppliersAPI.getAll({ is_active: true, payroll_only: true, limit: 1000, sort_by: 'name', sort_order: 'ASC' })
      .then((res) => res.data || [])
      .catch(() => {
        suppliersPromise = null;
        return [];
      });
  }
  return suppliersPromise;
};

// Después de cargar el catálogo o editar proveedores, para volver a pedir la lista.
export const resetFundSuppliersCache = () => { suppliersPromise = null; };

const supplierLabel = (s) => `${s.business_name || s.name}${s.tax_id ? ` — NIT ${s.tax_id}` : ''}`;

const FundSupplierSelect = ({ name, value, onChange, fundType, placeholder = 'Sin asignar', className, reloadKey }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadSuppliers().then((list) => { if (active) { setSuppliers(list); setLoaded(true); } });
    return () => { active = false; };
  }, [reloadKey]);

  const options = fundType
    ? suppliers.filter((s) => (s.payroll_fund_types || []).includes(fundType))
    : suppliers;

  return (
    <>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        className={className || 'w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'}
      >
        <option value="">{placeholder}</option>
        {/* El valor ya asignado se conserva aunque el proveedor no esté marcado con este tipo. */}
        {value && loaded && !options.some((s) => s.id === value) && (
          <option value={value}>Proveedor asignado (no marcado como {FUND_TYPE_LABELS[fundType] || 'entidad de nómina'})</option>
        )}
        {options.map((s) => (
          <option key={s.id} value={s.id}>{supplierLabel(s)}</option>
        ))}
      </select>
      {loaded && options.length === 0 && (
        <p className="mt-1 text-xs text-amber-600">
          No hay proveedores marcados como {FUND_TYPE_LABELS[fundType] || 'entidad de nómina'}. Márquelos en Proveedores o cargue el catálogo desde Configuración de Nómina.
        </p>
      )}
    </>
  );
};

export default FundSupplierSelect;
