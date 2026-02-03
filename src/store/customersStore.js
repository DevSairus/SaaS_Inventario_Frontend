// frontend/src/store/customersStore.js
import { create } from 'zustand';
import customersApi from '../api/customers';

const useCustomersStore = create((set, get) => ({
  customers: [],
  currentCustomer: null,
  loading: false,
  error: null,
  searchResults: [],

  // Cargar todos los clientes
  fetchCustomers: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await customersApi.getAll(params);
      set({ customers: response.data.data, loading: false });
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
      console.error('Error buscando clientes:', error);
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