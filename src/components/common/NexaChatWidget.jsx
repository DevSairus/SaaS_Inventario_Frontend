// frontend/src/components/common/NexaChatWidget.jsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/authStore';
import useNexaStore from '../../store/nexaStore';
import useTenantStore from '../../store/tenantStore';
import NexaIcon from './NexaIcon';

// Mismos roles que ALLOWED_ROLES en el backend (aiAssistant.controller.js).
// Es solo cosmético: el backend es quien realmente decide el acceso.
const NEXA_ROLES = ['admin', 'manager', 'accountant', 'super_admin'];

const TOOL_LABELS = {
  get_trial_balance: 'balance de comprobación',
  get_balance_general: 'balance general',
  get_income_statement: 'estado de resultados',
  get_accounts_receivable_summary: 'resumen de cartera',
  get_accounts_receivable_aging: 'antigüedad de cartera',
  get_expenses_summary: 'resumen de gastos',
  get_cashflow_summary: 'flujo de caja',
  get_stock_alerts: 'alertas de inventario',
  propose_create_expense: 'propuesta de gasto',
  propose_register_expense_payment: 'propuesta de abono',
};

function ToolBadges({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;
  const hasProposal = toolCalls.some((c) => c.tool_name?.startsWith('propose_'));

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {toolCalls.map((c, i) => (
        <span
          key={i}
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200"
        >
          {TOOL_LABELS[c.tool_name] || c.tool_name}
        </span>
      ))}
      {hasProposal && (
        <Link
          to="/nexa/aprobaciones"
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#CF3A0B]/10 text-[#CF3A0B] border border-[#CF3A0B]/20 font-medium hover:bg-[#CF3A0B]/20 transition-colors"
        >
          Ver en Aprobaciones →
        </Link>
      )}
    </div>
  );
}

export default function NexaChatWidget() {
  const { user } = useAuthStore();
  const { isOpen, toggleOpen, closeWidget, messages, sending, sendMessage, resetConversation, fetchPendingCount, pendingProposalsCount } = useNexaStore();
  const enabledModules = useTenantStore((s) => s.enabledModules);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  // enabledModules === null: config del tenant aún no cargó, no mostrar todavía
  // para evitar que el botón parpadee si el módulo termina estando deshabilitado.
  const moduleEnabled = enabledModules !== null && enabledModules.includes('ai_assistant');
  const allowed = moduleEnabled && user?.role && NEXA_ROLES.includes(user.role);

  useEffect(() => {
    if (allowed) fetchPendingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!allowed) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-2xl shadow-lg shadow-black/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform overflow-hidden"
          aria-label="Abrir NEXA"
        >
          <NexaIcon size={56} rounded={false} />
          {pendingProposalsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {pendingProposalsCount}
            </span>
          )}
        </button>
      )}

      {/* Panel de chat */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-40 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-2.5rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 bg-[#111116] text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <NexaIcon size={28} className="rounded-md shrink-0" />
              <div>
                <p className="text-sm font-semibold leading-tight">NEXA</p>
                <p className="text-[10px] text-white/60 leading-tight">Asistente de Pitbox</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetConversation}
                title="Nueva conversación"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <button
                onClick={closeWidget}
                title="Cerrar"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#CF3A0B] text-white rounded-br-sm'
                      : m.isError
                      ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                  <ToolBadges toolCalls={m.tool_calls} />
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-2.5 border-t border-gray-200 bg-white flex items-end gap-2 shrink-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Pregúntale algo a NEXA…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#CF3A0B]/30 focus:border-[#CF3A0B] max-h-24"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="w-9 h-9 shrink-0 rounded-xl bg-[#CF3A0B] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#b8330a] transition-colors"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
