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
  update: async (id, payload) => (await api.put(`/accounting/journal-entries/${id}`, payload)).data,
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

export const fixedAssetsAPI = {
  getAll: async (params = {}) => (await api.get('/accounting/fixed-assets', { params })).data,
  getById: async (id) => (await api.get(`/accounting/fixed-assets/${id}`)).data,
  getReport: async (params = {}) => (await api.get('/accounting/fixed-assets/report', { params })).data,
  create: async (payload) => (await api.post('/accounting/fixed-assets', payload)).data,
  update: async (id, payload) => (await api.put(`/accounting/fixed-assets/${id}`, payload)).data,
  dispose: async (id, payload) => (await api.post(`/accounting/fixed-assets/${id}/dispose`, payload)).data,
  runDepreciation: async (period) => (await api.post('/accounting/fixed-assets/run-depreciation', period ? { period } : {})).data,
};

export const FIXED_ASSET_CATEGORY_LABELS = {
  vehiculo: 'Vehículo',
  maquinaria: 'Maquinaria',
  equipo_computo: 'Equipo de Cómputo',
  muebles_enseres: 'Muebles y Enseres',
  otro: 'Otro',
};

export const loansAPI = {
  getAll: async (params = {}) => (await api.get('/accounting/loans', { params })).data,
  getById: async (id) => (await api.get(`/accounting/loans/${id}`)).data,
  getReport: async () => (await api.get('/accounting/loans/report')).data,
  create: async (payload) => (await api.post('/accounting/loans', payload)).data,
  payInstallment: async (loanId, installmentId, payload) => (await api.post(`/accounting/loans/${loanId}/installments/${installmentId}/pay`, payload)).data,
};

export const LOAN_TYPE_LABELS = {
  bancario: 'Bancario',
  tercero: 'Con Tercero',
};

// Conciliación Bancaria (Fase 3 del plan de Contabilidad Pitbox).
export const bankAccountsAPI = {
  getAll: async (params = {}) => (await api.get('/accounting/bank-accounts', { params })).data,
  getById: async (id) => (await api.get(`/accounting/bank-accounts/${id}`)).data,
  create: async (payload) => (await api.post('/accounting/bank-accounts', payload)).data,
  update: async (id, payload) => (await api.put(`/accounting/bank-accounts/${id}`, payload)).data,

  // Import: multipart/form-data. `columnMapping`/`amountFormat` solo hacen
  // falta la primera vez que se ve el layout de un banco (si ya hay
  // plantilla guardada para la firma detectada, se aplica sola).
  previewImport: async (bankAccountId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post(`/accounting/bank-accounts/${bankAccountId}/import/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
  runImport: async (bankAccountId, file, { columnMapping, dateFormat, amountFormat } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (columnMapping) formData.append('column_mapping', JSON.stringify(columnMapping));
    if (dateFormat) formData.append('date_format', dateFormat);
    if (amountFormat) formData.append('amount_format', JSON.stringify(amountFormat));
    return (await api.post(`/accounting/bank-accounts/${bankAccountId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },

  getReconciliation: async (bankAccountId, params = {}) =>
    (await api.get(`/accounting/bank-accounts/${bankAccountId}/reconciliation`, { params })).data,
  runAutoMatch: async (bankAccountId, toleranceDays) =>
    (await api.post(`/accounting/bank-accounts/${bankAccountId}/reconciliation/run-auto-match`, toleranceDays ? { tolerance_days: toleranceDays } : {})).data,
  matchManually: async (bankAccountId, txId, journalEntryLineId) =>
    (await api.post(`/accounting/bank-accounts/${bankAccountId}/reconciliation/${txId}/match`, { journal_entry_line_id: journalEntryLineId })).data,
  unmatch: async (bankAccountId, txId) =>
    (await api.post(`/accounting/bank-accounts/${bankAccountId}/reconciliation/${txId}/unmatch`)).data,
  ignore: async (bankAccountId, txId) =>
    (await api.post(`/accounting/bank-accounts/${bankAccountId}/reconciliation/${txId}/ignore`)).data,
};

export const RECONCILIATION_STATUS_LABELS = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
  conciliada: { label: 'Conciliada', className: 'bg-green-100 text-green-800' },
  ignorada: { label: 'Ignorada', className: 'bg-gray-200 text-gray-700' },
};

// Información Exógena DIAN (Fase 4 del plan de Contabilidad Pitbox).
export const exogenaAPI = {
  getFormats: async () => (await api.get('/accounting/exogena/formats')).data,
  toggleFormat: async (code, isEnabled) => (await api.put(`/accounting/exogena/formats/${code}`, { is_enabled: isEnabled })).data,
  getConcepts: async (code, year) => (await api.get(`/accounting/exogena/formats/${code}/concepts`, { params: { year } })).data,
  saveConcepts: async (code, mappings) => (await api.put(`/accounting/exogena/formats/${code}/concepts`, { mappings })).data,
  getReadiness: async (code, year) => (await api.get(`/accounting/exogena/formats/${code}/readiness`, { params: { year } })).data,
  generate: async (code, year) => api.get(`/accounting/exogena/formats/${code}/generate`, { params: { year }, responseType: 'blob' }),

  getManualRecords: async (formatCode, year) =>
    (await api.get('/accounting/exogena/manual-records', { params: { format_code: formatCode, year } })).data,
  createManualRecord: async (payload) => (await api.post('/accounting/exogena/manual-records', payload)).data,
  updateManualRecord: async (id, payload) => (await api.put(`/accounting/exogena/manual-records/${id}`, payload)).data,
  deleteManualRecord: async (id) => (await api.delete(`/accounting/exogena/manual-records/${id}`)).data,

  getShareholders: async (year) => (await api.get('/accounting/exogena/shareholders', { params: { year } })).data,
  createShareholder: async (payload) => (await api.post('/accounting/exogena/shareholders', payload)).data,
  updateShareholder: async (id, payload) => (await api.put(`/accounting/exogena/shareholders/${id}`, payload)).data,
  deleteShareholder: async (id) => (await api.delete(`/accounting/exogena/shareholders/${id}`)).data,
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

export const openingBalancesAPI = {
  list: async (params = {}) => (await api.get('/accounting/opening-balances', { params })).data,
  createReceivable: async (payload) => (await api.post('/accounting/opening-balances/receivable', payload)).data,
  createPayable: async (payload) => (await api.post('/accounting/opening-balances/payable', payload)).data,
  createAccount: async (payload) => (await api.post('/accounting/opening-balances/account', payload)).data,
  createInventory: async (payload) => (await api.post('/accounting/opening-balances/inventory', payload)).data,
  getBridgeStatus: async () => (await api.get('/accounting/opening-balances/bridge-status')).data,
  closeBridge: async (payload) => (await api.post('/accounting/opening-balances/bridge-status/close', payload)).data,
  voidOpeningBalance: async (id, reason) => (await api.post(`/accounting/opening-balances/${id}/void`, { reason })).data,
  registerPayment: async (id, payload) => (await api.post(`/accounting/opening-balances/${id}/payments`, payload)).data,
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
