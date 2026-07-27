import { create } from 'zustand';
import toast from 'react-hot-toast';
import { vehicleApplicationsAPI } from '../api/vehicleApplications';

const useVehicleApplicationsStore = create((set, get) => ({
  applications: [],
  brandsAndLines: [],
  isLoading: false,
  error: null,

  // Cargar aplicaciones de un producto
  fetchApplications: async (productId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await vehicleApplicationsAPI.getByProductId(productId);
      if (response && response.success) {
        set({ applications: response.data || [], isLoading: false });
      } else {
        set({ applications: [], isLoading: false });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al cargar aplicaciones';
      set({ error: msg, isLoading: false, applications: [] });
    }
  },

  // Agregar aplicación
  addApplication: async (productId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await vehicleApplicationsAPI.add(productId, data);
      if (response && response.success) {
        toast.success(response.message || 'Aplicación agregada');
        await get().fetchApplications(productId);
        set({ isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al agregar aplicación';
      toast.error(msg);
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  // Actualizar aplicación
  updateApplication: async (productId, appId, data) => {
    try {
      const response = await vehicleApplicationsAPI.update(productId, appId, data);
      if (response && response.success) {
        toast.success('Aplicación actualizada');
        await get().fetchApplications(productId);
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar aplicación';
      toast.error(msg);
      return false;
    }
  },

  // Eliminar aplicación
  removeApplication: async (productId, appId) => {
    try {
      const response = await vehicleApplicationsAPI.remove(productId, appId);
      if (response && response.success) {
        toast.success('Aplicación eliminada');
        await get().fetchApplications(productId);
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al eliminar aplicación';
      toast.error(msg);
      return false;
    }
  },

  // Cargar marcas y líneas para autocompletado
  fetchBrandsAndLines: async () => {
    try {
      const response = await vehicleApplicationsAPI.getBrandsAndLines();
      if (response && response.success) {
        set({ brandsAndLines: response.data || [] });
      }
    } catch (error) {
      // Silencioso - es solo autocompletado
    }
  },

  clearError: () => set({ error: null })
}));

export default useVehicleApplicationsStore;
