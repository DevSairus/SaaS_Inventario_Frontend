import { create } from 'zustand';
import { superAdminAPI } from '../api/superadmin';

const useSuperAdminStore = create((set, get) => ({
  // Dashboard
  dashboard: null,
  expiringTrials: null,

  // Tenants
  tenants: [],
  tenantsPagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
  selectedTenant: null,

  // Tenant Users
  tenantUsers: [],
  tenantUsersPagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
  tenantDetail: null,

  // Analytics
  analyticsOverview: null,
  tenantsAnalytics: null,

  // Estado global
  isLoading: false,
  isSubmitting: false,
  error: null,

  // ========== DASHBOARD ==========
  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await superAdminAPI.getDashboard();
      set({ dashboard: response, isLoading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar dashboard',
        isLoading: false
      });
    }
  },

  fetchExpiringTrials: async (days = 7) => {
    try {
      const response = await superAdminAPI.getExpiringTrials(days);
      set({ expiringTrials: response });
    } catch (error) {
      console.error('Error fetching expiring trials:', error);
    }
  },

  // ========== TENANTS ==========
  fetchTenants: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await superAdminAPI.getTenants(params);
      set({
        tenants: response.data?.tenants || [],
        tenantsPagination: {
          currentPage: response.data?.currentPage || 1,
          totalPages: response.data?.totalPages || 1,
          totalItems: response.data?.totalItems || 0
        },
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar empresas',
        isLoading: false
      });
    }
  },

  fetchTenantById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await superAdminAPI.getTenantById(id);
      set({ selectedTenant: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar empresa',
        isLoading: false
      });
    }
  },

  toggleTenantStatus: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await superAdminAPI.toggleTenantStatus(id);
      // Refrescar lista
      await get().fetchTenants();
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cambiar estado',
        isSubmitting: false
      });
      return false;
    }
  },

  deleteTenant: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await superAdminAPI.deleteTenant(id);
      await get().fetchTenants();
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar empresa',
        isSubmitting: false
      });
      return false;
    }
  },

  // ========== TENANT USERS ==========
  fetchTenantUsers: async (tenantId, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await superAdminAPI.getTenantUsers(tenantId, params);
      set({
        tenantUsers: response.users || [],
        tenantDetail: response.tenant || null,
        tenantUsersPagination: {
          currentPage: response.currentPage || 1,
          totalPages: response.totalPages || 1,
          totalItems: response.totalItems || 0
        },
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar usuarios',
        isLoading: false
      });
    }
  },

  deleteTenantUser: async (tenantId, userId) => {
    set({ isSubmitting: true, error: null });
    try {
      await superAdminAPI.deleteTenantUser(tenantId, userId);
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar usuario',
        isSubmitting: false
      });
      return false;
    }
  },

  changeTenantUserRole: async (tenantId, userId, role) => {
    set({ isSubmitting: true, error: null });
    try {
      await superAdminAPI.changeTenantUserRole(tenantId, userId, role);
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cambiar rol',
        isSubmitting: false
      });
      return false;
    }
  },

  resetTenantUserPassword: async (tenantId, userId, password) => {
    set({ isSubmitting: true, error: null });
    try {
      await superAdminAPI.resetTenantUserPassword(tenantId, userId, password);
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al resetear contraseña',
        isSubmitting: false
      });
      return false;
    }
  },

  createTenantUser: async (tenantId, userData) => {
    set({ isSubmitting: true, error: null });
    try {
      await superAdminAPI.createTenantUser(tenantId, userData);
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || error.response?.data?.error || 'Error al crear usuario',
        isSubmitting: false
      });
      return false;
    }
  },

  // ========== ANALYTICS ==========
  fetchAnalyticsOverview: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await superAdminAPI.getAnalyticsOverview(params);
      set({ analyticsOverview: response, isLoading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar analytics',
        isLoading: false
      });
    }
  },

  fetchTenantsAnalytics: async () => {
    try {
      const response = await superAdminAPI.getTenantsAnalytics();
      set({ tenantsAnalytics: response });
    } catch (error) {
      console.error('Error fetching tenants analytics:', error);
    }
  },

  // ========== UTILS ==========
  clearError: () => set({ error: null })
}));

export default useSuperAdminStore;