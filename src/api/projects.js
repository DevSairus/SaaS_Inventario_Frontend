import axios from './axios';

/**
 * API del módulo Proyectos (obras): ciclo de vida, bodega de la obra,
 * presupuesto, lista de materiales (BOM) y estado de resultados.
 */

// status: uno o varios separados por coma; active=true excluye cerrados/cancelados
export const getProjects = async (params = {}) => {
  const response = await axios.get('/projects', { params });
  return response.data;
};

// Proyectos abiertos para los selectores de compras, gastos y ventas
export const getProjectOptions = async (search) => {
  const response = await axios.get('/projects/options', { params: search ? { search } : {} });
  return response.data;
};

export const getProject = async (id) => {
  const response = await axios.get(`/projects/${id}`);
  return response.data;
};

export const createProject = async (data) => {
  const response = await axios.post('/projects', data);
  return response.data;
};

export const updateProject = async (id, data) => {
  const response = await axios.put(`/projects/${id}`, data);
  return response.data;
};

export const changeProjectStatus = async (id, status) => {
  const response = await axios.patch(`/projects/${id}/status`, { status });
  return response.data;
};

export const createProjectWarehouse = async (id) => {
  const response = await axios.post(`/projects/${id}/warehouse`);
  return response.data;
};

export const getProjectPnl = async (id, params = {}) => {
  const response = await axios.get(`/projects/${id}/pnl`, { params });
  return response.data;
};

export const getProjectDocuments = async (id) => {
  const response = await axios.get(`/projects/${id}/documents`);
  return response.data;
};

// ── Presupuesto ──
export const addBudgetLine = async (id, data) => {
  const response = await axios.post(`/projects/${id}/budget`, data);
  return response.data;
};

export const updateBudgetLine = async (id, lineId, data) => {
  const response = await axios.put(`/projects/${id}/budget/${lineId}`, data);
  return response.data;
};

export const deleteBudgetLine = async (id, lineId) => {
  const response = await axios.delete(`/projects/${id}/budget/${lineId}`);
  return response.data;
};

// ── Lista de materiales (BOM) ──
export const getProjectBom = async (id) => {
  const response = await axios.get(`/projects/${id}/bom`);
  return response.data;
};

// text: filas copiadas desde Excel (con tabuladores)
export const previewProjectBom = async (id, text) => {
  const response = await axios.post(`/projects/${id}/bom/preview`, { text });
  return response.data;
};

// { rows, mode: 'replace' | 'append', update_budget }
export const saveProjectBom = async (id, data) => {
  const response = await axios.post(`/projects/${id}/bom`, data);
  return response.data;
};

export const updateBomItem = async (id, itemId, data) => {
  const response = await axios.patch(`/projects/${id}/bom/items/${itemId}`, data);
  return response.data;
};

export const deleteBomItem = async (id, itemId) => {
  const response = await axios.delete(`/projects/${id}/bom/items/${itemId}`);
  return response.data;
};

export const reserveProjectBom = async (id, item_ids) => {
  const response = await axios.post(`/projects/${id}/bom/reserve`, item_ids ? { item_ids } : {});
  return response.data;
};

export const releaseProjectBom = async (id, item_ids) => {
  const response = await axios.post(`/projects/${id}/bom/release`, item_ids ? { item_ids } : {});
  return response.data;
};

// { item_ids?, supplier_overrides?: { [item_id]: supplier_id } }
export const orderProjectShortages = async (id, data = {}) => {
  const response = await axios.post(`/projects/${id}/bom/order-lists`, data);
  return response.data;
};

// { from_warehouse_id, items?: [{ item_id, quantity }], notes? }
export const dispatchProjectBom = async (id, data) => {
  const response = await axios.post(`/projects/${id}/bom/dispatch`, data);
  return response.data;
};

// ── Sobrante en la obra ──
export const getProjectSiteStock = async (id) => {
  const response = await axios.get(`/projects/${id}/site-stock`);
  return response.data;
};

// { to_warehouse_id, items?: [{ product_id, quantity }], receive_now?, notes? }
export const returnProjectSurplus = async (id, data) => {
  const response = await axios.post(`/projects/${id}/return`, data);
  return response.data;
};

// ── Mano de obra ──
export const getProjectTimeEntries = async (id) => (await axios.get(`/projects/${id}/time-entries`)).data;
// { employee_id, work_date, hours, notes }
export const addProjectTimeEntry = async (id, data) => (await axios.post(`/projects/${id}/time-entries`, data)).data;
export const deleteProjectTimeEntry = async (id, entryId) => (await axios.delete(`/projects/${id}/time-entries/${entryId}`)).data;
export const getLaborEmployees = async () => (await axios.get('/projects/labor/employees')).data;
// ── Horarios de obra (Fase 4, req. 1.1) ──
export const getWorkShifts = async (params) => (await axios.get('/projects/labor/shifts', { params })).data;
export const createWorkShift = async (data) => (await axios.post('/projects/labor/shifts', data)).data;
export const updateWorkShift = async (shiftId, data) => (await axios.put(`/projects/labor/shifts/${shiftId}`, data)).data;
// { from, to, project_id?, employee_id? }
export const getHoursDistribution = async (params) => (await axios.get('/projects/labor/distribution', { params })).data;
// { work_date, rows: [{ employee_id, start_time, end_time, break_minutes, shift_id?, notes? }] }
export const saveProjectTimeSheet = async (id, data) => (await axios.post(`/projects/${id}/time-sheet`, data)).data;
export const getLaborPeriods = async () => (await axios.get('/projects/labor/periods')).data;
export const allocateLaborPeriod = async (periodId) => (await axios.post(`/projects/labor/periods/${periodId}/allocate`)).data;

