// frontend/src/store/employeesStore.js
//
// Mismo patrón que suppliersStore.js (CRUD completo + stats + paginación +
// filtros server-side) — Employee es el análogo de nómina a Supplier/Customer.
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { employeesAPI } from '../api/payroll';

export const useEmployeesStore = create((set, get) => ({
  employees: [],
  employee: null,
  stats: null,
  isLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  },
  filters: {
    search: '',
    is_active: '',
    branch_id: '',
    contract_type: '',
    sort_by: 'first_name',
    sort_order: 'ASC',
  },

  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await employeesAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      set({
        employees: response.data,
        pagination: response.pagination,
        isLoading: false,
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener empleados';
      set({ error: msg, isLoading: false });
      toast.error(msg);
    }
  },

  fetchEmployeeById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await employeesAPI.getById(id);
      set({ employee: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener empleado';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  createEmployee: async (employeeData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await employeesAPI.create(employeeData);
      await get().fetchEmployees();
      await get().fetchStats();
      set({ isLoading: false });
      toast.success(response.message || 'Empleado creado exitosamente');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al crear empleado';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  updateEmployee: async (id, employeeData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await employeesAPI.update(id, employeeData);
      await get().fetchEmployees();
      set({ isLoading: false });
      toast.success(response.message || 'Empleado actualizado exitosamente');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar empleado';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  deactivateEmployee: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await employeesAPI.deactivate(id);
      await get().fetchEmployees();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al desactivar empleado';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return false;
    }
  },

  activateEmployee: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await employeesAPI.activate(id);
      await get().fetchEmployees();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al activar empleado';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return false;
    }
  },

  deleteEmployee: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await employeesAPI.delete(id);
      await get().fetchEmployees();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al eliminar empleado';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return false;
    }
  },

  fetchStats: async () => {
    try {
      const response = await employeesAPI.getStats();
      set({ stats: response.data });
    } catch (error) {
      // silencioso — igual que suppliersStore
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters }, pagination: { ...get().pagination, page: 1 } });
  },

  setPage: (page) => {
    set({ pagination: { ...get().pagination, page } });
  },

  clearError: () => set({ error: null }),
  clearEmployee: () => set({ employee: null }),
}));