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
      const msg = err?.response?.data?.message || 'No se pudieron cargar los vehículos. Verifica tu conexión.';
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
      const msg = err?.response?.data?.message || 'No se pudo registrar el vehículo.';
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
      const msg = err?.response?.data?.message || 'No se pudo actualizar el vehículo.';
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
      const msg = err?.response?.data?.message || 'No se pudieron cargar las órdenes de trabajo.';
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
      const msg = err?.response?.data?.message || 'No se pudo cargar la orden de trabajo.';
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
      toast.success(`OT ${res.data.data.order_number} creada exitosamente`);
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'No se pudo crear la orden de trabajo.';
      toast.error(msg);
      throw err;
    }
  },

  updateOrder: async (id, data) => {
    try {
      const res = await workOrdersApi.update(id, data);
      set({ currentOrder: res.data.data });
      toast.success('OT actualizada correctamente');
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'No se pudo actualizar la orden de trabajo.';
      toast.error(msg);
      throw err;
    }
  },

  changeStatus: async (id, status, extra = {}) => {
    const labels = { en_proceso: 'En Proceso', en_espera: 'En Espera', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };
    try {
      const res = await workOrdersApi.changeStatus(id, { status, ...extra });
      await get().fetchOrder(id);
      toast.success(`Estado cambiado a: ${labels[status] || status}`);
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || `No se pudo cambiar el estado a "${labels[status] || status}".`;
      toast.error(msg);
      throw err;
    }
  },

  addItem: async (id, data) => {
    try {
      const res = await workOrdersApi.addItem(id, data);
      toast.success('Ítem agregado a la OT');
      await get().fetchOrder(id);
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'No se pudo agregar el ítem.';
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
      const msg = err?.response?.data?.message || 'No se pudo eliminar el ítem.';
      toast.error(msg);
      throw err;
    }
  },

  generateSale: async (id, data = {}) => {
    try {
      const res = await workOrdersApi.generateSale(id, data);
      const docLabel = data.document_type === 'factura' ? 'Factura' : 'Remisión';
      toast.success(`${docLabel} ${res.data.data.sale_number} generada`);
      await get().fetchOrder(id);
      return res.data.data;
    } catch (err) {
      const msg = err?.response?.data?.message || 'No se pudo generar el documento.';
      toast.error(msg);
      throw err;
    }
  },

  uploadPhotos: async (id, phase, files) => {
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('photos', f));
      await workOrdersApi.uploadPhotos(id, phase, fd);
      toast.success(`${files.length > 1 ? `${files.length} fotos subidas` : 'Foto subida'} correctamente`);
      await get().fetchOrder(id);
    } catch (err) {
      const msg = err?.response?.data?.message || 'No se pudieron subir las fotos.';
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
      const msg = err?.response?.data?.message || 'No se pudo eliminar la foto.';
      toast.error(msg);
      throw err;
    }
  },
}));

export default useWorkshopStore;