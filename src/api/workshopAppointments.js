// frontend/src/api/workshopAppointments.js
import axios from './axios';

// ── Staff (autenticado, sede activa vía header x-branch-id) ────────────────
export const appointmentsApi = {
  getConfig: () => axios.get('/workshop/appointments/config'),
  updateConfig: (data) => axios.put('/workshop/appointments/config', data),

  list: (params) => axios.get('/workshop/appointments', { params }),
  getPending: () => axios.get('/workshop/appointments/pending'),
  markPendingSeen: () => axios.post('/workshop/appointments/pending/seen'),
  create: (data) => axios.post('/workshop/appointments', data),

  // Disponibilidad para el staff: ignora la ventana de reserva pública (ver
  // buildDaySlots en el backend). Con appointmentId, no cuenta esa cita.
  getAvailability: (date, appointmentId) =>
    axios.get('/workshop/appointments/availability', { params: { date, appointment_id: appointmentId } }),
  reschedule: (id, scheduled_at) => axios.patch(`/workshop/appointments/${id}/reschedule`, { scheduled_at }),

  confirm: (id) => axios.patch(`/workshop/appointments/${id}/confirm`),
  cancel: (id, reason) => axios.patch(`/workshop/appointments/${id}/cancel`, { reason }),
  sendWhatsApp: (id, type) => axios.post(`/workshop/appointments/${id}/send-whatsapp`, { type }),
  convertToWorkOrder: (id, data) => axios.post(`/workshop/appointments/${id}/convert-to-work-order`, data),
};

// ── Público (sin sesión) — usadas por PublicAppointmentPage.jsx ────────────
export const publicAppointmentsApi = {
  getBranches: (slug) => axios.get(`/public/workshop/${slug}/branches`),
  getConfig: (slug, branchId) => axios.get(`/public/workshop/${slug}/${branchId}/config`),
  getAvailability: (slug, branchId, date) => axios.get(`/public/workshop/${slug}/${branchId}/availability`, { params: { date } }),
  create: (slug, branchId, data) => axios.post(`/public/workshop/${slug}/${branchId}/appointments`, data),
  getStatus: (token) => axios.get(`/public/workshop/appointments/${token}`),
};