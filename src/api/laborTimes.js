// frontend/src/api/laborTimes.js — tempario y productividad de técnicos
// (backend: routes/workshop/laborTimes.routes.js).
import api from './axios';

const BASE = '/workshop/labor-times';

const download = async (path, filename) => {
  const res = await api.get(`${BASE}${path}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const laborTimesAPI = {
  getSettings: () => api.get(`${BASE}/settings`),
  saveSettings: (data) => api.put(`${BASE}/settings`, data),
  listServices: (params) => api.get(`${BASE}/services`, { params }),
  updateService: (id, data) => api.put(`${BASE}/services/${id}`, data),
  downloadTemplate: () => download('/import/template', 'Plantilla_Tempario_Pitbox.xlsx'),
  exportServices: () => download('/export', 'Tempario.xlsx'),
  importServices: (file, { dryRun, updateExisting }) => {
    const form = new FormData();
    form.append('archivo', file);
    return api.post(`${BASE}/import`, form, {
      params: { dry_run: dryRun ? 'true' : 'false', update_existing: updateExisting ? 'true' : 'false' },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
    });
  },
  listSchedules: () => api.get(`${BASE}/schedules`),
  saveSchedule: (userId, data) => api.put(`${BASE}/schedules/${userId}`, data),
  listAbsences: (params) => api.get(`${BASE}/absences`, { params }),
  createAbsence: (data) => api.post(`${BASE}/absences`, data),
  deleteAbsence: (id) => api.delete(`${BASE}/absences/${id}`),
  productivity: (params) => api.get(`${BASE}/productivity`, { params }),
  productivityDetail: (userId, params) => api.get(`${BASE}/productivity/${userId}`, { params }),
};

export const WEEKDAYS = [
  [1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom'],
];

export const ABSENCE_REASONS = {
  vacaciones: 'Vacaciones', incapacidad: 'Incapacidad', permiso: 'Permiso', licencia: 'Licencia', otro: 'Otro',
};
