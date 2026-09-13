// frontend/src/store/payrollNovedadesStore.js
//
// Novedades (horas extra, bonificaciones, licencias, libranzas, días no
// remunerados, etc.) capturadas por empleado dentro de un periodo. Se usan
// siempre en el contexto de un `payroll_period_id` — normalmente como
// sub-sección de la página del periodo o del detalle de un empleado dentro
// de ese periodo, no como un listado global independiente.
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { payrollNovedadesAPI, payrollPeriodsAPI } from '../api/payroll';

export const usePayrollNovedadesStore = create((set, get) => ({
  novedades: [],
  isLoading: false,
  error: null,
  // periodId/employeeId activos — fetchNovedades() los usa si no se pasan
  // explícitamente, para poder refrescar tras crear/eliminar sin tener que
  // repetir los parámetros en cada llamada desde el componente.
  activePeriodId: null,
  activeEmployeeId: null,

  setActiveContext: ({ payrollPeriodId, employeeId = null }) => {
    set({ activePeriodId: payrollPeriodId, activeEmployeeId: employeeId });
  },

  fetchNovedades: async ({ payrollPeriodId, employeeId } = {}) => {
    const periodId = payrollPeriodId ?? get().activePeriodId;
    const empId = employeeId !== undefined ? employeeId : get().activeEmployeeId;
    if (!periodId) {
      set({ error: 'payroll_period_id es obligatorio', novedades: [] });
      return;
    }
    set({ isLoading: true, error: null, activePeriodId: periodId, activeEmployeeId: empId });
    try {
      const response = await payrollNovedadesAPI.getAll({
        payroll_period_id: periodId,
        employee_id: empId || undefined,
      });
      set({ novedades: response.data, isLoading: false });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener novedades';
      set({ error: msg, isLoading: false });
      toast.error(msg);
    }
  },

  // Body: { employee_id, payroll_period_id, payroll_concept_id?,
  //         dian_category?, payload?, unpaid_days?, notes? }
  createNovedad: async (novedadData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollNovedadesAPI.create(novedadData);
      await get().fetchNovedades({
        payrollPeriodId: novedadData.payroll_period_id,
        employeeId: get().activeEmployeeId,
      });
      set({ isLoading: false });
      toast.success(response.message || 'Novedad creada');
      // Aviso NO bloqueante de tope legal de horas extra (ver
      // validarTopeHorasExtra en el backend) — se muestra aparte del
      // toast de éxito, con más duración porque es información que vale
      // la pena leer completa, no solo confirmar de reojo.
      if (response.warning) {
        toast(response.warning, { icon: '⚠️', duration: 8000 });
      }
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al crear novedad';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  deleteNovedad: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await payrollNovedadesAPI.delete(id);
      await get().fetchNovedades();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al eliminar novedad';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return false;
    }
  },

  // sourcePeriodId es opcional — si se omite, el backend autodetecta el
  // periodo inmediatamente anterior de la misma sede+periodicidad. Se
  // devuelve la respuesta completa (no solo boolean) porque el llamador
  // suele querer mostrar cuántas se copiaron/omitieron.
  copyNovedadesFromPrevious: async (targetPeriodId, sourcePeriodId = null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollPeriodsAPI.copyNovedades(targetPeriodId, sourcePeriodId);
      await get().fetchNovedades({ payrollPeriodId: targetPeriodId, employeeId: null });
      set({ isLoading: false });
      toast.success(response.message);
      return response;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al copiar novedades';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  clearError: () => set({ error: null }),
  clearNovedades: () => set({ novedades: [], activePeriodId: null, activeEmployeeId: null }),
}));