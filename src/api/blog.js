// src/api/blog.js
import axios from './axios';

// ==========================================
// API PÚBLICA (sin auth)
// ==========================================

export const getPublicPosts = async (params = {}) => {
  const response = await axios.get('/public/blog', { params });
  return response.data;
};

export const getPublicPostBySlug = async (slug) => {
  const response = await axios.get(`/public/blog/${slug}`);
  return response.data;
};

// ==========================================
// API PARA SUPERADMIN
// ==========================================

export const getPosts = async (params = {}) => {
  const response = await axios.get('/superadmin/blog', { params });
  return response.data;
};

export const getPost = async (id) => {
  const response = await axios.get(`/superadmin/blog/${id}`);
  return response.data;
};

export const createPost = async (data) => {
  const response = await axios.post('/superadmin/blog', data);
  return response.data;
};

export const updatePost = async (id, data) => {
  const response = await axios.put(`/superadmin/blog/${id}`, data);
  return response.data;
};

export const deletePost = async (id) => {
  const response = await axios.delete(`/superadmin/blog/${id}`);
  return response.data;
};

export const publishPost = async (id, scheduled_at = null) => {
  const response = await axios.post(`/superadmin/blog/${id}/publish`, { scheduled_at });
  return response.data;
};

export const unpublishPost = async (id) => {
  const response = await axios.post(`/superadmin/blog/${id}/unpublish`);
  return response.data;
};

export const uploadCover = async (id, file) => {
  const formData = new FormData();
  formData.append('cover', file);
  const response = await axios.post(`/superadmin/blog/${id}/cover`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
