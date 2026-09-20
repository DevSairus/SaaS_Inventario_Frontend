// frontend/src/store/customersStore.js
import { create } from 'zustand';
import toast from 'react-hot-toast';
import customersApi from '../api/customers';
import { notifyGoalMilestones } from './goalMilestoneStore';

const useCustomersStore = create((set, get) => ({
  customers: [],
  customersTotal: 0,
  currentCustomer: null,
  loading: false,
  error: null,
  searchResults: [],

  // Cargar todos los clientes. Sin `params.search` ni `limit` explícito, el
  // backend solo trae los primeros 50 (orden alfabético) -- por eso la
  // pantalla de listado SIEMPRE debe pasar `search`/`limit`/`offset` en vez
  // de filtrar sobre lo ya cargado, o un cliente fuera de ese primer bloque
  // (p. ej. uno creado desde el formato rápido de Taller/Ventas) queda
  // invisible aunque exista en la BD.
  fetchCustomers: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await customersApi.getAll(params);
      set({ customers: response.data.data, customersTotal: response.data.pagination?.total ?? response.data.data.length, loading: false });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error cargando clientes', 
        loading: false 
      });
    }
  },

  // Cargar cliente por ID
  fetchCustomerById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await customersApi.getById(id);
      set({ currentCustomer: response.data.data, loading: false });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error cargando cliente', 
        loading: false 
      });
    }
  },

  // Crear cliente
  createCustomer: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await customersApi.create(data);
      set({ 
        customers: [...get().customers, response.data.data],
        currentCustomer: response.data.data,
        loading: false 
      });
      // Gamificación CRM §4 — creación de cliente (módulo Ventas) puede
      // mover la métrica new_customers si el tenant tiene una meta activa;
      // el backend solo anexa `gamification` cuando aplica (ver
      // customers.controller.js → create), así que esto es un no-op para
      // tenants sin CRM/gamificación.
      notifyGoalMilestones(response.data.gamification);
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error creando cliente', 
        loading: false 
      });
      throw error;
    }
  },

  // Actualizar cliente
  updateCustomer: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await customersApi.update(id, data);
      
      const updatedCustomers = get().customers.map(customer => 
        customer.id === id ? response.data.data : customer
      );
      
      set({ 
        customers: updatedCustomers,
        currentCustomer: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error actualizando cliente', 
        loading: false 
      });
      throw error;
    }
  },

  // Eliminar cliente
  deleteCustomer: async (id) => {
    set({ loading: true, error: null });
    try {
      await customersApi.delete(id);
      
      const filteredCustomers = get().customers.filter(customer => customer.id !== id);
      
      set({ 
        customers: filteredCustomers,
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error eliminando cliente', 
        loading: false 
      });
      throw error;
    }
  },

  // Buscar clientes
  searchCustomers: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }

    try {
      const response = await customersApi.search(query);
      set({ searchResults: response.data.data });
    } catch (error) {
      set({ searchResults: [] });
    }
  },

  // Limpiar búsqueda
  clearSearch: () => set({ searchResults: [] }),

  // Limpiar error
  clearError: () => set({ error: null }),

  // Limpiar cliente actual
  clearCurrentCustomer: () => set({ currentCustomer: null }),
}));

export default useCustomersStore;