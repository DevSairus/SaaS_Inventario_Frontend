// frontend/src/api/workshopBoard.js
// Pantalla de taller (mapa de ocupación por bahía). Ver
// backend/src/controllers/workshop/workshopBoard.controller.js.
import api from './axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const workshopBoardApi = {
  getBoard: (branchId) => api.get('/workshop/board', { params: { branch_id: branchId } }),

  listBays: (branchId) => api.get('/workshop/board/bays', { params: { branch_id: branchId } }),
  createBay: (data) => api.post('/workshop/board/bays', data),
  updateBay: (id, data) => api.put(`/workshop/board/bays/${id}`, data),
  deleteBay: (id) => api.delete(`/workshop/board/bays/${id}`),

  getDisplay: (branchId) => api.get('/workshop/board/display', { params: { branch_id: branchId } }),
  regenerateDisplay: (branchId) => api.post('/workshop/board/display', { branch_id: branchId }),
  revokeDisplay: (branchId) => api.delete('/workshop/board/display', { params: { branch_id: branchId } }),

  setOrderBay: (orderId, bayId) => api.patch(`/workshop/work-orders/${orderId}/bay`, { bay_id: bayId || null }),

  // TV sin login: fetch directo, sin los interceptores de sesión de axios.
  getPublicBoard: async (token) => {
    const res = await fetch(`${API_URL}/public/workshop-display/${encodeURIComponent(token)}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.message || 'No se pudo cargar la pantalla');
      err.status = res.status;
      throw err;
    }
    return json.data;
  },
};

export const BAY_KINDS = [
  { value: 'bahia', label: 'Bahía' },
  { value: 'elevador', label: 'Elevador' },
  { value: 'alineacion', label: 'Alineación' },
  { value: 'lavado', label: 'Lavado' },
  { value: 'otro', label: 'Otro' },
];

export const bayKindLabel = (kind) => BAY_KINDS.find((k) => k.value === kind)?.label || 'Bahía';
