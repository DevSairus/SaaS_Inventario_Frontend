// frontend/src/api/payroll.js
//
// Cliente API del módulo de Nómina Electrónica. Espeja exactamente las
// rutas montadas en backend/src/server.js bajo /api/payroll/* (ver
// routes/payroll/*.routes.js) — no hay endpoints inventados aquí.
//
// Convención: igual que suppliers.js/adjustments.js, cada función retorna
// `response.data` (el body JSON `{ success, data, message, pagination? }`),
// EXCEPTO las descargas de XML/PDF, que retornan la respuesta axios cruda
// con `responseType: 'blob'` (mismo patrón que sales.js#generatePDF) porque
// el componente necesita el blob completo, no un JSON.
import api from './axios';

// ── Empleados — /api/payroll/employees ──────────────────────────────
export const employeesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/payroll/employees', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/payroll/employees/${id}`);
    return response.data;
  },
  create: async (employeeData) => {
    const response = await api.post('/payroll/employees', employeeData);
    return response.data;
  },
  update: async (id, employeeData) => {
    const response = await api.put(`/payroll/employees/${id}`, employeeData);
    return response.data;
  },
  deactivate: async (id) => {
    const response = await api.patch(`/payroll/employees/${id}/deactivate`);
    return response.data;
  },
  activate: async (id) => {
    const response = await api.patch(`/payroll/employees/${id}/activate`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/payroll/employees/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/payroll/employees/stats');
    return response.data;
  },
  // Mejora #5: contratos a término fijo por vencer (o ya vencidos) dentro
  // de `days` días (default 30 en el backend). Solo lectura.
  getExpiringContracts: async (days) => {
    const response = await api.get('/payroll/employees/contracts/expiring', { params: { days } });
    return response.data;
  },
};

