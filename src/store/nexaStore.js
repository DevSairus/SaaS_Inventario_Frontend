import { create } from 'zustand';
import { aiAssistantAPI } from '../api/aiAssistant';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: 'Hola, soy NEXA 👋 Puedo consultar tus números (cartera, gastos, flujo de caja, contabilidad) y preparar propuestas de gastos para que las apruebes. ¿En qué te ayudo?',
};

const useNexaStore = create((set, get) => ({
  isOpen: false,
  conversationId: null,
  messages: [WELCOME_MESSAGE],
  sending: false,
  pendingProposalsCount: 0,

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  closeWidget: () => set({ isOpen: false }),
  openWidget: () => set({ isOpen: true }),

  resetConversation: () => set({ conversationId: null, messages: [WELCOME_MESSAGE] }),

  sendMessage: async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || get().sending) return;

    const userMsg = { role: 'user', content: trimmed };
    set((state) => ({ messages: [...state.messages, userMsg], sending: true }));

    try {
      const res = await aiAssistantAPI.sendMessage(trimmed, get().conversationId);
      const { conversation_id, reply, tool_calls } = res.data;

      set((state) => ({
        conversationId: conversation_id,
        messages: [...state.messages, { role: 'assistant', content: reply, tool_calls }],
        sending: false,
      }));

      // Si NEXA preparó alguna propuesta, refrescamos el contador de pendientes
      // para que la campanita se actualice sin esperar al próximo polling.
      if (tool_calls?.some((c) => c.tool_name?.startsWith('propose_'))) {
        get().fetchPendingCount();
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'NEXA no pudo procesar tu mensaje. Intenta de nuevo en un momento.';
      set((state) => ({
        messages: [...state.messages, { role: 'assistant', content: message, isError: true }],
        sending: false,
      }));
    }
  },

  fetchPendingCount: async () => {
    try {
      const res = await aiAssistantAPI.listProposals('pending');
      set({ pendingProposalsCount: (res.data || []).length });
    } catch (error) {
      // Silencioso: si el módulo no está activo o el rol no tiene acceso,
      // simplemente no mostramos badge — no rompemos el resto de la UI.
    }
  },
}));

export default useNexaStore;
