// frontend/src/api/accounting.js
import api from './axios';

export const chartOfAccountsAPI = {
  getAll: async () => (await api.get('/accounting/chart-of-accounts')).data,
  create: async (payload) => (await api.post('/accounting/chart-of-accounts', payload)).data,
  update: async (id, payload) => (await api.put(`/accounting/chart-of-accounts/${id}`, payload)).data,
  delete: async (id) => (await api.delete(`/accounting/chart-of-accounts/${id}`)).data,
};

export const journalEntriesAPI = {
  getAll: async (params = {}) => (await api.get('/accounting/journal-entries', { params })).data,
  getById: async (id) => (await api.get(`/accounting/journal-entries/${id}`)).data,
  create: async (payload) => (await api.post('/accounting/journal-entries', payload)).data,
  post: async (id) => (await api.patch(`/accounting/journal-entries/${id}/post`)).data,
  void: async (id, reason) => (await api.patch(`/accounting/journal-entries/${id}/void`, { reason })).data,
  reverse: async (id, reason) => (await api.patch(`/accounting/journal-entries/${id}/reverse`, { reason })).data,
};

export const accountMappingsAPI = {
  getAll: async () => (await api.get('/accounting/account-mappings')).data,
  create: async (payload) => (await api.post('/accounting/account-mappings', payload)).data,
  upsert: async (eventType, accountId) =>
    (await api.put(`/accounting/account-mappings/${eventType}`, { account_id: accountId })).data,
  remove: async (eventType) => (await api.delete(`/accounting/account-mappings/${eventType}`)).data,
  auditHistory: async (eventType) => (await api.get(`/accounting/account-mappings/${eventType}/audit`)).data,
};

export const accountingHealthAPI = {
  summary: async (params = {}) => (await api.get('/accounting/health', { params })).data,
  generateEntry: async (sourceType, sourceId) =>
    (await api.post(`/accounting/health/missing-entries/${sourceType}/${sourceId}/generate`)).data,
  generateAllEntries: async (items) =>
    (await api.post('/accounting/health/missing-entries/generate-all', { items })).data,
};

export const fiscalPeriodsAPI = {
  getAll: async (params = {}) => (await api.get('/accounting/fiscal-periods', { params })).data,
  close: async (id) => (await api.patch(`/accounting/fiscal-periods/${id}/close`)).data,
  reopen: async (id, reason) => (await api.patch(`/accounting/fiscal-periods/${id}/reopen`, { reason })).data,
};

export const financialReportsAPI = {
  trialBalance: async (params) => (await api.get('/accounting/reports/trial-balance', { params })).data,
  balanceGeneral: async (params) => (await api.get('/accounting/reports/balance-general', { params })).data,
  incomeStatement: async (params) => (await api.get('/accounting/reports/income-statement', { params })).data,
  libroDiario: async (params) => (await api.get('/accounting/reports/libro-diario', { params })).data,
  libroMayor: async (accountId, params) => (await api.get(`/accounting/reports/libro-mayor/${accountId}`, { params })).data,
  libroAuxiliar: async (params) => (await api.get('/accounting/reports/libro-auxiliar', { params })).data,
  libroIva: async (params) => (await api.get('/accounting/reports/libro-iva', { params })).data,
  aging: async (params) => (await api.get('/accounting/reports/aging', { params })).data,
  trialBalanceComparativo: async (params) => (await api.get('/accounting/reports/trial-balance-comparativo', { params })).data,
  retenciones: async (params) => (await api.get('/accounting/reports/retenciones', { params })).data,
  cashflowIndirecto: async (params) => (await api.get('/accounting/reports/cashflow-indirecto', { params })).data,

  // Exportación Excel/PDF — mismos filtros que su endpoint JSON equivalente.
  exportTrialBalance: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/trial-balance/export', { params: { ...params, format }, responseType: 'blob' }),
  exportBalanceGeneral: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/balance-general/export', { params: { ...params, format }, responseType: 'blob' }),
  exportIncomeStatement: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/income-statement/export', { params: { ...params, format }, responseType: 'blob' }),
  exportLibroDiario: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/libro-diario/export', { params: { ...params, format }, responseType: 'blob' }),
  exportLibroMayor: (accountId, params = {}, format = 'excel') =>
    api.get(`/accounting/reports/libro-mayor/${accountId}/export`, { params: { ...params, format }, responseType: 'blob' }),
  exportLibroAuxiliar: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/libro-auxiliar/export', { params: { ...params, format }, responseType: 'blob' }),
  exportLibroIva: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/libro-iva/export', { params: { ...params, format }, responseType: 'blob' }),
  exportAging: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/aging/export', { params: { ...params, format }, responseType: 'blob' }),
  exportTrialBalanceComparativo: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/trial-balance-comparativo/export', { params: { ...params, format }, responseType: 'blob' }),
  exportRetenciones: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/retenciones/export', { params: { ...params, format }, responseType: 'blob' }),
  exportCashflowIndirecto: (params = {}, format = 'excel') =>
    api.get('/accounting/reports/cashflow-indirecto/export', { params: { ...params, format }, responseType: 'blob' }),
};

export const ACCOUNT_TYPE_LABELS = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  costo: 'Costo',
};

export const SOURCE_TYPE_LABELS = {
  sale: 'Venta',
  purchase: 'Compra',
  expense: 'Gasto',
  cash_session: 'Cierre de Caja',
  manual: 'Manual',
  adjustment: 'Ajuste',
};