// ── Conceptos de nómina — /api/payroll/concepts ─────────────────────
// Nota: a diferencia de empleados/periodos/documentos, getAll aquí NO pagina
// (el controller retorna `findAll`, sin `pagination` en la respuesta) — es
// un catálogo, se espera una lista corta.
export const payrollConceptsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/payroll/concepts', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/payroll/concepts/${id}`);
    return response.data;
  },
  create: async (conceptData) => {
    const response = await api.post('/payroll/concepts', conceptData);
    return response.data;
  },
  update: async (id, conceptData) => {
    const response = await api.put(`/payroll/concepts/${id}`, conceptData);
    return response.data;
  },
  deactivate: async (id) => {
    const response = await api.patch(`/payroll/concepts/${id}/deactivate`);
    return response.data;
  },
  activate: async (id) => {
    const response = await api.patch(`/payroll/concepts/${id}/activate`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/payroll/concepts/${id}`);
    return response.data;
  },
};

// ── Periodos de nómina — /api/payroll/periods ───────────────────────
export const payrollPeriodsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/payroll/periods', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/payroll/periods/${id}`);
    return response.data;
  },
  create: async (periodData) => {
    const response = await api.post('/payroll/periods', periodData);
    return response.data;
  },
  update: async (id, periodData) => {
    const response = await api.put(`/payroll/periods/${id}`, periodData);
    return response.data;
  },
  // Sugiere fechas para un periodo nuevo (basado en el último periodo de
  // esa sede+tipo, o en la quincena/mes en curso si no hay ninguno) — solo
  // una sugerencia editable, no crea nada.
  suggestNext: async ({ branch_id, period_type } = {}) => {
    const response = await api.get('/payroll/periods/suggest-next', { params: { branch_id, period_type } });
    return response.data;
  },
  // Vuelve a calcular liquidation_preview de un periodo ya 'liquidado' —
  // para cuando el usuario agrega/borra novedades después de liquidar.
  recalculatePreview: async (id) => {
    const response = await api.post(`/payroll/periods/${id}/recalculate-preview`);
    return response.data;
  },
  // Copia las novedades de un periodo anterior (autodetectado por sede+
  // periodicidad si no se pasa source_period_id) — ver copyNovedadesFromPreviousPeriod.
  copyNovedades: async (id, source_period_id) => {
    const response = await api.post(`/payroll/periods/${id}/copy-novedades`, { source_period_id });
    return response.data;
  },
  // Avanza el periodo UNA posición en abierto -> liquidado -> emitido ->
  // cerrado (ver PERIOD_STATUS_ORDER en constants/payroll.js). Al pasar a
  // 'liquidado' el backend calcula (sin tocar la DIAN) y devuelve
  // `data.preview` con el detalle por empleado. Cuando status='emitido', el
  // backend liquida+emite todos los empleados activos y puede responder 200
  // (todos aceptados) o 207 (aceptados parcialmente, el periodo NO avanza y
  // queda en 'liquidado'). Como 207 sigue siendo un 2xx, axios NO lanza
  // error en ese caso: el store debe leer `response.success` para
  // distinguirlo de un 200 real, no solo el catch.
  changeStatus: async (id, status) => {
    const response = await api.patch(`/payroll/periods/${id}/status`, { status });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/payroll/periods/${id}`);
    return response.data;
  },
};

// ── Novedades — /api/payroll/novedades ──────────────────────────────
// Siempre se consultan/crean en el contexto de un periodo abierto/liquidado
// (ver validaciones en payrollNovedades.controller.js).
export const payrollNovedadesAPI = {
  // payroll_period_id es obligatorio; employee_id es opcional (filtra por
  // empleado dentro del periodo).
  getAll: async ({ payroll_period_id, employee_id } = {}) => {
    const response = await api.get('/payroll/novedades', {
      params: { payroll_period_id, employee_id },
    });
    return response.data;
  },
  // Body: { employee_id, payroll_period_id, payroll_concept_id?,
  //         dian_category?, payload?, unpaid_days?, notes? }
  // Debe traer dian_category (ver NOVEDAD_CATEGORIES en constants/payroll.js)
  // o unpaid_days > 0 — el backend rechaza si no viene ninguno de los dos.
  create: async (novedadData) => {
    const response = await api.post('/payroll/novedades', novedadData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/payroll/novedades/${id}`);
    return response.data;
  },
};

// ── Documentos de nómina — /api/payroll/documents ───────────────────
// Solo lectura + Nota de Ajuste. La emisión del NominaIndividual normal
// vive en payrollPeriodsAPI.changeStatus('emitido'), no aquí.
export const payrollDocumentsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/payroll/documents', { params });
    return response.data;
  },
  // Incluye `resumen` (resumenLiquidacionParaImpresion) y `adjustments`
  // (histórico de Notas de Ajuste ya asociadas a este documento).
  getById: async (id) => {
    const response = await api.get(`/payroll/documents/${id}`);
    return response.data;
  },
  // Devuelve la respuesta axios cruda (responseType: blob) — el documento
  // aún no tiene XML si no ha sido emitido (400 del backend en ese caso).
  downloadXml: (id) => api.get(`/payroll/documents/${id}/xml`, { responseType: 'blob' }),
  // Ídem — 400 si el documento no tiene liquidación generada todavía.
  downloadPdf: (id) => api.get(`/payroll/documents/${id}/pdf`, { responseType: 'blob' }),
  // Crea la Nota de Ajuste (Reemplazar/Eliminar). Requiere que el
  // PayrollDocument esté 'accepted' con CUNE — si no, el backend responde
  // 400. Responde 201 de inmediato con la fila en 'pending'; el envío real
  // a la DIAN es fire-and-forget — hay que refrescar vía getById para ver
  // el estado final (pending -> sending -> accepted/rejected).
  createAdjustment: async (payrollDocumentId, { adjustment_type, reason }) => {
    const response = await api.post(`/payroll/documents/${payrollDocumentId}/adjustments`, {
      adjustment_type,
      reason,
    });
    return response.data;
  },
};

