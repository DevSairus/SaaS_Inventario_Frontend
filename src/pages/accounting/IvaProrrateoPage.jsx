// frontend/src/pages/accounting/IvaProrrateoPage.jsx
//
// Prorrateo del IVA descontable (art. 490 E.T.): proporción de ingresos
// gravados + exentos sobre el total del período de IVA, aplicada al IVA común
// (gastos), y el ajuste contable en borrador. Ver
// backend/src/services/tax/ivaProrrateo.service.js.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ivaProrrateoAPI } from '../../api/accounting';
import { formatCurrency } from '../../utils/formatters';
import useAuthStore from '../../store/authStore';

const STAFF_ROLES = ['admin', 'super_admin', 'accountant'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const SIZE = { bimestral: 2, cuatrimestral: 4 };
const inputCls = 'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const periodLabel = (periodicity, n) => {
  const size = SIZE[periodicity] || 2;
  const start = (n - 1) * size;
  return `${n}. ${MONTHS[start]}–${MONTHS[start + size - 1]}`;
};

const Row = ({ label, value, strong, hint }) => (
  <div className={`flex justify-between gap-4 py-2 ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
    <span>
      {label}
      {hint && <span className="block text-xs font-normal text-gray-500">{hint}</span>}
    </span>
    <span className="whitespace-nowrap">{value}</span>
  </div>
);

const IvaProrrateoPage = () => {
  const { user } = useAuthStore();
  const isStaff = STAFF_ROLES.includes(user?.role);
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState(null); // null = período en curso
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (y = year, p = period) => {
    try {
      setLoading(true);
      const res = await ivaProrrateoAPI.report({ year: y, period: p || undefined });
      setReport(res.data);
      setPeriod(res.data.period);
      setAmount(String(res.data.non_deductible_iva || ''));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error calculando el prorrateo');
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const createEntry = async () => {
    try {
      setSaving(true);
      const res = await ivaProrrateoAPI.createEntry({ year, period, amount: Number(amount) || 0 });
      toast.success(res.message || 'Ajuste creado en borrador');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creando el ajuste');
    } finally {
      setSaving(false);
    }
  };

  const periodicity = report?.periodicity || 'bimestral';
  const periodCount = periodicity === 'cuatrimestral' ? 3 : 6;
  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Prorrateo de IVA</h1>
          <p className="text-sm text-gray-500 mt-1">
            Si vende bienes o servicios excluidos además de gravados o exentos, el IVA de los gastos generales solo es descontable en la proporción de los ingresos gravados y exentos (art. 490 E.T.).
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Año</span>
            <select value={year} onChange={(e) => { const y = Number(e.target.value); setYear(y); load(y, period); }} className={inputCls}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Período ({periodicity})</span>
            <select value={period || ''} onChange={(e) => { const p = Number(e.target.value); setPeriod(p); load(year, p); }} className={inputCls}>
              {Array.from({ length: periodCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{periodLabel(periodicity, n)}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-gray-500 self-end">
            La periodicidad se cambia en <Link to="/settings" className="text-blue-600 hover:underline">Ajustes → Impuestos</Link>.
          </p>
        </div>

        {loading || !report ? (
          <p className="text-sm text-gray-500">Calculando…</p>
        ) : !report.iva_responsible ? (
          <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            El negocio no es responsable de IVA: el IVA pagado ya va al costo o al gasto y no hay nada que prorratear.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5 divide-y divide-gray-100 text-sm">
              <h2 className="text-base font-semibold text-gray-900 pb-2">Ingresos del período</h2>
              <Row label="Gravados" value={formatCurrency(report.income.gravado)} />
              <Row label="Exentos" value={formatCurrency(report.income.exento)} hint="Dan derecho a descontar IVA" />
              <Row label="Excluidos" value={formatCurrency(report.income.excluido)} hint="No dan derecho a descontar IVA" />
              <p className="text-xs text-gray-500 py-2">Ventas, remisiones y notas débito del período, menos notas crédito y devoluciones de clientes aprobadas.</p>
              <Row label="Total" value={formatCurrency(report.income.total)} strong />
              <Row label="Proporción descontable" value={`${report.deductible_pct} %`} strong />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 divide-y divide-gray-100 text-sm">
              <h2 className="text-base font-semibold text-gray-900 pb-2">IVA común</h2>
              <Row label="IVA de gastos" value={formatCurrency(report.common_iva_breakdown?.expenses ?? report.common_iva)} hint={`${report.common_iva_expenses} gasto(s) con IVA`} />
              <Row label="IVA de compras de insumos" value={formatCurrency(report.common_iva_breakdown?.raw_material_purchases || 0)} hint="Productos marcados como Insumo de uso común" />
              {(report.common_iva_breakdown?.raw_material_returns || 0) > 0 && (
                <Row label="Menos devoluciones de insumos al proveedor" value={`− ${formatCurrency(report.common_iva_breakdown.raw_material_returns)}`} />
              )}
              <Row label="IVA común del período" value={formatCurrency(report.common_iva)} strong />
              <Row label="Descontable" value={formatCurrency(report.deductible_iva)} />
              <Row label="No descontable (al gasto)" value={formatCurrency(report.non_deductible_iva)} strong />

              <div className="pt-3 space-y-3">
                {report.entry ? (
                  <p className="text-sm text-green-700">
                    Ajuste {report.entry.entry_number} ({report.entry.status === 'draft' ? 'borrador' : 'contabilizado'}) ya registrado para este período.{' '}
                    <Link to="/accounting/journal-entries" className="text-blue-600 hover:underline">Ver asientos</Link>
                  </p>
                ) : isStaff ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">Valor del ajuste</span>
                      <input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
                      <span className="text-xs text-gray-500">Puede corregirlo si hay otro IVA común que Pitbox no identifica. El IVA de activos fijos productivos no va aquí: se descuenta en renta (art. 258-1 E.T.).</span>
                    </label>
                    <button
                      onClick={createEntry}
                      disabled={saving || !(Number(amount) > 0)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Creando…' : 'Crear ajuste en borrador'}
                    </button>
                    <p className="text-xs text-gray-500">
                      D 511595 IVA no descontable / C 135515 IVA descontable. Queda en borrador para que el contador lo revise y contabilice.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Solo administración o contabilidad pueden crear el ajuste.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default IvaProrrateoPage;
