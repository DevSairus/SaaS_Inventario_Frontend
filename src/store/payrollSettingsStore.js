// frontend/src/store/payrollSettingsStore.js
//
// Un solo registro por tenant (los 7 porcentajes de recargo de horas
// extra). Lo consume tanto PayrollSettingsPage (para editarlo) como
// PayrollNovedadModal (para precargar el campo "Porcentaje" al elegir una
// categoría de horas — ver HORAS_EXTRA_FIELDS en constants/payroll.js).
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { payrollSettingsAPI } from '../api/payroll';

export const usePayrollSettingsStore = create((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    // Si ya se cargó una vez en esta sesión, no lo vuelve a pedir — el
    // modal de novedades llama a esto en cada apertura, no tiene sentido
    // golpear la API cada vez por un dato que casi nunca cambia.
    if (get().settings) return get().settings;
    set({ isLoading: true, error: null });
    try {
      const response = await payrollSettingsAPI.get();
      set({ settings: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener la configuración de nómina';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  updateSettings: async (percentages) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollSettingsAPI.update(percentages);
      set({ settings: response.data, isLoading: false });
      toast.success('Configuración actualizada');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar la configuración';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },
}));