// ── Cortes de obra y facturación parcial ──
export const getProjectBilling = async (id) => (await axios.get(`/projects/${id}/billing`)).data;
export const previewProjectCut = async (id, data) => (await axios.post(`/projects/${id}/cuts/preview`, data)).data;
export const createProjectCut = async (id, data) => (await axios.post(`/projects/${id}/cuts`, data)).data;
export const updateProjectCut = async (id, cutId, data) => (await axios.put(`/projects/${id}/cuts/${cutId}`, data)).data;
export const deleteProjectCut = async (id, cutId) => (await axios.delete(`/projects/${id}/cuts/${cutId}`)).data;
export const approveProjectCut = async (id, cutId, data) => (await axios.post(`/projects/${id}/cuts/${cutId}/approve`, data)).data;
export const getCutInvoicePayload = async (id, cutId) => (await axios.get(`/projects/${id}/cuts/${cutId}/invoice-payload`)).data;
export const linkCutDraft = async (id, cutId, saleId) => (await axios.post(`/projects/${id}/cuts/${cutId}/link-draft`, { sale_id: saleId })).data;
export const finalizeCutInvoice = async (id, cutId) => (await axios.post(`/projects/${id}/cuts/${cutId}/finalize`)).data;
export const releaseProjectRetention = async (id) => (await axios.post(`/projects/${id}/retention/release`)).data;
export const closeProjectContract = async (id, reason) => (await axios.post(`/projects/${id}/contract/close`, { reason })).data;
export const openCutActa = async (id, cutId) => {
  const res = await axios.get(`/projects/${id}/cuts/${cutId}/acta`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ── Etapas de obra y actas de despacho ──
export const getProjectStages = async (id) => (await axios.get(`/projects/${id}/stages`)).data;
// { name, description?, planned_date?, items?: [{ item_id, qty_planned }] }
export const createProjectStage = async (id, data) => (await axios.post(`/projects/${id}/stages`, data)).data;
// { name?, description?, planned_date?, status?: 'open'|'closed', items? }  (items reemplaza todas las líneas)
export const updateProjectStage = async (id, stageId, data) => (await axios.put(`/projects/${id}/stages/${stageId}`, data)).data;
export const deleteProjectStage = async (id, stageId) => (await axios.delete(`/projects/${id}/stages/${stageId}`)).data;
export const getProjectDispatches = async (id) => (await axios.get(`/projects/${id}/dispatches`)).data;
// { role: 'almacen'|'transportador'|'encargado_obra', name, document?, signature }
export const signProjectDispatch = async (id, dispatchId, data) => (await axios.post(`/projects/${id}/dispatches/${dispatchId}/sign`, data)).data;
export const openDispatchActa = async (id, dispatchId) => {
  const res = await axios.get(`/projects/${id}/dispatches/${dispatchId}/acta`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ── Mantenimientos recurrentes (Fase 4, req. 1.3) ──
// Instalación = sistema de un cliente que se mantiene (de un proyecto o anterior a Pitbox).
export const getMaintenanceInstallations = async (params) => (await axios.get('/projects/maintenance/installations', { params })).data;
// { customer_id, name, system_type?, capacity?, site_address?, city?, installed_at?, notes?, plan?: {...} }
export const createMaintenanceInstallation = async (data) => (await axios.post('/projects/maintenance/installations', data)).data;
export const updateMaintenanceInstallation = async (installationId, data) => (await axios.put(`/projects/maintenance/installations/${installationId}`, data)).data;
export const getMaintenanceInstallation = async (installationId) => (await axios.get(`/projects/maintenance/installations/${installationId}`)).data;
// { rows: [...], dry_run: true|false }
export const importMaintenanceInstallations = async (data) => (await axios.post('/projects/maintenance/installations/import', data)).data;
export const createMaintenanceEquipment = async (installationId, data) => (await axios.post(`/projects/maintenance/installations/${installationId}/equipment`, data)).data;
export const updateMaintenanceEquipment = async (installationId, equipmentId, data) => (await axios.put(`/projects/maintenance/installations/${installationId}/equipment/${equipmentId}`, data)).data;
// { name, equipment_id?, frequency_months, tasks: [texto], start_date, alert_days_before, assigned_user_id?, notes? }
export const createMaintenancePlan = async (installationId, data) => (await axios.post(`/projects/maintenance/installations/${installationId}/plans`, data)).data;
// { ...campos, status?: 'active'|'paused'|'ended', next_date? }
export const updateMaintenancePlan = async (planId, data) => (await axios.put(`/projects/maintenance/plans/${planId}`, data)).data;
// Proyecto de Pitbox: su instalación (o null) y activarla
export const getProjectMaintenance = async (id) => (await axios.get(`/projects/${id}/maintenance`)).data;
export const activateProjectMaintenance = async (id) => (await axios.post(`/projects/${id}/maintenance`)).data;
// { status?, from?, to?, installation_id?, technician_user_id?, alert?: 'overdue'|'due_soon' }
export const getMaintenanceAgenda = async (params) => (await axios.get('/projects/maintenance/agenda', { params })).data;
export const rescheduleMaintenanceVisit = async (visitId, data) => (await axios.put(`/projects/maintenance/visits/${visitId}`, data)).data;
// { done_date?, checklist: [{ done, note }], observations?, client_name?, client_document?, client_signature? }
export const completeMaintenanceVisit = async (visitId, data) => (await axios.post(`/projects/maintenance/visits/${visitId}/complete`, data)).data;
export const cancelMaintenanceVisit = async (visitId, data) => (await axios.post(`/projects/maintenance/visits/${visitId}/cancel`, data)).data;
export const openMaintenanceVisitPdf = async (visitId) => {
  const res = await axios.get(`/projects/maintenance/visits/${visitId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
