// frontend/src/store/payrollDocumentsStore.js
//
// Documentos Soporte de Pago de Nómina Electrónica ya emitidos (o en
// curso) — solo lectura sobre el documento en sí, más la creación de Notas
// de Ajuste. La emisión del NominaIndividual normal se dispara desde
// payrollPeriodsStore.changeStatus('emitido'), no desde aquí.
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { payrollDocumentsAPI } from '../api/payroll';
import { downloadFile } from '../utils/helpers';

export const usePayrollDocumentsStore = create((set, get) => ({
  documents: [],
  // Documento actual, con `resumen` (resumenLiquidacionParaImpresion) y
  // `adjustments` (Notas de Ajuste ya creadas sobre él) incluidos por
  // getPayrollDocumentById en el backend.
  document: null,
  isLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  },
  filters: {
    payroll_period_id: '',
    employee_id: '',
    dian_status: '',
    search: '',
  },

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await payrollDocumentsAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      set({
        documents: response.data,
        pagination: response.pagination,
        isLoading: false,
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener documentos de nómina';
      set({ error: msg, isLoading: false });
      toast.error(msg);
    }
  },

  fetchDocumentById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollDocumentsAPI.getById(id);
      set({ document: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al obtener el documento de nómina';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  // filename opcional — por defecto usa el número de documento o el id.
  downloadXml: async (id, filename) => {
    try {
      const response = await payrollDocumentsAPI.downloadXml(id);
      downloadFile(response.data, filename || `nomina-${id}.xml`);
      return true;
    } catch (error) {
      // El backend responde 400 (no JSON) si el documento aún no tiene XML
      // (no ha sido emitido) — el blob de error hay que leerlo aparte si
      // se quiere mostrar el mensaje real; por ahora se informa genérico.
      toast.error('No se pudo descargar el XML. ¿El documento ya fue emitido?');
      return false;
    }
  },

  downloadPdf: async (id, filename) => {
    try {
      const response = await payrollDocumentsAPI.downloadPdf(id);
      downloadFile(response.data, filename || `nomina-${id}.pdf`);
      return true;
    } catch (error) {
      toast.error('No se pudo descargar el PDF. ¿El documento ya tiene una liquidación generada?');
      return false;
    }
  },

  // Crea la Nota de Ajuste (Reemplazar/Eliminar). El backend responde 201
  // de inmediato con la fila en 'pending' y envía a la DIAN en segundo
  // plano — por eso se refresca el documento después con un pequeño
  // margen, para reflejar el estado real (sending/accepted/rejected) en
  // vez de quedarse pegado en 'pending'.
  createAdjustment: async (payrollDocumentId, { adjustment_type, reason }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await payrollDocumentsAPI.createAdjustment(payrollDocumentId, {
        adjustment_type,
        reason,
      });
      set({ isLoading: false });
      toast.success(response.message || 'Nota de Ajuste creada. Envío a la DIAN en proceso.');
      await get().fetchDocumentById(payrollDocumentId);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al crear la Nota de Ajuste';
      set({ error: msg, isLoading: false });
      toast.error(msg);
      return null;
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters }, pagination: { ...get().pagination, page: 1 } });
  },
  setPage: (page) => set({ pagination: { ...get().pagination, page } }),

  clearError: () => set({ error: null }),
  clearDocument: () => set({ document: null }),
}));