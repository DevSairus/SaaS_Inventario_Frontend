// src/store/blogStore.js
import { create } from 'zustand';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  publishPost,
  unpublishPost,
  uploadCover,
} from '../api/blog';

const useBlogStore = create((set, get) => ({
  posts: [],
  currentPost: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,
  error: null,

  fetchPosts: async (params = {}) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getPosts(params);

      if (data.success) {
        set({ posts: data.posts, pagination: data.pagination });
      }

      set({ isLoading: false });
      return data.success;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      return false;
    }
  },

  fetchPost: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getPost(id);

      if (data.success) {
        set({ currentPost: data.post });
      }

      set({ isLoading: false });
      return data.success ? data.post : null;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      return null;
    }
  },

  createPost: async (postData) => {
    try {
      set({ isLoading: true, error: null });
      const data = await createPost(postData);

      if (data.success) {
        await get().fetchPosts();
      }

      set({ isLoading: false });
      return data.success ? data.post : null;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      return null;
    }
  },

  updatePost: async (id, postData) => {
    try {
      set({ isLoading: true, error: null });
      const data = await updatePost(id, postData);

      if (data.success) {
        await get().fetchPosts();
      }

      set({ isLoading: false });
      return data.success ? data.post : null;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      return null;
    }
  },

  deletePost: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const data = await deletePost(id);

      if (data.success) {
        await get().fetchPosts();
      }

      set({ isLoading: false });
      return data.success;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      return false;
    }
  },

  publishPost: async (id, scheduledAt = null) => {
    try {
      set({ isLoading: true, error: null });
      const data = await publishPost(id, scheduledAt);

      if (data.success) {
        await get().fetchPosts();
      } else if (data.missing) {
        set({ error: data.message });
      }

      set({ isLoading: false });
      return data;
    } catch (error) {
      const data = error.response?.data;
      set({ error: data?.message || error.message, isLoading: false });
      return data || { success: false, message: error.message };
    }
  },

  unpublishPost: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const data = await unpublishPost(id);

      if (data.success) {
        await get().fetchPosts();
      }

      set({ isLoading: false });
      return data.success;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      return false;
    }
  },

  uploadCover: async (id, file) => {
    try {
      set({ isLoading: true, error: null });
      const data = await uploadCover(id, file);
      set({ isLoading: false });
      return data.success ? data.cover_image_url : null;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      return null;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    posts: [],
    currentPost: null,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    isLoading: false,
    error: null,
  }),
}));

export default useBlogStore;
