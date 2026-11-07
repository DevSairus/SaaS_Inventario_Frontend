// frontend/src/pages/payroll/VacationBookPage.jsx
//
// Libro de vacaciones: por empleado, días causados (15 por 360 días, sin
// licencias no remuneradas ni días no remunerados), disfrutados, compensados
// en dinero y disponibles, con el saldo inicial de quien entró antes de llevar
// la nómina en Pitbox. Los movimientos salen de las novedades de vacaciones
// de los periodos — ver backend services/payroll/vacationBook.service.js. La
// liquidación definitiva usa este mismo saldo.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon, CalendarDaysIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, SunIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import { employeesAPI } from '../../api/payroll';
import { formatCurrency } from '../../utils/formatters';

const days = (n) => Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const PERIOD_STATUS = { abierto: 'Periodo abierto', liquidado: 'Liquidado', emitido: 'Emitido', cerrado: 'Cerrado' };
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const balanceCls = (b) => {
  if (b.disponibles < 0) return 'text-red-600 dark:text-red-400';
  if (b.disponibles > 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-gray-900 dark:text-gray-100';
};

function EmployeeBookModal({ row, onClose, onSaved }) {
  const [book, setBook] = useState(null);
  const [opening, setOpening] = useState({ days: '', date: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await employeesAPI.getVacationBook(row.employee.id);
      setBook(r.data);
      setOpening({ days: r.data.fecha_saldo_inicial ? String(r.data.saldo_inicial) : '', date: r.data.fecha_saldo_inicial || '' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar el libro');
    }
  }, [row.employee.id]);
  useEffect(() => { load(); }, [load]);

  const save = async (clear = false) => {
    setSaving(true);
    try {
      const r = await employeesAPI.setVacationOpening(row.employee.id, clear ? { days: '', date: '' } : opening);
      setBook(r.data);
      if (clear) setOpening({ days: '', date: '' });
      toast.success(clear ? 'Saldo inicial quitado' : 'Saldo inicial guardado');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Vacaciones — ${row.employee.name}`} size="lg">
      {!book ? (
        <div className="py-12 text-center text-gray-400"><ArrowPathIcon className="h-6 w-6 animate-spin inline" /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ['Saldo inicial', book.saldo_inicial, book.fecha_saldo_inicial ? `al ${formatDate(book.fecha_saldo_inicial)}` : 'sin saldo inicial'],
              ['Causados', book.causados, `${formatDate(book.desde)} – ${formatDate(book.hasta)}`],
              ['Disfrutados', book.disfrutados, 'en tiempo'],
              ['Compensados', book.compensados, 'pagados en dinero'],
              ['Disponibles', book.disponibles, `≈ ${formatCurrency(book.valor_disponibles)}`],
            ].map(([label, value, hint], i) => (
              <div key={label} className={`rounded-lg p-3 ${i === 4 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-graphite-2'}`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold ${i === 4 ? balanceCls(book) : 'text-gray-900 dark:text-gray-100'}`}>{days(value)}</p>
                <p className="text-[11px] text-gray-500">{hint}</p>
              </div>
            ))}
          </div>
          {book.dias_no_causan > 0 && (
            <p className="text-xs text-gray-500">{days(book.dias_no_causan)} días de licencia no remunerada o no remunerados no causan vacaciones.</p>
          )}
          {book.alertas.map((a) => (
            <p key={a} className="flex gap-2 text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 rounded-lg px-3 py-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" /> {a}
            </p>
          ))}

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Movimientos</h4>
            {book.movimientos.length === 0 ? (
              <p className="text-sm text-gray-500">Sin vacaciones registradas{book.fecha_saldo_inicial ? ' desde la fecha del saldo inicial' : ''}. Se registran como novedad de vacaciones en la nómina del periodo.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-graphite-2 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Fechas</th>
                      <th className="px-3 py-2 text-left">Periodo de nómina</th>
                      <th className="px-3 py-2 text-right">Días</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {book.movimientos.map((m, i) => (
                      <tr key={`${m.periodo?.id}-${i}`}>
                        <td className="px-3 py-2">{m.tipo === 'disfrutadas' ? 'Disfrutadas' : 'Compensadas en dinero'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{m.fecha_inicio ? `${formatDate(m.fecha_inicio)} – ${formatDate(m.fecha_fin)}` : '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {m.periodo ? (
                            <Link to={`/payroll/periods/${m.periodo.id}`} className="text-blue-600 hover:underline">
                              {formatDate(m.periodo.start_date)} – {formatDate(m.periodo.end_date)}
                            </Link>
                          ) : '—'}
                          {m.periodo && <span className="block text-[11px] text-gray-500">{PERIOD_STATUS[m.periodo.status] || m.periodo.status}</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{days(m.dias)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(m.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-white/10 pt-4 space-y-3">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Saldo inicial</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Para quien entró antes de llevar la nómina en Pitbox: los días de vacaciones pendientes que tenía a una fecha de corte.
                Desde esa fecha se causan días nuevos y solo cuentan las vacaciones registradas en periodos que empiezan ese día o después.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Días pendientes</label>
                <input type="number" step="0.01" value={opening.days} onChange={(e) => setOpening((o) => ({ ...o, days: e.target.value }))} className={inputCls} placeholder="Ej. 22,5" />
              </div>
              <div className="w-44">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha de corte</label>
                <input type="date" value={opening.date} min={row.employee.hire_date} onChange={(e) => setOpening((o) => ({ ...o, date: e.target.value }))} className={inputCls} />
              </div>
              <button type="button" disabled={saving || opening.days === '' || !opening.date} onClick={() => save(false)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Guardar saldo
              </button>
              {book.fecha_saldo_inicial && (
                <button type="button" disabled={saving} onClick={() => save(true)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5">
                  Quitar saldo inicial
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

const VacationBookPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [asOf, setAsOf] = useState(todayStr());
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await employeesAPI.getVacationBooks({ include_inactive: includeInactive ? 'true' : undefined, as_of: asOf || undefined });
      setRows(r.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar el libro de vacaciones');
    } finally {
      setLoading(false);
    }
  }, [includeInactive, asOf]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.employee.name} ${r.employee.document_number}`.toLowerCase().includes(q)) : rows;
  }, [rows, search]);
  const totals = useMemo(() => ({
    disponibles: filtered.reduce((s, r) => s + Math.max(0, r.disponibles), 0),
    valor: filtered.reduce((s, r) => s + r.valor_disponibles, 0),
    alertas: filtered.filter((r) => r.alertas.length).length,
  }), [filtered]);

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Libro de vacaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Días causados, disfrutados, compensados y disponibles por empleado. Las vacaciones se registran como novedad en la nómina del periodo; la liquidación definitiva usa este saldo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            [SunIcon, 'Días disponibles', days(totals.disponibles), 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'],
            [CalendarDaysIcon, 'Valor estimado (salario actual)', formatCurrency(totals.valor), 'text-green-600 bg-green-50 dark:bg-green-900/20'],
            [ExclamationTriangleIcon, 'Empleados con alertas', totals.alertas, 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'],
          ].map(([Icon, label, value, cls]) => (
            <div key={label} className="bg-white dark:bg-graphite shadow rounded-xl p-4 flex items-center gap-3">
              <div className={`rounded-lg p-2.5 flex-shrink-0 ${cls}`}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o documento..." className={`${inputCls} pl-9`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Saldo a la fecha</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-2">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Incluir retirados
          </label>
        </div>

        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {loading && !rows.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" /><span className="text-sm">Calculando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <UserGroupIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay empleados para mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left">Empleado</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Ingreso</th>
                    <th className="px-4 py-3 text-right hidden lg:table-cell">Saldo inicial</th>
                    <th className="px-4 py-3 text-right">Causados</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Disfrutados</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Compensados</th>
                    <th className="px-4 py-3 text-right">Disponibles</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Valor estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {filtered.map((r) => (
                    <tr key={r.employee.id} onClick={() => setSelected(r)} className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {r.employee.name}
                          {!r.employee.is_active && <span className="ml-2 text-[11px] font-normal text-gray-500">(retirado)</span>}
                        </p>
                        <p className="text-xs text-gray-500">{r.employee.document_number}{r.employee.position ? ` · ${r.employee.position}` : ''}</p>
                        {r.alertas.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{r.alertas[0]}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell text-gray-600 dark:text-gray-400">{formatDate(r.employee.hire_date)}</td>
                      <td className="px-4 py-3 text-right tabular-nums hidden lg:table-cell">{r.fecha_saldo_inicial ? days(r.saldo_inicial) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{days(r.causados)}</td>
                      <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">{days(r.disfrutados)}</td>
                      <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">{days(r.compensados)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${balanceCls(r)}`}>{days(r.disponibles)}</td>
                      <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">{formatCurrency(r.valor_disponibles)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Causación: 15 días por cada 360 días de vinculación (art. 186 CST), sin contar licencias no remuneradas ni días no remunerados. El valor estimado usa el salario básico actual; con salario variable, la ley toma el promedio del último año.
        </p>
      </div>
      {selected && <EmployeeBookModal row={selected} onClose={() => setSelected(null)} onSaved={load} />}
    </Layout>
  );
};

export default VacationBookPage;
