// src/store/announcementsStore.js
import { create } from 'zustand';
import {
  getPendingAnnouncements,
  markAnnouncementAsViewed,
  dismissAnnouncement,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStats
} from '../api/announcements';

const useAnnouncementsStore = create((set, get) => ({
  // Estado
  pendingAnnouncements: [],
  announcements: [],
  currentAnnouncement: null,
  stats: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  isLoading: false,
  error: null,
  showModal: false,

  // ==========================================
  // ACCIONES PARA USUARIOS
  // ==========================================

  /**
   * Obtener anuncios pendientes para el usuario actual
   */
  fetchPendingAnnouncements: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await getPendingAnnouncements();
      
      if (data.success) {
        set({
          pendingAnnouncements: data.announcements,
          showModal: data.announcements.length > 0
        });

        // Marcar el primero como visto automáticamente
        if (data.announcements.length > 0) {
          await markAnnouncementAsViewed(data.announcements[0].id);
        }
      }
      
      set({ isLoading: false });
      return data.success;
    } catch (error) {
      console.error('Error al obtener anuncios pendientes:', error);
      set({ 
        error: error.message,
        isLoading: false,
        showModal: false
      });
      return false;
    }
  },

  /**
   * Marcar un anuncio como visto
   */
  markAsViewed: async (announcementId) => {
    try {
      const data = await markAnnouncementAsViewed(announcementId);
      return data.success;
    } catch (error) {
      console.error('Error al marcar como visto:', error);
      return false;
    }
  },

  /**
   * Descartar un anuncio
   */
  dismiss: async (announcementId) => {
    try {
      const data = await dismissAnnouncement(announcementId);
      return data.success;
    } catch (error) {
      console.error('Error al descartar anuncio:', error);
      return false;
    }
  },

  /**
   * Cerrar el modal de anuncios
   */
  closeModal: async () => {
    const { pendingAnnouncements } = get();
    
    // Marcar todos como descartados
    for (const announcement of pendingAnnouncements) {
      try {
        await dismissAnnouncement(announcement.id);
      } catch (error) {
        console.error('Error al descartar:', error);
      }
    }
    
    set({ 
      showModal: false,
      pendingAnnouncements: []
    });
  },

  /**
   * Mostrar el modal manualmente
   */
  openModal: () => {
    set({ showModal: true });
  },

  // ==========================================
  // ACCIONES PARA SUPERADMIN
  // ==========================================

  /**
   * Obtener todos los anuncios (superadmin)
   */
  fetchAllAnnouncements: async (params = {}) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getAllAnnouncements(params);
      
      if (data.success) {
        set({
          announcements: data.announcements,
          pagination: data.pagination
        });
      }
      
      set({ isLoading: false });
      return data.success;
    } catch (error) {
      console.error('Error al obtener anuncios:', error);
      set({ 
        error: error.message,
        isLoading: false
      });
      return false;
    }
  },

  /**
   * Crear un nuevo anuncio (superadmin)
   */
  createAnnouncement: async (announcementData) => {
    try {
      set({ isLoading: true, error: null });
      const data = await createAnnouncement(announcementData);
      
      if (data.success) {
        // Recargar la lista
        await get().fetchAllAnnouncements();
      }
      
      set({ isLoading: false });
      return data.success;
    } catch (error) {
      console.error('Error al crear anuncio:', error);
      set({ 
        error: error.response?.data?.message || error.message,
        isLoading: false
      });
      return false;
    }
  },

  /**
   * Actualizar un anuncio (superadmin)
   */
  updateAnnouncement: async (id, announcementData) => {
    try {
      set({ isLoading: true, error: null });
      const data = await updateAnnouncement(id, announcementData);
      
      if (data.success) {
        // Recargar la lista
        await get().fetchAllAnnouncements();
      }
      
      set({ isLoading: false });
      return data.success;
    } catch (error) {
      console.error('Error al actualizar anuncio:', error);
      set({ 
        error: error.response?.data?.message || error.message,
        isLoading: false
      });
      return false;
    }
  },

  /**
   * Eliminar un anuncio (superadmin)
   */
  deleteAnnouncement: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const data = await deleteAnnouncement(id);
      
      if (data.success) {
        // Recargar la lista
        await get().fetchAllAnnouncements();
      }
      
      set({ isLoading: false });
      return data.success;
    } catch (error) {
      console.error('Error al eliminar anuncio:', error);
      set({ 
        error: error.message,
        isLoading: false
      });
      return false;
    }
  },

  /**
   * Obtener estadísticas de un anuncio (superadmin)
   */
  fetchAnnouncementStats: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getAnnouncementStats(id);
      
      if (data.success) {
        set({ stats: data.stats });
      }
      
      set({ isLoading: false });
      return data.success ? data.stats : null;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      set({ 
        error: error.message,
        isLoading: false,
        stats: null
      });
      return null;
    }
  },

  /**
   * Limpiar error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset del store
   */
  reset: () => {
    set({
      pendingAnnouncements: [],
      announcements: [],
      currentAnnouncement: null,
      stats: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      },
      isLoading: false,
      error: null,
      showModal: false
    });
  }
}));

export default useAnnouncementsStore;