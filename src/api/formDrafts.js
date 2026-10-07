import axios from './axios';

/**
 * Borradores de formularios del usuario (copia en el servidor para seguir
 * desde otro equipo) -- ver hooks/useFormDraft.js.
 */
export const formDraftsAPI = {
  get: async (scope) => {
    const res = await axios.get('/form-drafts', { params: { scope } });
    return res.data?.data || null;
  },
  save: async (payload) => {
    const res = await axios.put('/form-drafts', payload);
    return res.data?.data || null;
  },
  remove: async (scope) => {
    await axios.delete('/form-drafts', { params: { scope } });
  },
};
