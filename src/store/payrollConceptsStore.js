// frontend/src/store/payrollConceptsStore.js
//
// Catálogo de conceptos de nómina (devengados/deducciones). Más simple que
// employeesStore: el backend no pagina esta lista (findAll plano), así que
// no hay `pagination` aquí — mismo espíritu que categoriesStore para
// catálogos cortos.
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { payrollConceptsAPI } from '../api/payroll';

export const usePayrollConceptsStore = create((set, get) => ({
  concepts: [],
  concept: null,
  isLoading: false,
  error: null,
  filters: {
    search: '',
    concept_type: '',
    is_active: '',
    sort_by: 'sort_order',
    sort_order: 'ASC',
  },

  fetchConcepts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const response = await payrollConceptsAPI.getAll(filters);
      set({ concepts: response.data, isLoading: false });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener conceptos de nómina';
      set({ error: msg, isLoading: false });
      toast.error(msg);
    }
  },

  fetchConceptById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollConceptsAPI.getById(id);
      set({ concept: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener concepto';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  createConcept: async (conceptData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollConceptsAPI.create(conceptData);
      await get().fetchConcepts();
      set({ isLoading: false });
      toast.success(response.message || 'Concepto creado exitosamente');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al crear concepto';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  updateConcept: async (id, conceptData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollConceptsAPI.update(id, conceptData);
      await get().fetchConcepts();
      set({ isLoading: false });
      toast.success(response.message || 'Concepto actualizado exitosamente');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar concepto';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  deactivateConcept: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await payrollConceptsAPI.deactivate(id);
      await get().fetchConcepts();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al desactivar concepto';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return false;
    }
  },

  activateConcept: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await payrollConceptsAPI.activate(id);
      await get().fetchConcepts();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al activar concepto';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return false;
    }
  },

  deleteConcept: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await payrollConceptsAPI.delete(id);
      await get().fetchConcepts();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al eliminar concepto';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return false;
    }
  },

  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
  clearError: () => set({ error: null }),
  clearConcept: () => set({ concept: null }),
}));