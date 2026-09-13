// frontend/src/store/payrollPeriodsStore.js
//
// Periodos de nómina. Lo distinto frente a un CRUD normal es
// `changeStatus('emitido')`: el backend liquida + emite cada empleado
// activo contra la DIAN y puede responder:
//   - 200 { success: true }  -> todos aceptados, periodo pasa a 'emitido'.
//   - 207 { success: false } -> aceptación parcial, el periodo se queda en
//     'liquidado' y `data.results` trae el detalle por empleado
//     (accepted/error) para que la UI permita corregir y reintentar sin
//     reenviar los que ya fueron aceptados (idempotente en el backend).
// Como 207 sigue siendo 2xx, axios NO lo trata como error — por eso este
// store no puede confiar solo en el catch para detectar el caso parcial,
// tiene que leer `response.success`.
//
// 'liquidado' también trae valor ahora: el backend calcula (sin tocar la
// DIAN) cuánto le tocaría a cada empleado y lo devuelve en `data.preview`
// — se guarda en `liquidationPreview` para que la página lo muestre como
// punto de revisión antes de emitir.
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { payrollPeriodsAPI } from '../api/payroll';

export const usePayrollPeriodsStore = create((set, get) => ({
  periods: [],
  period: null,
  isLoading: false,
  error: null,
  // Detalle de la última emisión intentada (para pintar la tabla de
  // empleados aceptados/rechazados en la página del periodo). Se limpia
  // manualmente con clearEmissionResult() o al cambiar de periodo.
  emissionResult: null,
  // Vista previa calculada al pasar a 'liquidado' ({ employees, totals } —
  // ver previewPayrollPeriod en el backend). También llega dentro de
  // `period.liquidation_preview` al recargar la página, pero se guarda
  // aparte para no tener que parsear el JSON del modelo cada vez.
  liquidationPreview: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  },
  filters: {
    status: '',
    branch_id: '',
    period_type: '',
  },

  fetchPeriods: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await payrollPeriodsAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      set({
        periods: response.data,
        pagination: response.pagination,
        isLoading: false,
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener periodos de nómina';
      set({ error: msg, isLoading: false });
      toast.error(msg);
    }
  },

  fetchPeriodById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollPeriodsAPI.getById(id);
      set({
        period: response.data,
        liquidationPreview: response.data?.liquidation_preview || null,
        isLoading: false,
      });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener periodo';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  createPeriod: async (periodData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollPeriodsAPI.create(periodData);
      await get().fetchPeriods();
      set({ isLoading: false });
      toast.success(response.message || 'Periodo creado exitosamente');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al crear periodo';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  // Solo permitido por el backend mientras status === 'abierto'.
  updatePeriod: async (id, periodData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollPeriodsAPI.update(id, periodData);
      set({ period: response.data, isLoading: false });
      await get().fetchPeriods();
      toast.success(response.message || 'Periodo actualizado exitosamente');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar periodo';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  /**
   * Avanza el periodo un estado (ver getNextPeriodStatus en
   * constants/payroll.js). Retorna { success, partial } para que la
   * página decida qué mostrar sin tener que releer el store.
   */
  changeStatus: async (id, status) => {
    set({ isLoading: true, error: null, emissionResult: null });
    try {
      const response = await payrollPeriodsAPI.changeStatus(id, status);

      if (response.success) {
        set({
          period: response.data.period || response.data,
          liquidationPreview: response.data?.preview || get().liquidationPreview,
          isLoading: false,
        });
        await get().fetchPeriods();
        toast.success(response.message || `Periodo pasado a "${status}"`);
        return { success: true, partial: false };
      }

      // Caso 207: aceptación parcial — el periodo sigue en 'liquidado'.
      set({
        period: response.data?.period || get().period,
        emissionResult: response.data || null,
        isLoading: false,
      });
      toast.error(response.message || 'Algunos empleados no fueron aceptados por la DIAN');
      return { success: false, partial: true, data: response.data };
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al cambiar el estado del periodo';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return { success: false, partial: false };
    }
  },

  // Solo permitido por el backend mientras status === 'abierto'.
  deletePeriod: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await payrollPeriodsAPI.delete(id);
      await get().fetchPeriods();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al eliminar periodo';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return false;
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters }, pagination: { ...get().pagination, page: 1 } });
  },
  setPage: (page) => set({ pagination: { ...get().pagination, page } }),

  clearError: () => set({ error: null }),
  clearPeriod: () => set({ period: null, emissionResult: null, liquidationPreview: null }),
  clearEmissionResult: () => set({ emissionResult: null }),

  // Silencioso (sin toast) — se llama automáticamente después de agregar o
  // borrar una novedad mientras el periodo está 'liquidado', para que la
  // vista previa no quede desactualizada sin que el usuario tenga que
  // pedirlo explícitamente. También se puede invocar a mano.
  recalculatePreview: async (id) => {
    try {
      const response = await payrollPeriodsAPI.recalculatePreview(id);
      if (response.success) {
        set({
          period: response.data.period || response.data,
          liquidationPreview: response.data?.preview || get().liquidationPreview,
        });
      }
      return response.success;
    } catch {
      return false;
    }
  },
}));