// src/api/announcements.js
import axios from './axios';

/**
 * Obtener anuncios pendientes para el usuario actual
 */
export const getPendingAnnouncements = async () => {
  const response = await axios.get('/announcements/pending');
  return response.data;
};

/**
 * Marcar un anuncio como visto
 */
export const markAnnouncementAsViewed = async (announcementId) => {
  const response = await axios.post(`/announcements/${announcementId}/view`);
  return response.data;
};

/**
 * Descartar un anuncio
 */
export const dismissAnnouncement = async (announcementId) => {
  const response = await axios.post(`/announcements/${announcementId}/dismiss`);
  return response.data;
};

// ==========================================
// API PARA SUPERADMIN
// ==========================================

/**
 * Obtener todos los anuncios (superadmin)
 */
export const getAllAnnouncements = async (params = {}) => {
  const response = await axios.get('/announcements', { params });
  return response.data;
};

/**
 * Crear un nuevo anuncio (superadmin)
 */
export const createAnnouncement = async (data) => {
  const response = await axios.post('/announcements', data);
  return response.data;
};

/**
 * Actualizar un anuncio (superadmin)
 */
export const updateAnnouncement = async (id, data) => {
  const response = await axios.put(`/announcements/${id}`, data);
  return response.data;
};

/**
 * Eliminar un anuncio (superadmin)
 */
export const deleteAnnouncement = async (id) => {
  const response = await axios.delete(`/announcements/${id}`);
  return response.data;
};

/**
 * Obtener estadísticas de un anuncio (superadmin)
 */
export const getAnnouncementStats = async (id) => {
  const response = await axios.get(`/announcements/${id}/stats`);
  return response.data;
};