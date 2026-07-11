// frontend/src/pages/nexa/NexaApprovalsPage.jsx
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import { aiAssistantAPI, PROPOSAL_ACTION_LABELS, PROPOSAL_STATUS_LABELS } from '../../api/aiAssistant';
import useNexaStore from '../../store/nexaStore';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  executed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-gray-100 text-gray-600 border-gray-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TABS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'all', label: 'Todas' },
];

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function PayloadPreview({ actionType, payload }) {
  if (!payload) return null;
  if (actionType === 'create_expense') {
    return (
      <ul className="text-[12px] text-gray-500 space-y-0.5">
        <li><span className="text-gray-400">Categoría:</span> {payload.category}</li>
        <li><span className="text-gray-400">Monto:</span> ${Number(payload.total_amount).toLocaleString('es-CO')}</li>
        {payload.expense_date && <li><span className="text-gray-400">Fecha:</span> {payload.expense_date}</li>}
      </ul>
    );
  }
  if (actionType === 'register_expense_payment') {
    return (
      <ul className="text-[12px] text-gray-500 space-y-0.5">
        <li><span className="text-gray-400">Monto:</span> ${Number(payload.amount).toLocaleString('es-CO')}</li>
        {payload.payment_method && <li><span className="text-gray-400">Método:</span> {payload.payment_method}</li>}
      </ul>
    );
  }
  if (actionType === 'regenerate_journal_entry') {
    const SOURCE_LABELS = { sale: 'Venta', purchase: 'Compra', expense: 'Gasto', cash_session: 'Cierre de caja' };
    return (
      <ul className="text-[12px] text-gray-500 space-y-0.5">
        <li><span className="text-gray-400">Origen:</span> {SOURCE_LABELS[payload.source_type] || payload.source_type}</li>
        <li><span className="text-gray-400">Se creará en estado:</span> borrador (draft) — no queda contabilizado hasta postearlo desde el Libro Diario</li>
      </ul>
    );
  }
  return null;
}

export default function NexaApprovalsPage() {
  const [tab, setTab] = useState('pending');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const fetchPendingCount = useNexaStore((s) => s.fetchPendingCount);

  const load = useCallback(async (status) => {
    setLoading(true);
    try {
      const res = await aiAssistantAPI.listProposals(status);
      setProposals(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudieron cargar las propuestas de NEXA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await aiAssistantAPI.approveProposal(id);
      toast.success('Propuesta aprobada y ejecutada');
      await load(tab);
      fetchPendingCount();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo aprobar la propuesta');
      await load(tab);
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    setActingId(id);
    try {
      await aiAssistantAPI.rejectProposal(id);
      toast.success('Propuesta rechazada');
      await load(tab);
      fetchPendingCount();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo rechazar la propuesta');
    } finally {
      setActingId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#CF3A0B] to-[#E84510] flex items-center justify-center shrink-0">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Aprobaciones NEXA</h1>
              <p className="text-[12.5px] text-gray-500 leading-tight">
                Revisa y confirma las propuestas que preparó el asistente antes de que se registren.
              </p>
            </div>
          </div>
          <button
            onClick={() => load(tab)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Actualizar"
          >
            <ArrowPathIcon className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                tab === t.value
                  ? 'border-[#CF3A0B] text-[#CF3A0B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando propuestas…</div>
        ) : proposals.length === 0 ? (
          <div className="py-16 text-center">
            <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {tab === 'pending' ? 'No hay propuestas pendientes por ahora.' : 'Todavía no hay propuestas.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {proposals.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {PROPOSAL_ACTION_LABELS[p.action_type] || p.action_type}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[p.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {PROPOSAL_STATUS_LABELS[p.status] || p.status}
                    </span>
                  </div>
                  <p className="text-[13.5px] text-gray-800 font-medium mb-1">{p.summary}</p>
                  <PayloadPreview actionType={p.action_type} payload={p.payload} />
                  <p className="text-[11.5px] text-gray-400 mt-1.5">
                    Preparada {formatDate(p.created_at)}
                    {p.creator ? ` · a partir del chat de ${p.creator.first_name} ${p.creator.last_name}` : ''}
                  </p>
                  {p.status === 'failed' && p.error_message && (
                    <p className="text-[11.5px] text-red-600 mt-1">Error: {p.error_message}</p>
                  )}
                  {p.reviewer && p.status !== 'pending' && (
                    <p className="text-[11.5px] text-gray-400">
                      Revisada por {p.reviewer.first_name} {p.reviewer.last_name} · {formatDate(p.reviewed_at)}
                    </p>
                  )}
                </div>

                {p.status === 'pending' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={actingId === p.id}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 transition-colors flex items-center justify-center"
                      title="Rechazar"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={actingId === p.id}
                      className="h-8 px-3 rounded-lg bg-[#CF3A0B] text-white text-[12.5px] font-medium hover:bg-[#b8330a] disabled:opacity-40 transition-colors flex items-center gap-1"
                      title="Aprobar y ejecutar"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Aprobar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
