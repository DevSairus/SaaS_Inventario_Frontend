import { create } from 'zustand';
import { vehiclesApi, workOrdersApi } from '../api/workshop';
import toast from 'react-hot-toast';

const useWorkshopStore = create((set, get) => ({
  // Vehicles
  vehicles: [], vehiclesTotal: 0, vehiclesLoading: false,
  // Work Orders
  workOrders: [], workOrdersTotal: 0, workOrdersLoading: false,
  currentOrder: null, orderLoading: false,

  // ── Vehicles ──
  fetchVehicles: async (params = {}) => {
    set({ vehiclesLoading: true });
    try {
      const res = await vehiclesApi.list(params);
      set({ vehicles: res.data.data, vehiclesTotal: res.data.total, vehiclesLoading: false });
    } catch { set({ vehiclesLoading: false }); }
  },

  createVehicle: async (data) => {
    const res = await vehiclesApi.create(data);
    toast.success('Vehículo registrado');
    return res.data.data;
  },

  updateVehicle: async (id, data) => {
    const res = await vehiclesApi.update(id, data);
    toast.success('Vehículo actualizado');
    return res.data.data;
  },

  // ── Work Orders ──
  fetchWorkOrders: async (params = {}) => {
    set({ workOrdersLoading: true });
    try {
      const res = await workOrdersApi.list(params);
      set({ workOrders: res.data.data, workOrdersTotal: res.data.total, workOrdersLoading: false });
    } catch { set({ workOrdersLoading: false }); }
  },

  fetchOrder: async (id) => {
    set({ orderLoading: true });
    try {
      const res = await workOrdersApi.getById(id);
      set({ currentOrder: res.data.data, orderLoading: false });
    } catch { set({ orderLoading: false }); }
  },

  // Parcha campos específicos de currentOrder sin hacer refetch
  patchCurrentOrder: (fields) => {
    set(state => ({
      currentOrder: state.currentOrder ? { ...state.currentOrder, ...fields } : state.currentOrder
    }));
  },

  createOrder: async (data) => {
    const res = await workOrdersApi.create(data);
    toast.success(`OT ${res.data.data.order_number} creada`);
    return res.data.data;
  },

  updateOrder: async (id, data) => {
    const res = await workOrdersApi.update(id, data);
    set({ currentOrder: res.data.data });
    toast.success('OT actualizada');
    return res.data.data;
  },

  changeStatus: async (id, status, extra = {}) => {
    const res = await workOrdersApi.changeStatus(id, { status, ...extra });
    set({ currentOrder: res.data.data });
    toast.success(`Estado: ${status}`);
    return res.data.data;
  },

  addItem: async (id, data) => {
    const res = await workOrdersApi.addItem(id, data);
    toast.success('Ítem agregado');
    await get().fetchOrder(id);
    return res.data.data;
  },

  removeItem: async (orderId, itemId) => {
    await workOrdersApi.removeItem(orderId, itemId);
    toast.success('Ítem eliminado');
    await get().fetchOrder(orderId);
  },

  generateSale: async (id) => {
    const res = await workOrdersApi.generateSale(id);
    toast.success(`Remisión ${res.data.data.sale_number} generada`);
    await get().fetchOrder(id);
    return res.data.data;
  },

  uploadPhotos: async (id, phase, files) => {
    const fd = new FormData();
    files.forEach(f => fd.append('photos', f));
    await workOrdersApi.uploadPhotos(id, phase, fd);
    toast.success('Fotos subidas');
    await get().fetchOrder(id);
  },

  deletePhoto: async (id, phase, index) => {
    await workOrdersApi.deletePhoto(id, phase, index);
    toast.success('Foto eliminada');
    await get().fetchOrder(id);
  },
}));

export default useWorkshopStore;