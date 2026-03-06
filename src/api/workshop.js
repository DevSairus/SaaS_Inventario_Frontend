import { create } from 'zustand';
import { vehiclesApi, workOrdersApi } from '../api/workshop';
import toast from 'react-hot-toast';

const useWorkshopStore = create((set, get) => ({
  // Vehicles
  vehicles: [], vehiclesTotal: 0, vehiclesLoading: false, vehiclesError: null,
  // Work Orders
  workOrders: [], workOrdersTotal: 0, workOrdersLoading: false, workOrdersError: null,
  currentOrder: null, orderLoading: false, orderError: null,

  // ── Vehicles ──
  fetchVehicles: async (params = {}) => {
    set({ vehiclesLoading: true, vehiclesError: null });
    try {
      const res = await vehiclesApi.list(params);
      set({ vehicles: res.data.data, vehiclesTotal: res.data.total, vehiclesLoading: false });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al cargar vehículos';
      set({ vehiclesLoading: false, vehiclesError: msg });
      toast.error(msg);
    }
  },

  createVehicle: async (data) => {
    try {
      const res = await vehiclesApi.create(data);
      toast.success('Vehículo registrado');
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al registrar vehículo';
      toast.error(msg);
      throw err;
    }
  },

  updateVehicle: async (id, data) => {
    try {
      const res = await vehiclesApi.update(id, data);
      toast.success('Vehículo actualizado');
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al actualizar vehículo';
      toast.error(msg);
      throw err;
    }
  },

  // ── Work Orders ──
  fetchWorkOrders: async (params = {}) => {
    set({ workOrdersLoading: true, workOrdersError: null });
    try {
      const res = await workOrdersApi.list(params);
      set({ workOrders: res.data.data, workOrdersTotal: res.data.total, workOrdersLoading: false });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al cargar órdenes de trabajo';
      set({ workOrdersLoading: false, workOrdersError: msg });
      toast.error(msg);
    }
  },

  fetchOrder: async (id) => {
    set({ orderLoading: true, orderError: null });
    try {
      const res = await workOrdersApi.getById(id);
      set({ currentOrder: res.data.data, orderLoading: false });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al cargar la orden';
      set({ orderLoading: false, orderError: msg });
      toast.error(msg);
    }
  },

  // Parcha campos específicos de currentOrder sin hacer refetch
  patchCurrentOrder: (fields) => {
    set(state => ({
      currentOrder: state.currentOrder ? { ...state.currentOrder, ...fields } : state.currentOrder
    }));
  },

  createOrder: async (data) => {
    try {
      const res = await workOrdersApi.create(data);
      toast.success(`OT ${res.data.data.order_number} creada`);
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al crear la orden';
      toast.error(msg);
      throw err;
    }
  },

  updateOrder: async (id, data) => {
    try {
      const res = await workOrdersApi.update(id, data);
      set({ currentOrder: res.data.data });
      toast.success('OT actualizada');
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al actualizar la orden';
      toast.error(msg);
      throw err;
    }
  },

  changeStatus: async (id, status, extra = {}) => {
    try {
      const res = await workOrdersApi.changeStatus(id, { status, ...extra });
      set({ currentOrder: res.data.data });
      toast.success(`Estado: ${status}`);
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg);
      throw err;
    }
  },

  addItem: async (id, data) => {
    try {
      const res = await workOrdersApi.addItem(id, data);
      toast.success('Ítem agregado');
      await get().fetchOrder(id);
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al agregar ítem';
      toast.error(msg);
      throw err;
    }
  },

  removeItem: async (orderId, itemId) => {
    try {
      await workOrdersApi.removeItem(orderId, itemId);
      toast.success('Ítem eliminado');
      await get().fetchOrder(orderId);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al eliminar ítem';
      toast.error(msg);
      throw err;
    }
  },

  generateSale: async (id) => {
    try {
      const res = await workOrdersApi.generateSale(id);
      toast.success(`Remisión ${res.data.data.sale_number} generada`);
      await get().fetchOrder(id);
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al generar remisión';
      toast.error(msg);
      throw err;
    }
  },

  uploadPhotos: async (id, phase, files) => {
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('photos', f));
      await workOrdersApi.uploadPhotos(id, phase, fd);
      toast.success('Fotos subidas');
      await get().fetchOrder(id);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al subir fotos';
      toast.error(msg);
      throw err;
    }
  },

  deletePhoto: async (id, phase, index) => {
    try {
      await workOrdersApi.deletePhoto(id, phase, index);
      toast.success('Foto eliminada');
      await get().fetchOrder(id);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al eliminar foto';
      toast.error(msg);
      throw err;
    }
  },
}));

export default useWorkshopStore;