// ── Certificados de Ingresos y Retenciones — /api/payroll/certificates ──
// Mejora #6: solo lectura, agrega PayrollDocument ya aceptados por la DIAN
// por año fiscal. No crea ni modifica nada.
export const payrollCertificatesAPI = {
  // Empleados con al menos un documento aceptado en `year` (default: año
  // calendario anterior, calculado en el backend) + total neto pagado.
  getAvailable: async (year) => {
    const response = await api.get('/payroll/certificates', { params: { year } });
    return response.data;
  },
  // Resumen agregado (JSON) de un empleado para un año — usado antes de
  // descargar el PDF. 404 si el empleado no tiene documentos aceptados ese año.
  getSummary: async (employeeId, year) => {
    const response = await api.get(`/payroll/certificates/${employeeId}`, { params: { year } });
    return response.data;
  },
  // Devuelve la respuesta axios cruda (responseType: blob) — mismo patrón
  // que payrollDocumentsAPI.downloadPdf.
  downloadPdf: (employeeId, year) => api.get(`/payroll/certificates/${employeeId}/pdf`, { params: { year }, responseType: 'blob' }),
};

// ── Liquidación definitiva / finiquito — /api/payroll/termination ──
// Mejora #7: cálculo de cesantías/intereses/prima/vacaciones pendientes al
// retirar un empleado, + emisión del Documento Soporte de Nómina de esa
// liquidación a la DIAN. Ver payrollTerminationService.js.
export const payrollTerminationAPI = {
  // Empleados con termination_date registrada — candidatos a liquidar —
  // con already_settled indicando si ya se emitió con éxito antes.
  getPending: async () => {
    const response = await api.get('/payroll/termination/pending');
    return response.data;
  },
  // Cálculo completo SIN persistir nada — para revisar antes de emitir.
  preview: async (employeeId, { indemnizacion, bonifRetiro } = {}) => {
    const response = await api.get(`/payroll/termination/${employeeId}/preview`, {
      params: { indemnizacion, bonifRetiro },
    });
    return response.data;
  },
  // Emite el documento a la DIAN. Puede responder 207 (DIAN rechazó, no es
  // un error de red) — el caller debe leer response.data igual que en
  // payrollPeriodsAPI.changeStatus.
  emit: async (employeeId, { indemnizacion, bonifRetiro } = {}) => {
    const response = await api.post(`/payroll/termination/${employeeId}/emit`, {
      indemnizacion, bonifRetiro,
    });
    return response.data;
  },
};

// ── Dashboard de costos de nómina — /api/payroll/dashboard ──────────
// Mejora #8: solo lectura, agrega PayrollDocument/PayrollNovedad ya
// aceptados por la DIAN. No crea ni modifica nada.
export const payrollDashboardAPI = {
  // params opcionales: { desde, hasta } (YYYY-MM-DD) — por defecto,
  // últimos 12 meses (calculado en el backend) — y { branch_id } para
  // aislar una sola sede.
  get: async (params = {}) => {
    const response = await api.get('/payroll/dashboard', { params });
    return response.data;
  },
};

// ── Configuración de nómina (porcentajes de recargo) ────────────────
// GET es de lectura libre; PUT requiere admin/super_admin (el backend lo
// valida, esto es solo el cliente HTTP).
export const payrollSettingsAPI = {
  get: async () => {
    const response = await api.get('/payroll/settings');
    return response.data;
  },
  update: async (percentages) => {
    const response = await api.put('/payroll/settings', percentages);
    return response.data;
  },
};

// ── Default export (compatibilidad con el estilo de dian.js) ───────
const payrollAPI = {
  employees: employeesAPI,
  concepts: payrollConceptsAPI,
  periods: payrollPeriodsAPI,
  novedades: payrollNovedadesAPI,
  documents: payrollDocumentsAPI,
  certificates: payrollCertificatesAPI,
  termination: payrollTerminationAPI,
  dashboard: payrollDashboardAPI,
  settings: payrollSettingsAPI,
};

export default payrollAPI;