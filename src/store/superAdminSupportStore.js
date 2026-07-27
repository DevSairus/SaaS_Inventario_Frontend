import { create } from 'zustand';
import {
  getFaqCategories,
  createFaqCategory,
  updateFaqCategory,
  deleteFaqCategory,
  createFaqArticle,
  updateFaqArticle,
  deleteFaqArticle,
  getSupportTickets,
  getSupportTicketDetail,
  updateSupportTicket,
  addSupportTicketMessage,
  getSupportStats,
} from '../api/superadminSupport';

const useSuperAdminSupportStore = create((set, get) => ({
  // FAQ
  faqCategories: [],
  faqLoading: false,

  // Tickets
  tickets: [],
  ticketsPagination: { page: 1, pages: 1, total: 0 },
  ticketsLoading: false,
  currentTicket: null,
  ticketLoading: false,

  // Stats
  stats: null,
  statsLoading: false,

  // ===== FAQ =====
  fetchFaqCategories: async () => {
    set({ faqLoading: true });
    try {
      const data = await getFaqCategories();
      if (data.success) set({ faqCategories: data.data });
    } catch { /* silent */ } finally {
      set({ faqLoading: false });
    }
  },

  createCategory: async (categoryData) => {
    try {
      const data = await createFaqCategory(categoryData);
      if (data.success) await get().fetchFaqCategories();
      return data.success;
    } catch { return false; }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const data = await updateFaqCategory(id, categoryData);
      if (data.success) await get().fetchFaqCategories();
      return data.success;
    } catch { return false; }
  },

  deleteCategory: async (id) => {
    try {
      const data = await deleteFaqCategory(id);
      if (data.success) await get().fetchFaqCategories();
      return data.success;
    } catch { return false; }
  },

  createArticle: async (articleData) => {
    try {
      const data = await createFaqArticle(articleData);
      if (data.success) await get().fetchFaqCategories();
      return data.success;
    } catch { return false; }
  },

  updateArticle: async (id, articleData) => {
    try {
      const data = await updateFaqArticle(id, articleData);
      if (data.success) await get().fetchFaqCategories();
      return data.success;
    } catch { return false; }
  },

  deleteArticle: async (id) => {
    try {
      const data = await deleteFaqArticle(id);
      if (data.success) await get().fetchFaqCategories();
      return data.success;
    } catch { return false; }
  },

  // ===== Tickets =====
  fetchTickets: async (params = {}) => {
    set({ ticketsLoading: true });
    try {
      const data = await getSupportTickets(params);
      if (data.success) {
        set({
          tickets: data.data,
          ticketsPagination: { page: data.page, pages: data.pages, total: data.total },
        });
      }
    } catch { /* silent */ } finally {
      set({ ticketsLoading: false });
    }
  },

  fetchTicketDetail: async (id) => {
    set({ ticketLoading: true, currentTicket: null });
    try {
      const data = await getSupportTicketDetail(id);
      if (data.success) set({ currentTicket: data.data });
      return data.success;
    } catch { return false; } finally {
      set({ ticketLoading: false });
    }
  },

  updateTicket: async (id, ticketData) => {
    try {
      const data = await updateSupportTicket(id, ticketData);
      if (data.success) {
        // Refresh current ticket if viewing it
        const { currentTicket } = get();
        if (currentTicket?.id === id) {
          await get().fetchTicketDetail(id);
        }
      }
      return data.success;
    } catch { return false; }
  },

  sendMessage: async (ticketId, messageData, files) => {
    try {
      const data = await addSupportTicketMessage(ticketId, messageData, files);
      if (data.success) await get().fetchTicketDetail(ticketId);
      return data.success;
    } catch { return false; }
  },

  // ===== Stats =====
  fetchStats: async (params = {}) => {
    set({ statsLoading: true });
    try {
      const data = await getSupportStats(params);
      if (data.success) set({ stats: data.data });
    } catch { /* silent */ } finally {
      set({ statsLoading: false });
    }
  },
}));

export default useSuperAdminSupportStore;
