// frontend/src/pages/payroll/ContractAlertsPage.jsx
//
// Mejora #5 (Mejoras-Nomina-Sin-PILA-Nexora.md): alertas de vencimiento de
// contrato a término fijo. Vista/listado simple, sin job en segundo plano
// (se consulta al entrar a la página) — consume
// GET /payroll/employees/contracts/expiring, que ya filtra por
// contract_type='2' y contract_end_date dentro de la ventana elegida.
// No usa store propio: es una consulta de solo lectura, sin CRUD ni
// paginación server-side, así que el patrón liviano (useState + fetch en
// useEffect) alcanza — mismo criterio que los catálogos de filtro de
// PayrollDocumentsPage.jsx.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI } from '../../api/payroll';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const WINDOW_OPTIONS = [15, 30, 60, 90];

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const urgencyBadge = (item) => {
  if (item.is_overdue) {
    return { label: `Vencido hace ${Math.abs(item.days_remaining)} día${Math.abs(item.days_remaining) !== 1 ? 's' : ''}`, style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  }
  if (item.days_remaining <= 7) {
    return { label: `Vence en ${item.days_remaining} día${item.days_remaining !== 1 ? 's' : ''}`, style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  }
  if (item.days_remaining <= 30) {
    return { label: `Vence en ${item.days_remaining} días`, style: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' };
  }
  return { label: `Vence en ${item.days_remaining} días`, style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
};

const ContractAlertsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchAlerts = useCallback(async (windowDays) => {
    setIsLoading(true);
    try {
      const response = await employeesAPI.getExpiringContracts(windowDays);
      setItems(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al obtener contratos por vencer');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(days);
  }, [days, fetchAlerts]);

  const overdueCount = items.filter((i) => i.is_overdue).length;
  const upcomingCount = items.length - overdueCount;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alertas de vencimiento de contrato</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">
              Empleados activos con contrato a término fijo cuya fecha de fin ya venció o está por vencer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-500">Ventana:</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {WINDOW_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt} días</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 flex-shrink-0 text-red-600 bg-red-50 dark:bg-red-900/20">
              <ExclamationTriangleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-500">Ya vencidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{overdueCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 flex-shrink-0 text-amber-600 bg-amber-50 dark:bg-amber-900/20">
              <CalendarDaysIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-500">Por vencer</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{upcomingCount}</p>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {isLoading && !items.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Buscando contratos...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <UserGroupIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay contratos a término fijo por vencer en los próximos {days} días</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Empleado</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Documento</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Cargo</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Fecha fin de contrato</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {items.map((item) => {
                    const fullName = [item.first_name, item.other_names, item.first_surname, item.second_surname].filter(Boolean).join(' ');
                    const badge = urgencyBadge(item);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => navigate('/payroll/employees')}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                              {item.first_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[220px]">{fullName}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600 dark:text-gray-400 text-xs">{item.document_number}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{item.position || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(item.contract_end_date)}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.style}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-graphite-2 border-t-2 border-gray-200 dark:border-white/10 text-sm">
                    <td colSpan={5} className="px-4 py-3 text-gray-500 dark:text-gray-500">
                      {items.length} contrato{items.length !== 1 ? 's' : ''} en la ventana de {days} días
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ContractAlertsPage;
