import { create } from 'zustand';
import {
  createTicket,
  getMyTickets,
  getTicketDetail,
  addTicketMessage,
  rateTicket,
} from '../api/support';

const useSupportStore = create((set, get) => ({
  // Tickets
  tickets: [],
  ticketsPagination: { page: 1, pages: 1, total: 0 },
  ticketsLoading: false,
  currentTicket: null,
  ticketLoading: false,

  // Actions — Tickets
  fetchTickets: async (params = {}) => {
    set({ ticketsLoading: true });
    try {
      const data = await getMyTickets(params);
      if (data.success) {
        set({
          tickets: data.data,
          ticketsPagination: { page: data.page, pages: data.pages, total: data.total },
        });
      }
    } catch (err) {
      // silent
    } finally {
      set({ ticketsLoading: false });
    }
  },

  fetchTicketDetail: async (id) => {
    set({ ticketLoading: true, currentTicket: null });
    try {
      const data = await getTicketDetail(id);
      if (data.success) {
        set({ currentTicket: data.data });
      }
      return data.success;
    } catch {
      return false;
    } finally {
      set({ ticketLoading: false });
    }
  },

  createNewTicket: async (ticketData, files) => {
    try {
      const data = await createTicket(ticketData, files);
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  },

  sendMessage: async (ticketId, message, files) => {
    try {
      const data = await addTicketMessage(ticketId, message, files);
      if (data.success) {
        // Refresh ticket detail
        await get().fetchTicketDetail(ticketId);
      }
      return data.success;
    } catch {
      return false;
    }
  },

  rateTicketAction: async (ticketId, rating) => {
    try {
      const data = await rateTicket(ticketId, rating);
      if (data.success) {
        await get().fetchTicketDetail(ticketId);
      }
      return data.success;
    } catch {
      return false;
    }
  },
}));

export default useSupportStore;
