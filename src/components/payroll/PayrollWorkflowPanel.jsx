// frontend/src/components/payroll/PayrollWorkflowPanel.jsx
//
// 6.1 — Flujograma de nómina: las etapas del período con el resultado de sus
// validaciones previas, quién avanzó cada una y la bitácora. Los errores
// bloquean pasar a liquidado/emitido; las advertencias solo informan.
import React, { useState, useEffect, useCallback } from 'react';
import { payrollPeriodsAPI } from '../../api/payroll';

const STATE_STYLE = {
  done: { dot: 'bg-green-500', text: 'text-green-700', label: 'Hecha' },
  current: { dot: 'bg-indigo-600', text: 'text-indigo-700', label: 'Siguiente' },
  open: { dot: 'bg-amber-400', text: 'text-amber-700', label: 'Por validar' },
  pending: { dot: 'bg-gray-300', text: 'text-gray-500', label: 'Pendiente' },
};
const LEVEL_STYLE = {
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  ok: 'bg-green-50 text-green-800 border-green-200',
};
const LEVEL_LABEL = { error: 'Bloquea', warning: 'Aviso', ok: 'OK' };
const EVENT_LABEL = { status_change: 'Avanzó', advance_blocked: 'Bloqueado por validaciones', emission_rejected: 'Emisión con rechazos' };

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '');

const PayrollWorkflowPanel = ({ periodId, status }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await payrollPeriodsAPI.getWorkflow(periodId);
      setData(res.data);
    } catch (e) {
      setError(true);
    }
  }, [periodId]);

  // Se recarga al cambiar el estado del período (cada avance deja eventos nuevos).
  useEffect(() => { load(); }, [load, status]);

  if (error) return null; // el flujograma es informativo: si falla no estorba el período
  if (!data) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Flujograma del período</h2>
        <button onClick={load} className="text-xs text-indigo-600 hover:text-indigo-800">Revalidar</button>
      </div>

      <ol className="space-y-3">
        {data.stages.map((s, i) => {
          const st = STATE_STYLE[s.state];
          return (
            <li key={s.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`mt-1 h-3 w-3 rounded-full ${st.dot}`} />
                {i < data.stages.length - 1 && <span className="flex-1 w-px bg-gray-200 mt-1" />}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="text-sm font-medium text-gray-900">{s.label}</span>
                  <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
                  {s.responsible && <span className="text-xs text-gray-500">por {s.responsible}{s.completed_at ? ` · ${fmt(s.completed_at)}` : ''}</span>}
                </div>
                {s.checks.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {s.checks.map((c) => (
                      <li key={c.key} className={`text-xs border rounded-lg px-2.5 py-1.5 ${LEVEL_STYLE[c.level]}`}>
                        <span className="font-semibold">{LEVEL_LABEL[c.level]}:</span> {c.message}
                        {c.items?.length > 0 && c.level !== 'ok' && (
                          <span className="block mt-0.5 opacity-80">{c.items.slice(0, 8).join(', ')}{c.items.length > 8 ? ` y ${c.items.length - 8} más` : ''}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div>
        <button onClick={() => setShowLog((v) => !v)} className="text-xs font-medium text-gray-600 hover:text-gray-900">
          {showLog ? 'Ocultar bitácora' : `Ver bitácora (${data.events.length})`}
        </button>
        {showLog && (
          <ul className="mt-2 divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {data.events.length === 0 && <li className="px-3 py-2 text-xs text-gray-400">Sin eventos todavía</li>}
            {data.events.map((e) => (
              <li key={e.id} className="px-3 py-2 text-xs text-gray-600">
                <span className="font-medium text-gray-800">{EVENT_LABEL[e.event_type] || e.event_type}</span>
                {e.to_status ? ` → ${e.to_status}` : ''} · {e.user_name || 'Sistema'} · {fmt(e.created_at)}
                {e.note && <span className="block text-gray-500 mt-0.5">{e.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PayrollWorkflowPanel;
