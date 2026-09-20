import api from './axios';

// Inventario físico (conteo por Excel).
// Ver: 00 - Documentación/Pitbox-Tecnicos-InventarioFisico-EnTramite-Analisis-y-Plan.md, sección 2.
export const physicalCountsAPI = {
  // Historial paginado
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/physical-counts', { params });
    return response.data;
  },

  // Detalle con items
  getById: async (id) => {
    const response = await api.get(`/inventory/physical-counts/${id}`);
    return response.data;
  },

  // Crear sesión de conteo { warehouse_id?, category_id?, include_inactive? }
  create: async (data) => {
    const response = await api.post('/inventory/physical-counts', data);
    return response.data;
  },

  // Descargar la plantilla .xlsx de la sesión (blob)
  downloadTemplate: async (id) => {
    const response = await api.get(`/inventory/physical-counts/${id}/template`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Subir el Excel diligenciado. dryRun=true → solo preview, no aplica.
  // options: { treat_empty_as_zero?, apply_despite_conflict? } — el backend
  // los lee de req.body (multipart), no de query params.
  upload: async (id, file, dryRun, options = {}) => {
    const formData = new FormData();
    formData.append('archivo', file);
    if (options.treat_empty_as_zero) formData.append('treat_empty_as_zero', 'true');
    if (options.apply_despite_conflict) formData.append('apply_despite_conflict', 'true');
    const response = await api.post(`/inventory/physical-counts/${id}/upload`, formData, {
      params: { dry_run: dryRun ? 'true' : 'false' },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000
    });
    return response.data;
  },

  // Informe de resultados en Excel (opcional, si el backend lo expone)
  downloadReport: async (id) => {
    const response = await api.get(`/inventory/physical-counts/${id}/report`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Dispara la descarga de un blob en el navegador con el nombre dado.
export const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
